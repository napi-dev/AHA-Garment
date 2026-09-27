import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/nav/app-shell";
import { todayEth, ethMonthName, formatAsEthDate } from "@/lib/ethiopian-calendar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, nameAm, employeeCode } = session.user;

  // Retrieve unresolved alerts count
  const openAlertsCount = await db.alert.count({
    where: { resolvedAt: null },
  });

  const eth = todayEth();
  const ethDateDisplay = `${eth.day} ${ethMonthName(eth.month)} ${eth.year} ዓ.ም (${formatAsEthDate(new Date())})`;

  return (
    <AppShell
      role={role}
      nameAm={nameAm}
      employeeCode={employeeCode}
      ethDateDisplay={ethDateDisplay}
      openAlertsCount={openAlertsCount}
    >
      {children}
    </AppShell>
  );
}
