import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 62 }}>{children}</div>
    </>
  );
}
