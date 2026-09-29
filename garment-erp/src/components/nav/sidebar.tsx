"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { am } from "@/lib/i18n/am";
import { hasPermission } from "@/lib/auth/permissions";
import {
  LayoutDashboard, Users, Clock, ClipboardList, CheckSquare,
  Package, Scissors, Factory, Shield, TrendingUp, FileText,
  Settings, LogOut, AlertTriangle, Truck, DollarSign, X,
  Layers, Warehouse, Building2, ChevronRight
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: Parameters<typeof hasPermission>[1];
  badge?: string | number;
  badgeColor?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  role: Role;
  nameAm: string;
  employeeCode: string;
  openAlertsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  role,
  nameAm,
  employeeCode,
  openAlertsCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const NAV_GROUPS: NavGroup[] = [
    {
      title: "ዋና ክፍል (Overview)",
      items: [
        { label: am.nav.dashboard, href: "/dashboard", icon: <LayoutDashboard size={18} /> },
        { label: am.nav.attendance, href: "/attendance", icon: <Clock size={18} />, permission: "attendance:view" },
        { label: am.nav.counts, href: "/counts/enter", icon: <ClipboardList size={18} />, permission: "counts:enter" },
        { label: am.counts.closeDay, href: "/counts/close", icon: <CheckSquare size={18} />, permission: "counts:verify" },
      ],
    },
    {
      title: "የምርት ሂደት (Manufacturing)",
      items: [
        { label: am.nav.cutting, href: "/cutting", icon: <Scissors size={18} />, permission: "cuts:view" },
        { label: "የምርት ትዕዛዞች", href: "/production", icon: <Factory size={18} />, permission: "bundles:view" },
        { label: "ባንድሎች (Bundles)", href: "/production/bundles", icon: <Layers size={18} />, permission: "bundles:view" },
        { label: am.nav.quality, href: "/quality", icon: <CheckSquare size={18} />, permission: "qc:view" },
        { label: am.nav.packing, href: "/packing", icon: <Package size={18} />, permission: "finished_goods:view" },
      ],
    },
    {
      title: "ክምችትና አቅርቦት (Inventory)",
      items: [
        { label: am.nav.materials, href: "/materials", icon: <Warehouse size={18} />, permission: "stock:view" },
        { label: "አቅራቢ ድርጅቶች", href: "/suppliers", icon: <Building2 size={18} />, permission: "stock:view" },
      ],
    },
    {
      title: "ክፍያና የሰው ኃይል (HR & Payroll)",
      items: [
        { label: am.employees.title, href: "/employees", icon: <Users size={18} />, permission: "employees:view" },
        { label: am.nav.incentive, href: "/incentive", icon: <TrendingUp size={18} />, permission: "incentive:view" },
        { label: am.nav.salary, href: "/salary", icon: <DollarSign size={18} />, permission: "salary:view" },
      ],
    },
    {
      title: "አስተዳደርና ሪፖርቶች (Management)",
      items: [
        {
          label: "ማስጠንቀቂያዎች",
          href: "/alerts",
          icon: <AlertTriangle size={18} />,
          permission: "reports:view",
          badge: openAlertsCount > 0 ? openAlertsCount : undefined,
          badgeColor: "bg-rose-500 text-white",
        },
        { label: am.nav.reports, href: "/reports", icon: <FileText size={18} />, permission: "reports:view" },
        { label: am.nav.users, href: "/users", icon: <Shield size={18} />, permission: "users:manage" },
        { label: am.nav.settings, href: "/settings", icon: <Settings size={18} />, permission: "settings:manage" },
        { label: am.nav.auditLog, href: "/audit", icon: <ClipboardList size={18} />, permission: "audit:view" },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:flex-shrink-0 ${
          isOpenMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header / Brand */}
        <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onCloseMobile}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:shadow transition-all group-hover:scale-105">
              <span>🧵</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base font-ethiopic tracking-tight block leading-tight">
                ልብስ ፋብሪካ
              </span>
              <span className="text-slate-400 font-medium text-[11px] font-ethiopic block">
                የኢአርፒ አስተዳደር ሥርዓት
              </span>
            </div>
          </Link>

          {/* Close mobile button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card */}
        <div className="p-3 mx-3 my-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-blue-700 font-bold text-sm flex items-center justify-center shadow-xs">
            {nameAm.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 text-xs font-ethiopic truncate">{nameAm}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-500 font-mono font-medium">{employeeCode}</span>
              <span className="text-slate-300">·</span>
              <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-ethiopic">
                {am.roles[role]}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || hasPermission(role, item.permission)
            );

            if (!visibleItems.length) return null;

            return (
              <div key={group.title} className="space-y-1">
                <h3 className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-ethiopic">
                  {group.title}
                </h3>

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          active
                            ? "bg-gradient-to-r from-blue-50/90 to-indigo-50/60 text-blue-700 font-semibold border-l-4 border-blue-600 shadow-xs"
                            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`transition-colors ${
                              active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="font-ethiopic truncate text-[13px]">{item.label}</span>
                        </div>

                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                              item.badgeColor ?? "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer: Logout & Version */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50/80 transition-all font-ethiopic group"
          >
            <div className="flex items-center gap-2.5">
              <LogOut size={16} className="text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
              <span>{am.nav.logout}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">v1.0</span>
          </button>
        </div>
      </aside>
    </>
  );
}
