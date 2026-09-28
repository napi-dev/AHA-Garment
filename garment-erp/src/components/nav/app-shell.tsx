"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { Sidebar } from "./sidebar";
import { AppHeader } from "./app-header";
import { OfflineIndicator } from "@/components/ui/offline-indicator";

interface AppShellProps {
  role: Role;
  nameAm: string;
  employeeCode: string;
  ethDateDisplay: string;
  openAlertsCount: number;
  isOverridden: boolean;
  ethYear: number;
  ethMonth: number;
  ethDay: number;
  canEditDate: boolean;
  children: React.ReactNode;
}

export function AppShell({
  role,
  nameAm,
  employeeCode,
  ethDateDisplay,
  openAlertsCount,
  isOverridden,
  ethYear,
  ethMonth,
  ethDay,
  canEditDate,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar (Desktop sticky + Mobile drawer) */}
      <Sidebar
        role={role}
        nameAm={nameAm}
        employeeCode={employeeCode}
        openAlertsCount={openAlertsCount}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          role={role}
          nameAm={nameAm}
          employeeCode={employeeCode}
          ethDateDisplay={ethDateDisplay}
          openAlertsCount={openAlertsCount}
          isOverridden={isOverridden}
          ethYear={ethYear}
          ethMonth={ethMonth}
          ethDay={ethDay}
          canEditDate={canEditDate}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {children}
        </main>
      </div>

      <OfflineIndicator />
    </div>
  );
}
