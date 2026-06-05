import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service — Xplosale" };

export default function TermsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,40px)", fontFamily: "var(--body)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 8 }}>
          Legal
        </p>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(28px,4vw,40px)", color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.15 }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 40 }}>
          Last updated: June 2026
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>1. Acceptance of Terms</h2>
            <p>By accessing or using Xplosale you agree to be bound by these Terms of Service and all applicable laws. If you do not agree, do not use the platform.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>2. Use of the Platform</h2>
            <p>You may use Xplosale only for lawful purposes. You must not post false, misleading, or fraudulent listings; harass other users; attempt to gain unauthorized access; or violate any applicable law.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>3. Accounts and Verification</h2>
            <p>You are responsible for maintaining the security of your account credentials. Identity verification is required for certain features. Providing false documents will result in permanent suspension.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>4. Listings and Transactions</h2>
            <p>Sellers are responsible for the accuracy of their listings. Xplosale provides escrow services as a convenience; we do not guarantee the condition or delivery of any goods. All sales are between the buyer and seller.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>5. Content</h2>
            <p>You retain ownership of content you post. By posting, you grant Xplosale a worldwide, royalty-free licence to display and distribute that content on the platform. You must not post content that infringes intellectual property rights or contains illegal material.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>6. Subscriptions and Payments</h2>
            <p>Premium plans are billed monthly. You may cancel at any time; access continues until the end of the current billing period. Refunds are issued at our discretion for billing errors.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>7. Limitation of Liability</h2>
            <p>Xplosale is provided &quot;as is&quot; without warranty of any kind. To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>8. Termination</h2>
            <p>We may suspend or terminate your account for violation of these terms or for conduct we reasonably believe is harmful to other users or the platform.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>9. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use after notice of changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>10. Contact</h2>
            <p>Questions about these terms? Contact us via the support chat or email <a href="mailto:support@xplosale.com" style={{ color: "var(--clay)", textDecoration: "none" }}>support@xplosale.com</a>.</p>
          </section>
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", gap: 20 }}>
          <Link href="/privacy" style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none" }}>Privacy Policy →</Link>
          <Link href="/cookies" style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none" }}>Cookie Preferences →</Link>
        </div>
      </div>
    </main>
  );
}
