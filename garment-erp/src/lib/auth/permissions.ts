/**
 * AHA Garment - Permission System
 * 
 * Two-part permission system:
 * 1. Page Access Map - which roles can access which pages
 * 2. canControl() - which roles can control which departments
 * 
 * ⚠️ SECURITY: Every server action MUST check permissions.
 * Hiding a menu item is NOT security.
 */

import type { Role } from "@prisma/client";

// ═══════════════════════════════════════════════════════════
// Page Access Matrix
// ═══════════════════════════════════════════════════════════

type PageAccess = "full" | "view" | "own" | "mini" | "none";

interface PagePermission {
  ADMIN: PageAccess;
  PRODUCTION_MANAGER: PageAccess;
  ORDER_PLACER: PageAccess;
  LINE_SUPERVISOR: PageAccess;
  CUTTING_MANAGER: PageAccess;
  QC_INSPECTOR: PageAccess;
  STORE_KEEPER: PageAccess;
}

/**
 * Page access matrix
 * - full: complete access
 * - view: read-only
 * - own: only own data (e.g. supervisor sees own line)
 * - mini: simplified dashboard
 * - none: no access
 */
const PAGE_ACCESS: Record<string, PagePermission> = {
  "/dashboard": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "mini",
    LINE_SUPERVISOR: "mini",
    CUTTING_MANAGER: "mini",
    QC_INSPECTOR: "mini",
    STORE_KEEPER: "mini",
  },
  
  "/attendance": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "own", // own line only
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/counts/enter": {
    ADMIN: "full", // all departments
    PRODUCTION_MANAGER: "full", // all departments
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "own", // ስፌት + ቅንጨባ only
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/counts/close": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/flow": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "own", // own departments
    CUTTING_MANAGER: "own",
    QC_INSPECTOR: "own",
    STORE_KEEPER: "own",
  },
  
  "/cutting": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "full",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/production": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/production/orders": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "full",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/shop/receive": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "none", // view only on balance
    ORDER_PLACER: "full",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/shop/sale": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "none",
    ORDER_PLACER: "full",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/shop/return": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "none",
    ORDER_PLACER: "full",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/shop": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "view", // balance view only
    ORDER_PLACER: "full",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/quality": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "full",
    STORE_KEEPER: "none",
  },
  
  "/materials": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "full",
  },
  
  "/suppliers": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "full",
  },
  
  "/employees": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/incentive": {
    ADMIN: "full", // close + approve
    PRODUCTION_MANAGER: "own", // close only
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/salary": {
    ADMIN: "full", // edit
    PRODUCTION_MANAGER: "view", // view only
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/payroll": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "view",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/alerts": {
    ADMIN: "own",
    PRODUCTION_MANAGER: "own",
    ORDER_PLACER: "own",
    LINE_SUPERVISOR: "own",
    CUTTING_MANAGER: "own",
    QC_INSPECTOR: "own",
    STORE_KEEPER: "own",
  },
  
  "/reports": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/users": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "none",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/settings": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "full", // except salary bonus
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
  
  "/audit": {
    ADMIN: "full",
    PRODUCTION_MANAGER: "none",
    ORDER_PLACER: "none",
    LINE_SUPERVISOR: "none",
    CUTTING_MANAGER: "none",
    QC_INSPECTOR: "none",
    STORE_KEEPER: "none",
  },
};

const LEGACY_ACTION_TO_PATH: Record<string, string> = {
  "users:manage": "/users",
  "users:view": "/users",
  "settings:manage": "/settings",
  "settings:edit": "/settings",
  "reports:view": "/reports",
  "reports:manage": "/reports",
  "production:manage": "/production",
  "production:view": "/production",
  "attendance:manage": "/attendance",
  "counts:manage": "/counts/enter",
  "quality:manage": "/quality",
  "materials:manage": "/materials",
  "suppliers:manage": "/suppliers",
  "salary:manage": "/salary",
  "salary:view": "/salary",
  "audit:view": "/audit",
};

/**
 * Check if a role can access a page
 */
export function getPageAccess(role: Role, path: string): PageAccess | null {
  if (role === "ADMIN") return "full";
  const mappedPath = LEGACY_ACTION_TO_PATH[path] || path;
  const normalizedPath = mappedPath.split("?")[0].replace(/\/$/, "");
  
  // Check exact match first
  if (PAGE_ACCESS[normalizedPath]) {
    return PAGE_ACCESS[normalizedPath][role];
  }
  
  // Check parent paths
  const pathParts = normalizedPath.split("/").filter(Boolean);
  for (let i = pathParts.length; i > 0; i--) {
    const parentPath = "/" + pathParts.slice(0, i).join("/");
    if (PAGE_ACCESS[parentPath]) {
      return PAGE_ACCESS[parentPath][role];
    }
  }
  
  return null;
}

