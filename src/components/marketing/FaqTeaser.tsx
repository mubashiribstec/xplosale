import Link from "next/link";
import { FAQS } from "@/app/(marketing)/faq/page";
import Reveal from "@/components/marketing/Reveal";

const TEASER_FAQS = FAQS.slice(0, 5);

export default function FaqTeaser() {
  return (
    <section
      style={{
        maxWidth: "var(--maxw)",
        margin: "0 auto",
        padding: "clamp(56px, 7vw, 96px) clamp(20px, 5vw, 80px)",
      }}
    >
      <Reveal>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p className="eyebrow" style={{ color: "var(--clay)", marginBottom: 12 }}>
            Questions
          </p>
          <h2
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: "clamp(28px, 3.5vw, 44px)",
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Frequently asked questions
          </h2>
        </div>
      </Reveal>

      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {TEASER_FAQS.map((f, i) => (
          <Reveal key={f.q} delay={i * 0.05}>
            <details
              style={{
                background: "var(--white)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "0 18px",
              }}
            >
              <summary
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink)",
                  padding: "14px 0",
                  cursor: "pointer",
                  listStyle: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                {f.q}
                <span aria-hidden style={{ color: "var(--ink-faint)", flexShrink: 0 }}>＋</span>
              </summary>
              <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0, padding: "0 0 16px", lineHeight: 1.65 }}>
                {f.a}
              </p>
            </details>
          </Reveal>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <Link
          href="/faq"
          style={{ fontSize: 15, fontWeight: 700, color: "var(--clay)", textDecoration: "none" }}
        >
          See all FAQs →
        </Link>
      </div>
    </section>
  );
}
