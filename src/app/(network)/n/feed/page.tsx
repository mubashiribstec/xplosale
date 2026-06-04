import { redirect } from "next/navigation";

// Network feed removed — redirect to marketplace.
export default function NetworkFeedRedirect() {
  redirect("/m");
}
