import { redirect } from "next/navigation";

// Network people page removed — redirect to profile.
export default function NetworkPeopleRedirect() {
  redirect("/profile");
}
