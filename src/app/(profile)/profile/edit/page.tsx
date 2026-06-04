import { redirect } from "next/navigation";

// Profile editing is handled at /me/network until a dedicated edit page is built.
export default function ProfileEditRedirect() {
  redirect("/me/network");
}
