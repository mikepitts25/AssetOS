import { requireSessionContext } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, organization } = await requireSessionContext();

  return (
    <AppShell profile={profile} organization={organization}>
      {children}
    </AppShell>
  );
}
