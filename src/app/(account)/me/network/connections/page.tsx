import { redirect } from "next/navigation";

export default function MeNetworkConnectionsRedirect() {
  redirect("/profile");
}
