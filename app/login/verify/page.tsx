import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { VerifyLogin } from "@/components/verify-login";

export const metadata: Metadata = {
  title: "Open my rooms",
  robots: { index: false, follow: false },
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginVerifyPage({
  searchParams,
}: PageProps<"/login/verify">) {
  const token = firstQueryValue((await searchParams).token)?.trim();
  if (!token) redirect("/login?error=That%20link%20is%20not%20valid.");

  return (
    <PageShell kicker="Paid rooms" title="Open my rooms.">
      <VerifyLogin token={token} />
    </PageShell>
  );
}
