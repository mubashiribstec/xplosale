# Self-Hosted Email Server: SMTP + IMAP + Roundcube Webmail

## Context

The site has no paid email service (`RESEND_API_KEY` is empty, emails fall back to console mock). The user owns `xplosale.com` on Namecheap and hosts everything on one VPS. The goal is a fully self-hosted mail stack — send transactional email from `noreply@xplosale.com`, receive at `postmaster@xplosale.com`, and read webmail via Roundcube — all inside the existing Docker stack.

**Why not Mailcow?** Mailcow is excellent but ships its own nginx that binds to host ports 80/443, conflicting with the existing app nginx. The approach below — `docker-mailserver` + `roundcubemail` inside the existing `docker-compose.yml` — avoids all port conflicts by routing webmail through the existing nginx.

---

## Architecture

```
Internet inbound:  port 25  → docker-mailserver (Postfix receives mail for xplosale.com)
Internet inbound:  port 443 → nginx → mail.xplosale.com → roundcubemail (webmail UI)
Internet inbound:  port 993 → docker-mailserver (Dovecot IMAPS — Thunderbird/Outlook)
App container:     mailserver:587 → docker-mailserver (Postfix submits outbound mail)
Roundcube:         mailserver:143 + mailserver:587 (IMAP + SMTP internally)
```

---

## Phase 1 — docker-compose.yml: Add mailserver + roundcube services

**Edit:** `docker-compose.yml`

### Mailserver service (Postfix + Dovecot + DKIM + spam filtering)

```yaml
mailserver:
  image: ghcr.io/docker-mailserver/docker-mailserver:latest
  restart: unless-stopped
  hostname: mail.xplosale.com
  domainname: xplosale.com
  ports:
    - "25:25"       # SMTP inbound (receiving mail from internet)
    - "587:587"     # Submission (app + Roundcube send outbound mail here)
    - "993:993"     # IMAPS (Thunderbird, Outlook, mobile clients)
  volumes:
    - mail_data:/var/mail
    - mail_state:/var/mail-state
    - mail_logs:/var/log/mail
    - mail_config:/tmp/docker-mailserver
    - certbot_conf:/etc/letsencrypt:ro    # shares SSL cert with app nginx
  environment:
    ENABLE_RSPAMD: "1"            # spam filtering
    ENABLE_CLAMAV: "0"            # antivirus (enable only if VPS has ≥2 GB free RAM)
    ENABLE_FAIL2BAN: "1"
    ENABLE_DKIM: "1"
    SSL_TYPE: letsencrypt
    PERMIT_DOCKER: connected-networks   # allows Docker containers to relay without auth
    LOG_LEVEL: warn
  cap_add:
    - NET_ADMIN
    - SYS_PTRACE
  security_opt:
    - apparmor:unconfined
```

### Roundcube webmail service

```yaml
roundcube:
  image: roundcube/roundcubemail:latest
  restart: unless-stopped
  expose:
    - "80"                # internal only; nginx proxies to this
  environment:
    ROUNDCUBEMAIL_DEFAULT_HOST: ssl://mailserver
    ROUNDCUBEMAIL_DEFAULT_PORT: "993"
    ROUNDCUBEMAIL_SMTP_SERVER: tls://mailserver
    ROUNDCUBEMAIL_SMTP_PORT: "587"
    ROUNDCUBEMAIL_DB_TYPE: pgsql
    ROUNDCUBEMAIL_DB_HOST: postgres
    ROUNDCUBEMAIL_DB_PORT: "5432"
    ROUNDCUBEMAIL_DB_USER: xplosale
    ROUNDCUBEMAIL_DB_PASSWORD: xplosale2024
    ROUNDCUBEMAIL_DB_NAME: roundcube
    ROUNDCUBEMAIL_SKIN: elastic
  depends_on:
    mailserver:
      condition: service_started
    postgres:
      condition: service_healthy
```

### Add to volumes block

```yaml
volumes:
  mail_data:
  mail_state:
  mail_logs:
  mail_config:
  # (existing volumes unchanged)
```

---

## Phase 2 — nginx: Add mail.xplosale.com server block

**New file:** `nginx/mail.conf`

```nginx
server {
    listen 80;
    server_name mail.xplosale.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    server_name mail.xplosale.com;

    ssl_certificate     /etc/letsencrypt/live/mail.xplosale.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mail.xplosale.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass         http://roundcube:80;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

---

## Phase 3 — Email Adapter: Add SMTP client

**Edit:** `src/core/adapters/email.ts`

Add `SmtpEmailClient` using `nodemailer` (already in `package.json` v8.0.10):

```typescript
import nodemailer from "nodemailer";

