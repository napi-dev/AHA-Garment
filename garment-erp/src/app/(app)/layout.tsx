import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/nav/app-shell";
import { ethMonthName, formatEthDate } from "@/lib/ethiopian-calendar";
import { getEffectiveFull } from "@/lib/date-override/effective-date";

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

  // Get the effective Ethiopian date (override if set, otherwise auto-computed)
  const { eth, isOverridden } = await getEffectiveFull();

  const ethDateDisplay = `${eth.day} ${ethMonthName(eth.month)} ${eth.year} ዓ.ም (${formatEthDate(eth)})`;

  const canEditDate = role === "ADMIN" || role === "SUPER_MANAGER";

  return (
    <AppShell
      role={role}
      nameAm={nameAm}
      employeeCode={employeeCode}
      ethDateDisplay={ethDateDisplay}
      openAlertsCount={openAlertsCount}
      isOverridden={isOverridden}
      ethYear={eth.year}
      ethMonth={eth.month}
      ethDay={eth.day}
      canEditDate={canEditDate}
    >
      {children}
    </AppShell>
  );
}
