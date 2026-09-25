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
  Settings, LogOut, AlertTriangle, Truck, DollarSign,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: Parameters<typeof hasPermission>[1];
}

const NAV_ITEMS: NavItem[] = [
  { label: am.nav.dashboard,    href: "/dashboard",   icon: <LayoutDashboard size={18} /> },
  { label: am.nav.employees,    href: "/employees",   icon: <Users size={18} />,     permission: "employees:view" },
  { label: am.nav.attendance,   href: "/attendance",  icon: <Clock size={18} />,     permission: "attendance:view" },
  { label: am.nav.counts,       href: "/counts/enter", icon: <ClipboardList size={18} />, permission: "counts:enter" },
  { label: am.counts.closeDay,  href: "/counts/close", icon: <ClipboardList size={18} />, permission: "counts:verify" },
  { label: am.nav.cutting,      href: "/cutting",     icon: <Scissors size={18} />,  permission: "cuts:view" },
  { label: am.nav.production,   href: "/production",  icon: <Factory size={18} />,   permission: "bundles:view" },
  { label: "ባንድሎች",            href: "/production/bundles", icon: <Package size={18} />, permission: "bundles:view" },
  { label: am.nav.quality,      href: "/quality",     icon: <CheckSquare size={18} />, permission: "qc:view" },
  { label: am.nav.packing,      href: "/packing",     icon: <Package size={18} />,   permission: "finished_goods:view" },
  { label: am.nav.materials,    href: "/materials",   icon: <Package size={18} />,   permission: "stock:view" },
  { label: "አቅራቢዎች",           href: "/suppliers",   icon: <Package size={18} />,   permission: "stock:view" },
  { label: am.nav.incentive,    href: "/incentive",   icon: <TrendingUp size={18} />, permission: "incentive:view" },
  { label: am.nav.salary,       href: "/salary",      icon: <DollarSign size={18} />, permission: "salary:view" },
  { label: "ማስጠንቀቂያዎች",        href: "/alerts",      icon: <AlertTriangle size={18} />, permission: "reports:view" },
  { label: am.nav.reports,      href: "/reports",     icon: <FileText size={18} />,  permission: "reports:view" },
  { label: am.nav.users,        href: "/users",       icon: <Shield size={18} />,    permission: "users:manage" },
  { label: am.nav.settings,     href: "/settings",    icon: <Settings size={18} />,  permission: "settings:manage" },
  { label: am.nav.auditLog,     href: "/audit",       icon: <AlertTriangle size={18} />, permission: "audit:view" },
];

interface SidebarProps {
  role: Role;
  nameAm: string;
  employeeCode: string;
}

export function Sidebar({ role, nameAm, employeeCode }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  );

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            ፋ
          </div>
          <span className="font-semibold text-gray-900 text-sm font-ethiopic leading-tight">
            ልብስ ፋብሪካ
            <br />
            <span className="text-gray-400 font-normal text-xs">ሥርዓት</span>
          </span>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-gray-500">{employeeCode}</p>
        <p className="font-medium text-gray-800 text-sm font-ethiopic">{nameAm}</p>
        <span className="inline-block mt-0.5 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-ethiopic">
          {am.roles[role]}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors
                ${active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
            >
              <span className={active ? "text-blue-600" : "text-gray-400"}>
                {item.icon}
              </span>
              <span className="font-ethiopic">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm text-red-600
            hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          <span className="font-ethiopic">{am.nav.logout}</span>
        </button>
      </div>
    </aside>
  );
}
