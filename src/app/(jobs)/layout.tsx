import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
