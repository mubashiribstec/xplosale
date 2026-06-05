import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 62 }}>{children}</div>
      <Footer />
    </>
  );
}
