import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { serializeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions | Xplosale",
  description:
    "Answers to common questions about buying from local shops, listing your shop, payments (cash, JazzCash, EasyPaisa), orders, jobs, and the marketplace on Xplosale.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ — Xplosale",
    description: "Answers to common questions about shops, orders, payments, jobs and the marketplace.",
    type: "website",
  },
};

interface Faq {
  section: string;
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  // ── For buyers ──
  {
    section: "For buyers",
    q: "What is Xplosale?",
    a: "Xplosale is Pakistan's platform for local shops, jobs, and a classifieds marketplace. You can discover shops in your city, order their products online, find verified jobs, and buy or sell second-hand goods — all in one place.",
  },
  {
    section: "For buyers",
    q: "How do I order from a local shop?",
    a: "Open any shop page, tap a product, and press Buy. Choose pickup or delivery, pick a payment method, and confirm. The shopkeeper receives your order instantly and updates its status as it's prepared.",
  },
  {
    section: "For buyers",
    q: "How can I pay?",
    a: "Each shop chooses its own payment methods: cash (on pickup or delivery), bank transfer, JazzCash, or EasyPaisa. The available options are shown at checkout. Payment goes directly to the shop — Xplosale does not handle your money.",
  },
  {
    section: "For buyers",
    q: "What is the payment screenshot for and is it safe?",
    a: "When you pay by bank transfer, JazzCash, or EasyPaisa, you upload a screenshot of the payment confirmation so the shopkeeper can verify it. The screenshot is visible only to the shop owner and Xplosale moderators, and is used solely as proof of payment.",
  },
  {
    section: "For buyers",
    q: "How do reviews work?",
    a: "You can review a shop after your order is completed — one review per shop per customer. This keeps ratings honest: every review comes from a real buyer.",
  },
  {
    section: "For buyers",
    q: "What if a shop doesn't deliver or something goes wrong?",
    a: "First contact the shop directly — every shop page has Call, WhatsApp, and Message buttons. If you can't resolve it, use the Report button on the shop page. Our moderation team investigates every report and can suspend shops that break the rules.",
  },

  // ── For shopkeepers ──
  {
    section: "For shopkeepers",
    q: "Is listing my shop free?",
    a: "Yes. Creating a shop, adding products, and receiving orders is completely free. The free plan includes 1 shop with 2 products. Paid plans add more products, analytics, and featured placement.",
  },
  {
    section: "For shopkeepers",
    q: "How do I add my shop?",
    a: "Sign up, go to Shops → Open a Shop, and follow the 4-step wizard: shop basics, location, details, and review. It takes about 3 minutes. Then upload a storefront photo, add products, set payment methods, and submit for review. See the full guide at /guide.",
  },
  {
    section: "For shopkeepers",
    q: "What does \"Submit for Review\" mean and how long does it take?",
    a: "Every new shop is checked by our team before going live, to keep the directory trustworthy. Most shops are reviewed and activated within 24 hours.",
  },
  {
    section: "For shopkeepers",
    q: "What's the difference between Free, Premium, and Promotion plans?",
    a: "Free: 1 shop, 2 products, 2 photos per product. Premium (PKR 1,500/month): up to 5 shops, 30 products, 5 photos per product, analytics dashboard, and featured placement. Promotion (PKR 2,500/month): everything in Premium plus 50 products, 8 photos per product, and top placement in the directory.",
  },
  {
    section: "For shopkeepers",
    q: "How do I get the Verified badge?",
    a: "Verified badges are granted by our team after confirming your shop details. Complete identity verification on your account and keep your shop information accurate to qualify.",
  },
  {
    section: "For shopkeepers",
    q: "How do orders work?",
    a: "When a customer orders, you get a notification. Confirm the order, mark it as Preparing, then Ready, and finally Completed when handed over or delivered. If a customer pays digitally, check their payment screenshot before confirming.",
  },
  {
    section: "For shopkeepers",
    q: "What is the QR poster?",
    a: "Every active shop gets a free printable poster with a QR code linking to its Xplosale page. Print it and place it at your counter — customers scan it to browse your products and order online. Find it under Manage Shop → QR Poster.",
  },

  // ── Marketplace & jobs ──
  {
    section: "Marketplace & jobs",
    q: "How is the marketplace different from shops?",
    a: "Shops are for local businesses with a storefront and catalogue. The marketplace is classifieds — anyone can list second-hand goods, vehicles, property, and more for sale. Browse it at /m.",
  },
  {
    section: "Marketplace & jobs",
    q: "Are job postings verified?",
    a: "Employers can verify their identity and companies on Xplosale, and verified employers get a badge. Always be cautious of any employer asking for money — report suspicious postings. Browse jobs at /jobs.",
  },

  // ── Account & safety ──
  {
    section: "Account & safety",
    q: "Why should I verify my identity?",
    a: "Identity verification (CNIC-based) earns you a trust badge across the platform, increases your visibility, and unlocks features like seller verification and partner programs. Your documents are stored securely and never shown publicly.",
  },
  {
    section: "Account & safety",
    q: "How do I report a shop, listing, or user?",
    a: "Every shop page, listing, and profile has a Report option. Choose the reason, add details, and our moderation team will review it — usually within a day.",
  },
  {
    section: "Account & safety",
    q: "How do I delete my account or data?",
    a: "Contact us through the support chat or the email listed in our Privacy Policy and we will remove your account and personal data, except records we are legally required to keep.",
  },
];

const SECTIONS = [...new Set(FAQS.map((f) => f.section))];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "calc(62px + clamp(28px,5vw,56px)) clamp(16px,4vw,32px) clamp(40px,6vw,72px)", fontFamily: "var(--body)" }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
        <div style={{ maxWidth: 760, margin: "0 auto" }}>

          <p className="eyebrow" style={{ color: "var(--clay)", margin: "0 0 10px" }}>Help Center</p>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(28px,5vw,44px)", color: "var(--ink)", margin: "0 0 10px", lineHeight: 1.1 }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-faint)", margin: "0 0 36px", lineHeight: 1.6 }}>
            Quick answers about shops, orders, payments, jobs, and your account.
            New here? Start with the <Link href="/guide" style={{ color: "var(--clay)", fontWeight: 600 }}>step-by-step guide</Link>.
          </p>

          {SECTIONS.map((section) => (
            <section key={section} style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 20, color: "var(--ink)", margin: "0 0 14px" }}>
                {section}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FAQS.filter((f) => f.section === section).map((f) => (
                  <details
                    key={f.q}
                    style={{
                      background: "var(--white)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      padding: "0 18px",
                    }}
                  >
                    <summary style={{
                      fontSize: 15, fontWeight: 600, color: "var(--ink)",
                      padding: "14px 0", cursor: "pointer", listStyle: "none",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    }}>
                      {f.q}
                      <span aria-hidden style={{ color: "var(--ink-faint)", flexShrink: 0 }}>＋</span>
                    </summary>
                    <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0, padding: "0 0 16px", lineHeight: 1.65 }}>
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <div style={{
            background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 16,
            padding: "20px 24px", textAlign: "center",
          }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: "0 0 6px" }}>
              Still have a question?
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
              Use the support chat in the corner of any page — we reply as fast as we can.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
