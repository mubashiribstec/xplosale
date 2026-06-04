import { redirect } from "next/navigation";

// Public profiles moved to /profile/[handle].
export default async function NetworkHandleRedirect({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  redirect(`/profile/${handle}`);
}
