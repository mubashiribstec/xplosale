export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  ics?: string;
  replyTo?: string;
}

export interface EmailResult {
  status: "SENT" | "MOCKED" | "FAILED";
  provider: string;
  messageId?: string;
}

export interface EmailClient {
  send(input: EmailInput): Promise<EmailResult>;
}

class ResendEmailClient implements EmailClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(input: EmailInput): Promise<EmailResult> {
    try {
      const from = process.env.EMAIL_FROM ?? "noreply@xplosale.com";
      const body: Record<string, unknown> = {
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      };
      if (input.replyTo) body.reply_to = input.replyTo;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[EmailClient/Resend] send failed:", err);
        return { status: "FAILED", provider: "RESEND" };
      }

      const data = (await res.json()) as { id?: string };
      return { status: "SENT", provider: "RESEND", messageId: data.id };
    } catch (e) {
      console.error("[EmailClient/Resend] error:", e);
      return { status: "FAILED", provider: "RESEND" };
    }
  }
}

class ConsoleEmailClient implements EmailClient {
  async send(input: EmailInput): Promise<EmailResult> {
    console.log("[EmailClient/Console] mock send:", {
      to: input.to,
      subject: input.subject,
      html: input.html.slice(0, 100) + "…",
    });
    return { status: "MOCKED", provider: "CONSOLE" };
  }
}

let _emailClient: EmailClient | null = null;

export function getEmailClient(): EmailClient {
  if (_emailClient) return _emailClient;
  const resendKey = process.env.RESEND_API_KEY;
  _emailClient = resendKey ? new ResendEmailClient(resendKey) : new ConsoleEmailClient();
  return _emailClient;
}
