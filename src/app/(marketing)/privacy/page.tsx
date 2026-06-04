import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy — Xplosale" };

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-16 text-gray-800">
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-8 inline-block">
        ← Back to home
      </Link>
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: June 2026</p>

      <section className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold mb-2">1. Who we are</h2>
          <p>
            Xplosale (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the platform
            at xplosale.com — a verified marketplace and jobs board connecting buyers, sellers, and
            employers.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Information we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Account data:</strong> name, phone number, email address, and profile
              information you provide.
            </li>
            <li>
              <strong>Identity verification documents:</strong> CNIC or passport images uploaded for
              verification purposes — stored encrypted and accessible only to authorised reviewers.
            </li>
            <li>
              <strong>Usage data:</strong> pages visited, search queries, listing interactions — only
              with your consent.
            </li>
            <li>
              <strong>Communications:</strong> messages sent via the platform&rsquo;s chat or support
              features.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. How we use your information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide, maintain, and improve the platform.</li>
            <li>To verify your identity and display your verified status to other users.</li>
            <li>To send account-related notifications (sign-in OTPs, listing alerts).</li>
            <li>To detect fraud, enforce our terms of service, and keep the platform safe.</li>
            <li>To analyse usage patterns and improve the user experience — only with your consent.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">4. Cookies</h2>
          <p>
            We use essential cookies to keep you signed in and remember your language preference.
            Optional analytics cookies are only set if you choose &ldquo;Accept all&rdquo; in our
            cookie banner. You can change your preferences at any time on our{" "}
            <Link href="/cookies" className="text-blue-600 hover:underline">
              Cookie preferences
            </Link>{" "}
            page.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">5. Data sharing</h2>
          <p>
            We do not sell your personal data. We share information only with: cloud infrastructure
            providers (hosting, storage), payment processors (for escrow transactions), and law
            enforcement when legally required.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">6. Data retention</h2>
          <p>
            Account data is retained for the lifetime of your account. Identity verification
            documents are deleted 30 days after your verification is finalised. You can request
            deletion of your account and associated data at any time by contacting support.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">7. Your rights</h2>
          <p>
            Depending on your jurisdiction you have the right to access, correct, or delete your
            personal data. To exercise these rights, contact us at{" "}
            <a href="mailto:privacy@xplosale.com" className="text-blue-600 hover:underline">
              privacy@xplosale.com
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">8. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. We will notify you of significant changes
            via email or an in-app notice.
          </p>
        </div>
      </section>
    </main>
  );
}