class SmtpEmailClient implements EmailClient {
  private transporter: ReturnType<typeof nodemailer.createTransport>;

  constructor(host: string, port: number) {
    this.transporter = nodemailer.createTransport({ host, port, secure: false });
  }

  async send(input: EmailInput): Promise<EmailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM ?? "noreply@xplosale.com",
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      });
      return { status: "SENT", provider: "SMTP", messageId: info.messageId as string | undefined };
    } catch (e) {
      console.error("[EmailClient/SMTP] error:", e);
      return { status: "FAILED", provider: "SMTP" };
    }
  }
}
```

`getEmailClient()` priority:
1. `SMTP_HOST` set → `SmtpEmailClient`
2. `RESEND_API_KEY` set → `ResendEmailClient`
3. else → `ConsoleEmailClient`

---

## Phase 4 — Prisma: Add SMTP to EmailSendProvider enum

**Edit:** `prisma/schema.prisma`
```prisma
enum EmailSendProvider {
  RESEND
  CONSOLE
  SMTP
}
```

**New migration:** `prisma/migrations/20260607110000_email_smtp_provider/migration.sql`
```sql
ALTER TYPE "EmailSendProvider" ADD VALUE IF NOT EXISTS 'SMTP';
```

---

## Phase 5 — Env vars

**Edit:** `src/lib/env.ts`
```typescript
SMTP_HOST: z.string().optional(),
SMTP_PORT: z.coerce.number().int().positive().default(587),
```

**Edit:** `.env.example`
```
# ─── Email (self-hosted SMTP via docker-mailserver) ──────────────────────────
# SMTP_HOST=mailserver connects to the Docker mail container without credentials.
# Leave blank to fall back to RESEND_API_KEY (if set) or console mock.
SMTP_HOST=mailserver
SMTP_PORT=587
EMAIL_FROM="noreply@xplosale.com"
RESEND_API_KEY=
```

---

## Phase 6 — First-time mailserver setup (one-off on VPS)

```bash
# 1. Issue Let's Encrypt cert for mail.xplosale.com (before starting mailserver)
docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
  -d mail.xplosale.com --email postmaster@xplosale.com --agree-tos --no-eff-email

# 2. Start the mail stack
docker compose up -d mailserver roundcube

# 3. Create mailboxes
docker compose exec mailserver setup email add noreply@xplosale.com STRONG_PASSWORD
docker compose exec mailserver setup email add postmaster@xplosale.com STRONG_PASSWORD

# 4. Generate DKIM key
docker compose exec mailserver setup config dkim

# 5. View DKIM public key — copy the p= value for DNS
cat mail_config/opendkim/keys/xplosale.com/mail.txt
```

---

## Phase 7 — DNS Records (Namecheap — manual)

| Type | Host | Value |
|------|------|-------|
| A | `mail` | `[VPS_IP]` |
| MX | `@` | `mail.xplosale.com` (priority 10) |
| TXT | `@` | `v=spf1 ip4:[VPS_IP] ~all` |
| TXT | `mail._domainkey` | `v=DKIM1; k=rsa; p=[key from mail.txt]` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:postmaster@xplosale.com` |

> Long DKIM keys (>255 chars) must be split into two quoted strings in one TXT record — Namecheap handles this automatically if you paste the full key.

---

## Phase 8 — PTR Record (VPS provider — not Namecheap)

Set reverse DNS at your VPS provider's control panel: `[VPS_IP]` → `mail.xplosale.com`

Without this, Gmail and Outlook will reject or spam-filter your mail.

---

## ⚠️ VPS Port 25 Warning

Postfix delivers outbound mail over **port 25**. Many VPS providers block this:

- **DigitalOcean / Hetzner / Linode** — blocked; open a support ticket (free)
- **Contabo / Vultr** — usually open

Test: `nc -zv gmail-smtp-in.l.google.com 25`

If it times out, request port 25 unblocking from your VPS provider before expecting delivery.

---

## Verification

1. `docker compose up mailserver roundcube` — both start
2. Browse `https://mail.xplosale.com` → Roundcube login with `postmaster@xplosale.com`
3. Send a test email from the ATS panel → check delivery
4. Gmail "Show original" → `DKIM=pass`, `SPF=pass`
5. Score at https://mail-tester.com — aim for 8+/10
6. IMAP: configure Thunderbird with `mail.xplosale.com:993 (SSL)` → can read inbox
