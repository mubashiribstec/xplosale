import { redirect } from "next/navigation";

export default function MeNetworkRedirect() {
  redirect("/profile/edit");
}
