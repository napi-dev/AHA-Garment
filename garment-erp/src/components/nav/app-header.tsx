"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { am } from "@/lib/i18n/am";
import {
  Menu, Bell, User, LogOut,
  ShieldCheck, Sparkles
} from "lucide-react";
import { DateOverrideBadge } from "./date-override-badge";

interface AppHeaderProps {
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
  onToggleMobileMenu: () => void;
}

export function AppHeader({
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
  onToggleMobileMenu,
}: AppHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & breadcrumb/app title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-ethiopic">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              የፋብሪካው ሥርዓት ንቁ ነው
            </span>
          </div>
        </div>

        {/* Center/Right: Ethiopian Date, Alerts, and User Profile */}
        <div className="flex items-center gap-3">
          {/* Ethiopian Date Badge — editable for ADMIN/SUPER_MANAGER */}
          <DateOverrideBadge
            ethDateDisplay={ethDateDisplay}
            isOverridden={isOverridden}
            ethYear={ethYear}
            ethMonth={ethMonth}
            ethDay={ethDay}
            canEdit={canEditDate}
          />

          {/* Quick Alert Indicator */}
          <Link
            href="/alerts"
            className={`relative p-2 rounded-xl transition-all ${
              openAlertsCount > 0
                ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
            title={openAlertsCount > 0 ? `${openAlertsCount} ክፍት ማስጠንቀቂያዎች` : "ምንም ክፍት ማስጠንቀቂያ የለም"}
          >
            <Bell size={18} />
            {openAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
                {openAlertsCount}
              </span>
            )}
          </Link>

          {/* User profile dropdown button */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 font-ethiopic leading-tight">{nameAm}</p>
                <p className="text-[11px] text-slate-500">{employeeCode}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {nameAm.slice(0, 1)}
              </div>
            </button>

            {/* Dropdown menu */}
            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-3 shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-slate-100">
                    <p className="font-semibold text-slate-800 text-sm font-ethiopic">{nameAm}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{employeeCode}</p>
                    <span className="inline-block mt-2 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 px-2.5 py-0.5 rounded-full font-ethiopic">
                      {am.roles[role]}
                    </span>
                  </div>

                  <div className="py-2">
                    <div className="px-2 py-1.5 text-xs text-slate-500 flex items-center gap-2 font-ethiopic">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>የተሰጠዎት ሚና፦ {am.roles[role]}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-rose-600 rounded-xl hover:bg-rose-50 transition-colors font-ethiopic"
                    >
                      <LogOut size={14} />
                      <span>{am.nav.logout}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
