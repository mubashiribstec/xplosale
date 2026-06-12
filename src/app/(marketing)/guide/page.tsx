import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "How to Use Xplosale — Buyer & Shopkeeper Guide",
  description:
    "Step-by-step guide to Xplosale: how to order from local shops, pay with cash, JazzCash or EasyPaisa, and how shopkeepers can list a shop, add products, and get orders online.",
  alternates: { canonical: "/guide" },
  openGraph: {
    title: "How to Use Xplosale — Buyer & Shopkeeper Guide",
    description: "Step-by-step guide for buyers and shopkeepers on Xplosale.",
    type: "website",
  },
};

interface Step {
  title: string;
  body: string;
}

const BUYER_STEPS: Step[] = [
  { title: "Browse shops near you", body: "Go to the Shops directory and filter by your city, area, or category — clothing, groceries, electronics, and more." },
  { title: "Open a shop page", body: "Check the ✓ Verified badge, customer reviews, working hours, and photos to know who you're buying from." },
  { title: "Pick a product", body: "Tap any product to see its photos, price, and stock. Press Buy, or message the shop on WhatsApp if you have questions." },
  { title: "Choose delivery & payment", body: "Select pickup or home delivery, then pay how you like: cash, bank transfer, JazzCash, or EasyPaisa — directly to the shop." },
  { title: "Upload your payment proof", body: "Paid by bank or mobile wallet? Upload the confirmation screenshot so the shop can verify and confirm your order." },
  { title: "Track your order", body: "Watch the status move from Confirmed → Preparing → Ready → Completed in My Orders. The shop can also reach you by phone." },
  { title: "Leave a review", body: "After your order completes, rate the shop. Honest reviews help the whole community shop with confidence." },
];

const SHOPKEEPER_STEPS: Step[] = [
  { title: "Create your free account", body: "Sign up with your phone or email. Listing a shop is free — no card needed." },
  { title: "Open your shop in 4 steps", body: "Go to Shops → Open a Shop. The wizard walks you through basics, location, and details. It takes about 3 minutes, and your progress saves automatically." },
  { title: "Upload your storefront photo", body: "A clear photo of your shop board builds instant trust — it's required before your shop can go live." },
  { title: "Add your products", body: "Add names, prices, photos, and stock for your best-selling items. You can start with 2 products free and upgrade any time for more." },
  { title: "Set how customers pay", body: "Turn on cash, bank transfer, JazzCash, or EasyPaisa — whatever you accept. Add delivery if you offer it." },
  { title: "Submit for review", body: "Hit Submit and our team activates most shops within 24 hours. You'll see the live link right away." },
  { title: "Print your QR poster & share", body: "Print the free QR poster for your counter and share your shop link in WhatsApp groups — that's how your regulars start ordering online." },
  { title: "Manage orders daily", body: "Confirm new orders, verify payment screenshots, and move orders through Preparing → Ready → Completed." },
  { title: "Grow with Premium", body: "When you're ready, upgrade for up to 30–50 products, the analytics dashboard, and featured placement in the directory." },
];

function StepList({ steps, accent }: { steps: Step[]; accent: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((step, i) => (
        <div
          key={step.title}
          style={{
            display: "flex", gap: 14, alignItems: "flex-start",
            background: "var(--white)", border: "1px solid var(--line)",
            borderRadius: 14, padding: "16px 18px",
          }}
        >
          <span style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            background: accent, color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800,
          }}>
            {i + 1}
          </span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "2px 0 4px" }}>
              {step.title}
            </p>
            <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
              {step.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GuidePage() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "calc(62px + clamp(28px,5vw,56px)) clamp(16px,4vw,32px) clamp(40px,6vw,72px)", fontFamily: "var(--body)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>

          <p className="eyebrow" style={{ color: "var(--clay)", margin: "0 0 10px" }}>Getting Started</p>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(28px,5vw,44px)", color: "var(--ink)", margin: "0 0 10px", lineHeight: 1.1 }}>
            How to use Xplosale
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-faint)", margin: "0 0 40px", lineHeight: 1.6 }}>
            Whether you&rsquo;re buying from local shops or putting your own shop online,
            here&rsquo;s everything step by step. Questions? Check the{" "}
            <Link href="/faq" style={{ color: "var(--clay)", fontWeight: 600 }}>FAQ</Link>.
          </p>

          {/* Buyer guide */}
          <section style={{ marginBottom: 44 }}>
            <h2 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 24, color: "var(--ink)", margin: "0 0 6px" }}>
              🛍 For buyers
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 16px" }}>
              Order from real shops in your neighbourhood — pay your way.
            </p>
            <StepList steps={BUYER_STEPS} accent="var(--blue)" />
            <Link
              href="/shops"
              style={{
                display: "inline-block", marginTop: 16, padding: "11px 24px",
                background: "var(--blue)", color: "#fff", borderRadius: 11,
                fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}
            >
              Browse shops →
            </Link>
          </section>

          {/* Shopkeeper guide */}
          <section style={{ marginBottom: 44 }}>
            <h2 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 24, color: "var(--ink)", margin: "0 0 6px" }}>
              🏪 For shopkeepers
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 16px" }}>
              Put your shop online for free and start taking orders.
            </p>
            <StepList steps={SHOPKEEPER_STEPS} accent="var(--clay)" />
            <Link
              href="/shops/manage/new"
              style={{
                display: "inline-block", marginTop: 16, padding: "11px 24px",
                background: "var(--clay)", color: "var(--white)", borderRadius: 11,
                fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}
            >
              Open your shop free →
            </Link>
          </section>

          {/* Cross links */}
          <div style={{
            background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 16,
            padding: "20px 24px", display: "flex", gap: "10px 28px", flexWrap: "wrap", justifyContent: "center",
          }}>
            <Link href="/m" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "none" }}>🛒 Marketplace</Link>
            <Link href="/jobs" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "none" }}>💼 Jobs</Link>
            <Link href="/faq" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "none" }}>❓ FAQ</Link>
            <Link href="/terms" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "none" }}>📄 Terms</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