/**
 * Check if a user can access a page (async version returns result object)
 */
export async function requirePageAccess(
  role: Role,
  path: string,
  requiredLevel: PageAccess = "full"
): Promise<{ allowed: boolean; message?: string }> {
  const access = getPageAccess(role, path);
  
  if (access === "none" || access === null) {
    return { allowed: false, message: "የመዳረሻ ፍቃድ የለም - Access denied" };
  }
  
  // If specific level required, check it
  if (requiredLevel !== "mini" && requiredLevel !== "own" && access !== "full") {
    return { allowed: false, message: "የመዳረሻ ፍቃድ የለም - Insufficient permissions" };
  }
  
  return { allowed: true };
}

/**
 * Sync version that throws on permission denial
 */
export function requirePermission(role: Role, path: string): void {
  const access = getPageAccess(role, path);
  
  if (access === "none" || access === null) {
    throw new Error("የመዳረሻ ፍቃድ የለም - Access denied");
  }
}

// ═══════════════════════════════════════════════════════════
// Department Control
// ═══════════════════════════════════════════════════════════

/**
 * Check if a role can control a department
 */
export function canControl(role: Role, departmentControllers: Role[]): boolean {
  if (role === "ADMIN") return true;
  return departmentControllers.includes(role);
}

/**
 * Get all departments a role can control
 */
export async function getControllableDepartments(
  role: Role,
  db: any
): Promise<string[]> {
  if (role === "ADMIN") {
    const allDepts = await db.department.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return allDepts.map((d: any) => d.id);
  }
  
  const depts = await db.department.findMany({
    where: {
      isActive: true,
      controllers: { has: role },
    },
    select: { id: true },
  });
  
  return depts.map((d: any) => d.id);
}

// ═══════════════════════════════════════════════════════════
// Alert Visibility
// ═══════════════════════════════════════════════════════════

export function canSeeAlert(role: Role, alertType: string): boolean {
  const alertMatrix: Record<string, Role[]> = {
    LOW_STOCK: ["ADMIN", "PRODUCTION_MANAGER", "STORE_KEEPER"],
    WASTAGE: ["ADMIN", "PRODUCTION_MANAGER", "CUTTING_MANAGER"],
    CONSUMPTION: ["ADMIN", "PRODUCTION_MANAGER", "CUTTING_MANAGER"],
    ORDER_COUNTDOWN: ["ADMIN", "PRODUCTION_MANAGER", "ORDER_PLACER"],
    DELAYED_ORDER: ["ADMIN", "PRODUCTION_MANAGER", "ORDER_PLACER"],
    FLOW_VARIANCE: ["ADMIN", "PRODUCTION_MANAGER", "LINE_SUPERVISOR", "CUTTING_MANAGER", "QC_INSPECTOR", "STORE_KEEPER"],
    DAY_NOT_CLOSED: ["ADMIN", "PRODUCTION_MANAGER"],
    ATTENDANCE_MISSING: ["ADMIN", "PRODUCTION_MANAGER", "LINE_SUPERVISOR"],
    SHOP_SOLD_OUT: ["ADMIN", "PRODUCTION_MANAGER", "ORDER_PLACER"],
    UNUSUAL_COUNT: ["ADMIN", "PRODUCTION_MANAGER", "QC_INSPECTOR"],
    HR_CASE: ["ADMIN", "PRODUCTION_MANAGER"],
    REPORT_FAILED: ["ADMIN"],
  };
  
  const allowedRoles = alertMatrix[alertType];
  if (!allowedRoles) return false;
  
  return allowedRoles.includes(role);
}

// ═══════════════════════════════════════════════════════════
// Specific Permission Checks
// ═══════════════════════════════════════════════════════════

export function canApproveIncentive(role: Role): boolean {
  return role === "ADMIN";
}

export function canCloseIncentive(role: Role): boolean {
  return role === "ADMIN" || role === "PRODUCTION_MANAGER";
}

export function canEditSalary(role: Role): boolean {
  return role === "ADMIN";
}

export function canViewSalary(role: Role): boolean {
  return role === "ADMIN" || role === "PRODUCTION_MANAGER";
}

export function canEditBonus(role: Role): boolean {
  return role === "ADMIN";
}

export function canPurgeAudit(role: Role): boolean {
  return role === "ADMIN";
}

export function canResolveAlert(role: Role): boolean {
  return role === "ADMIN" || role === "PRODUCTION_MANAGER";
}

// ═══════════════════════════════════════════════════════════
// Helper: Permission Error
// ═══════════════════════════════════════════════════════════

export class PermissionError extends Error {
  constructor(message = "የመዳረሻ ፍቃድ የለም - Access denied") {
    super(message);
    this.name = "PermissionError";
  }
}
