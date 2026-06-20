import { FileCheck, ShieldCheck, BadgeCheck, Lock } from "lucide-react";
import { VerificationSeal } from "@/components/ui/XplosaleUI";
import Reveal from "@/components/marketing/Reveal";

const TILES = [
  {
    icon: FileCheck,
    title: "Manual document review",
    desc: "Every CNIC and passport is reviewed by a real person on our team — not an automated rubber stamp.",
  },
  {
    icon: ShieldCheck,
    title: "Escrow-protected payments",
    desc: "Funds are held securely until both sides confirm a transaction is complete.",
  },
  {
    icon: BadgeCheck,
    title: "Verified badges everywhere",
    desc: "Your trust badge follows you across listings, job applications, and connection requests.",
  },
  {
    icon: Lock,
    title: "Identity protection",
    desc: "Your documents are encrypted at rest and never shown publicly — only your verified status is.",
  },
];

export default function TrustSecurity() {
  return (
    <section
      style={{
        maxWidth: "var(--maxw)",
        margin: "0 auto",
        padding: "clamp(56px, 7vw, 96px) clamp(20px, 5vw, 80px)",
      }}
    >
      <Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 24, marginBottom: 40 }} className="x-grid-2col">
          <div>
            <p className="eyebrow" style={{ color: "var(--green)", marginBottom: 12 }}>
              Trust &amp; security
            </p>
            <h2
              style={{
                fontFamily: "var(--display)",
                fontWeight: 800,
                fontSize: "clamp(28px, 3.5vw, 44px)",
                letterSpacing: "-0.03em",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              Security isn&apos;t a feature here — it&apos;s the foundation.
            </h2>
          </div>
          <VerificationSeal size={88} />
        </div>
      </Reveal>

      <div className="x-grid-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {TILES.map(({ icon: Icon, title, desc }, i) => (
          <Reveal key={title} delay={i * 0.08}>
            <div
              style={{
                background: "var(--white)",
                border: "1px solid var(--line)",
                borderRadius: 18,
                padding: "24px 22px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "rgba(14,158,110,.10)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--green-deep)",
                }}
              >
                <Icon size={20} strokeWidth={1.8} />
              </div>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 17, margin: 0, color: "var(--ink)" }}>
                {title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)", margin: 0 }}>
                {desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
