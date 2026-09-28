/**
 * Server-side permission system.
 * Checks happen on the server for every request — not just by hiding buttons.
 *
 * Permission matrix from the master plan, chapter 4.
 */

import type { Role } from "@prisma/client";

// ─── Permission keys ────────────────────────────────────────────────────────

export type Permission =
  // System administration
  | "users:manage"          // create/edit users, roles, permissions
  | "settings:manage"       // alert rules, connections, backups
  | "audit:view"            // read audit log

  // People & pay
  | "employees:view"
  | "employees:edit"
  | "salary:view"           // fixed salary amounts — Super Manager + Admin only
  | "salary:edit"
  | "incentive_card:view"
  | "incentive_card:edit"   // set targets and rates

  // Production
  | "stock:view"
  | "stock:edit"
  | "cuts:view"
  | "cuts:edit"
  | "bundles:view"
  | "bundles:edit"
  | "counts:view"
  | "counts:enter"          // operators enter; stays pending
  | "counts:verify"         // supervisors/managers verify
  | "counts:approve"        // Super Manager approves and locks
  | "attendance:view"
  | "attendance:edit"

  // Quality
  | "qc:view"
  | "qc:edit"

  // Finished goods & delivery
  | "finished_goods:view"
  | "finished_goods:edit"

  // Incentive & salary statements
  | "incentive:view"
  | "incentive:adjust"      // enter mistakes / + / - for own dept
  | "incentive:approve"     // ONLY Super Manager can approve statements
  | "salary_schedule:approve"

  // Data corrections after lock
  | "locked_data:correct"   // Admin + Super Manager, with reason

  // Reports & dashboards
  | "reports:view"
  | "reports:manage"        // manage Telegram recipients etc.

// ─── Role → Permission mapping ───────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "users:manage",
    "settings:manage",
    "audit:view",
    "employees:view",
    "employees:edit",
    "salary:view",
    "salary:edit",
    "incentive_card:view",
    "incentive_card:edit",
    "stock:view",
    "stock:edit",
    "cuts:view",
    "cuts:edit",
    "bundles:view",
    "bundles:edit",
    "counts:view",
    "counts:enter",
    "counts:verify",
    "counts:approve",
    "attendance:view",
    "attendance:edit",
    "qc:view",
    "qc:edit",
    "finished_goods:view",
    "finished_goods:edit",
    "incentive:view",
    "incentive:adjust",
    // NOTE: Admin does NOT have incentive:approve — only Super Manager
    "locked_data:correct",
    "reports:view",
    "reports:manage",
  ],

  SUPER_MANAGER: [
    // Super Manager sees and acts on everything
    "users:manage",
    "settings:manage",
    "audit:view",
    "employees:view",
    "employees:edit",
    "salary:view",
    "salary:edit",
    "incentive_card:view",
    "incentive_card:edit",
    "stock:view",
    "stock:edit",
    "cuts:view",
    "cuts:edit",
    "bundles:view",
    "bundles:edit",
    "counts:view",
    "counts:enter",
    "counts:verify",
    "counts:approve",
    "attendance:view",
    "attendance:edit",
    "qc:view",
    "qc:edit",
    "finished_goods:view",
    "finished_goods:edit",
    "incentive:view",
    "incentive:adjust",
    "incentive:approve",        // ONLY Super Manager
    "salary_schedule:approve",  // ONLY Super Manager
    "locked_data:correct",
    "reports:view",
    "reports:manage",
  ],

  STORE_KEEPER: [
    "employees:view",
    "stock:view",
    "stock:edit",
    "cuts:view",
    "attendance:view",
    "reports:view",
    "audit:view",
  ],

  CUTTING_MANAGER: [
    "employees:view",
    "stock:view",
    "stock:edit",  // creates fabric requests
    "cuts:view",
    "cuts:edit",
    "bundles:view",
    "attendance:view",
    "incentive:adjust", // for cutter departments only (enforced in server actions)
    "reports:view",
    "audit:view",
  ],

  PRODUCTION_MANAGER: [
    "employees:view",
    "incentive_card:view",
    "stock:view",
    "cuts:view",
    "bundles:view",
    "bundles:edit",
    "counts:view",
    "counts:enter",
    "counts:verify",
    "counts:approve",
    "attendance:view",
    "attendance:edit",
    "qc:view",
    "finished_goods:view",
    "incentive:view",
    "incentive:adjust", // for production departments
    "reports:view",
    "audit:view",
  ],

  QC_INSPECTOR: [
    "employees:view",
    "bundles:view",
    "counts:view",
    "qc:view",
    "qc:edit",
    "finished_goods:view",
    "incentive:adjust", // mistakes for QC dept only
    "reports:view",
  ],

  FINISHED_GOODS_MANAGER: [
    "employees:view",
    "bundles:view",
    "bundles:edit",
    "qc:view",
    "finished_goods:view",
    "finished_goods:edit",
    "reports:view",
  ],

  HR_CLERK: [
    "employees:view",
    "employees:edit",
    // salary:view intentionally excluded — HR does not see salaries
    "attendance:view",
    "attendance:edit",
    "reports:view",
  ],

  OPERATOR: [
    "counts:view",     // own counts only
    "counts:enter",    // enters own counts; stays pending
    "attendance:view", // own attendance
  ],
};

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Returns true if the given role has the requested permission.
 * All server actions must call this before performing any write.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Returns all permissions for a role.
 */
export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Returns true if the role is one of the two top-level roles.
 */
export function isTopLevel(role: Role): boolean {
  return role === "ADMIN" || role === "SUPER_MANAGER";
}

/**
 * Returns true if the role can approve incentive statements.
 * Only the Super Manager can.
 */
export function canApproveIncentive(role: Role): boolean {
  return role === "SUPER_MANAGER";
}

/**
 * Returns true if the role can see salary amounts.
 */
export function canViewSalary(role: Role): boolean {
  return role === "ADMIN" || role === "SUPER_MANAGER";
}

/**
 * Throws an error if the user does not have the requested permission.
 * Use this at the top of every server action.
 */
export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(
      `ተፈቅዶ አልነበረም። (Permission denied: ${permission} not allowed for role ${role})`
    );
  }
}
