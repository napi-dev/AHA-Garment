/**
 * Seed script — loads all reference data from the master plan appendix.
 * Run with: npm run db:seed
 *
 * Safe to run multiple times (upserts, not inserts).
 * Uses sample data from incentive_v4.pdf appendix as placeholder until
 * the real employee list and incentive card arrive.
 */

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import Decimal from "decimal.js";

const db = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

// ─── 1. Departments (21 from appendix + support roles) ───────────────────────

const DEPARTMENTS: Array<{
  nameAm: string;
  nameEn: string;
  flowOrder: number | null;
  controllers: Role[];
}> = [
  // Production departments in flow order
  { nameAm: "ትከሻ (ፍሬንት)", nameEn: "Shoulder, back and front", flowOrder: 1, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  { nameAm: "ወገብ መቀምቀም", nameEn: "Waist tacking", flowOrder: 2, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  { nameAm: "እጅ / ሳይድ", nameEn: "Sleeve and side", flowOrder: 3, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  { nameAm: "ኪስ መለጠፍ", nameEn: "Pocket attaching", flowOrder: 4, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  { nameAm: "ሳይድ", nameEn: "Side", flowOrder: 5, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  { nameAm: "እጃት", nameEn: "Sleeve", flowOrder: 6, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  { nameAm: "እጅት ደርዝ እና ባጅ", nameEn: "Sleeve topstitch and badge", flowOrder: 7, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  { nameAm: "Interlock ማጠፍ", nameEn: "Interlock hem", flowOrder: 8, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  { nameAm: "ወገብ መቀጠም", nameEn: "Waistband joining", flowOrder: 9, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  { nameAm: "የካንሻይ ወገብ ዝግጅት", nameEn: "Kanshay waist prep", flowOrder: 10, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  { nameAm: "ሂትፕረስ መለጠፍ", nameEn: "Heat-press applying", flowOrder: 11, controllers: ["PRODUCTION_MANAGER"] },
  { nameAm: "ካውያ", nameEn: "Ironing", flowOrder: 12, controllers: ["PRODUCTION_MANAGER"] },
  { nameAm: "ቅንጫባ (ክር ለቃሚ)", nameEn: "Thread trimming", flowOrder: 13, controllers: ["PRODUCTION_MANAGER", "QC_INSPECTOR"] },
  { nameAm: "ማሸግ", nameEn: "Packing", flowOrder: 14, controllers: ["PRODUCTION_MANAGER"] },
  { nameAm: "ስቲከር / ላስቲክ መቀጥ", nameEn: "Sticker and elastic cutting", flowOrder: 15, controllers: ["CUTTING_MANAGER"] },
  { nameAm: "ዳሜጅ / ሱሪ መስረት", nameEn: "Damage and repair", flowOrder: 16, controllers: ["QC_INSPECTOR"] },
  // Cutting support
  { nameAm: "ረዳት / ሱሪ መቁረጥ", nameEn: "Helper, trouser cutting", flowOrder: null, controllers: ["CUTTING_MANAGER"] },
  { nameAm: "ቆራጭ", nameEn: "Cutter", flowOrder: null, controllers: ["CUTTING_MANAGER"] },
  { nameAm: "ረዳት ቆራጭ", nameEn: "Assistant cutter", flowOrder: null, controllers: ["CUTTING_MANAGER"] },
  // QC inspector
  { nameAm: "የጥራት ተቆጣጣሪ", nameEn: "Quality inspector", flowOrder: null, controllers: ["QC_INSPECTOR"] },
  // Support
  { nameAm: "ረዳት", nameEn: "Helper", flowOrder: null, controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"] },
  // Extra support rows (not in production flow)
  { nameAm: "የመስመር ረዳት", nameEn: "Line helpers", flowOrder: null, controllers: ["PRODUCTION_MANAGER"] },
  { nameAm: "መስመር ማሰራት", nameEn: "Line running", flowOrder: null, controllers: ["PRODUCTION_MANAGER"] },
  { nameAm: "ቁጥጥር", nameEn: "Line control", flowOrder: null, controllers: ["PRODUCTION_MANAGER"] },
  { nameAm: "አስተዳደር", nameEn: "Administration", flowOrder: null, controllers: [] },
];

// ─── 2. Sample employees (one per department, for testing) ───────────────────

// Workers from incentive_v4.pdf period 1 statement (67 workers)
// Using representative sample: at least one per department
const SAMPLE_EMPLOYEES: Array<{
  nameAm: string;
  deptIndex: number; // 0-based index into DEPARTMENTS
  plusP1: number; minusP1: number; mistakesP1: number;
  plusP2: number; minusP2: number; mistakesP2: number;
}> = [
  // Dept 0: Shoulder back and front (4 workers) — rate 1.00
  { nameAm: "ሰናይት ተፈሪ",    deptIndex: 0, plusP1: 200, minusP1: 0, mistakesP1: 0, plusP2: 135, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ሮዛ ጌታቸው",     deptIndex: 0, plusP1: 150, minusP1: 0, mistakesP1: 0, plusP2: 0,   minusP2: 0, mistakesP2: 0 },
  { nameAm: "አለሙ ሽፈራው",    deptIndex: 0, plusP1: 120, minusP1: 0, mistakesP1: 0, plusP2: 0,   minusP2: 0, mistakesP2: 0 },
  { nameAm: "ፋንቱ ደሳለኝ",    deptIndex: 0, plusP1: 90,  minusP1: 0, mistakesP1: 0, plusP2: 0,   minusP2: 0, mistakesP2: 0 },
  // Dept 1: Waist tacking (1 worker) — rate 1.00
  { nameAm: "ሙሉ አስፋው",     deptIndex: 1, plusP1: 150, minusP1: 0, mistakesP1: 0, plusP2: 180, minusP2: 0, mistakesP2: 0 },
  // Dept 2: Sleeve and side (4 workers) — rate 1.00
  { nameAm: "ሒሩት ብርሃኑ",    deptIndex: 2, plusP1: 100, minusP1: 0, mistakesP1: 0, plusP2: 100, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ወርቅነሽ ዮሐንስ",  deptIndex: 2, plusP1: 80,  minusP1: 0, mistakesP1: 0, plusP2: 90,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ጽጌ ወ/ሚካኤል",   deptIndex: 2, plusP1: 90,  minusP1: 0, mistakesP1: 0, plusP2: 80,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "አዳነ ሐይሌ",     deptIndex: 2, plusP1: 80,  minusP1: 0, mistakesP1: 0, plusP2: 80,  minusP2: 0, mistakesP2: 0 },
  // Dept 3: Pocket attaching (4 workers) — rate 0.90
  { nameAm: "ሸዋዬ ሽምለስ",    deptIndex: 3, plusP1: 0,   minusP1: 30, mistakesP1: 0, plusP2: 200, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ትርሃስ ሙሉጌታ",   deptIndex: 3, plusP1: 95,  minusP1: 0, mistakesP1: 0, plusP2: 150, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ዘነበ ገ/ሕይወት",  deptIndex: 3, plusP1: 0,   minusP1: 0, mistakesP1: 0, plusP2: 120, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ሰለሞን ጥላሁን",   deptIndex: 3, plusP1: 0,   minusP1: 0, mistakesP1: 0, plusP2: 0,   minusP2: 0, mistakesP2: 0 },
  // Dept 4: Side (4 workers) — rate 1.00
  { nameAm: "ብርሃን ተሰማ",    deptIndex: 4, plusP1: 100, minusP1: 0, mistakesP1: 0, plusP2: 110, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ዓለምፀሐይ ደርበ",  deptIndex: 4, plusP1: 80,  minusP1: 0, mistakesP1: 0, plusP2: 120, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ኤደን ካሳ",       deptIndex: 4, plusP1: 50,  minusP1: 0, mistakesP1: 0, plusP2: 80,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ማርቆስ ወ/ሰንቤት",  deptIndex: 4, plusP1: 40,  minusP1: 0, mistakesP1: 0, plusP2: 70,  minusP2: 0, mistakesP2: 0 },
  // Dept 5: Sleeve (4 workers) — rate 1.00
  { nameAm: "ሰውነት ካብሁን",   deptIndex: 7, plusP1: 100, minusP1: 0, mistakesP1: 0, plusP2: 0,   minusP2: 0, mistakesP2: 0 }, // Interlock hem
  { nameAm: "ጌጤ ዋቄ",        deptIndex: 5, plusP1: 90,  minusP1: 0, mistakesP1: 0, plusP2: 0,   minusP2: 70, mistakesP2: 0 },
  { nameAm: "ፀሐይ ክፍሌ",      deptIndex: 5, plusP1: 80,  minusP1: 0, mistakesP1: 0, plusP2: 0,   minusP2: 0, mistakesP2: 0 },
  { nameAm: "ደሳለኝ ምናሴ",    deptIndex: 5, plusP1: 70,  minusP1: 0, mistakesP1: 0, plusP2: 0,   minusP2: 0, mistakesP2: 0 },
  { nameAm: "ይሁን ደሳለኝ",    deptIndex: 5, plusP1: 80,  minusP1: 0, mistakesP1: 0, plusP2: 0,   minusP2: 0, mistakesP2: 0 },
  // Dept 6: Sleeve topstitch (2 workers) — rate 0.90
  { nameAm: "አምሃ ወ/ጊዮርጊስ",  deptIndex: 6, plusP1: 105, minusP1: 0, mistakesP1: 0, plusP2: 45, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ፍቅርተ አህመድ",   deptIndex: 6, plusP1: 105, minusP1: 0, mistakesP1: 0, plusP2: 0,  minusP2: 0, mistakesP2: 0 },
  // Dept 7: Interlock hem (additional 3 workers) — rate 1.20
  { nameAm: "አለሙ ጌታቸው",    deptIndex: 7, plusP1: 60,  minusP1: 0, mistakesP1: 0, plusP2: 100, minusP2: 0, mistakesP2: 0 },
  { nameAm: "አስቴር ዮሐንስ",   deptIndex: 7, plusP1: 50,  minusP1: 0, mistakesP1: 0, plusP2: 90,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ሰናይ ሐዋ",       deptIndex: 7, plusP1: 10,  minusP1: 0, mistakesP1: 0, plusP2: 50,  minusP2: 0, mistakesP2: 0 },
  // Dept 8: Waistband joining (4 workers) — rate 0.90
  { nameAm: "ሐረፍ ሰይድ",      deptIndex: 8, plusP1: 60,  minusP1: 0, mistakesP1: 0, plusP2: 90, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ጸጋ ዘነሙ",       deptIndex: 8, plusP1: 40,  minusP1: 0, mistakesP1: 0, plusP2: 60, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ሰጓ ናሁ",         deptIndex: 8, plusP1: 40,  minusP1: 0, mistakesP1: 0, plusP2: 30, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ህይወት ሸቢ",      deptIndex: 8, plusP1: 20,  minusP1: 0, mistakesP1: 0, plusP2: 30, minusP2: 0, mistakesP2: 0 },
  // Dept 9: Kanshay waist prep (3 workers) — rate 0.80
  { nameAm: "ሙሉቀን አዳነ",     deptIndex: 9, plusP1: 230, minusP1: 0, mistakesP1: 0, plusP2: 50, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ዝናሽ ታደሰ",     deptIndex: 9, plusP1: 100, minusP1: 0, mistakesP1: 0, plusP2: 50, minusP2: 0, mistakesP2: 0 },
  { nameAm: "አዳነ ዘሪሁን",     deptIndex: 9, plusP1: 100, minusP1: 0, mistakesP1: 0, plusP2: 50, minusP2: 0, mistakesP2: 0 },
  // Dept 10: Heat-press applying (4 workers) — rate 0.80
  { nameAm: "ዮናስ ካሳ",        deptIndex: 10, plusP1: 100, minusP1: 0,  mistakesP1: 0, plusP2: 100, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ፍቃዱ ወ/ሚካኤል",   deptIndex: 10, plusP1: 50,  minusP1: 0,  mistakesP1: 0, plusP2: 100, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ሊዲያ ደርበ",       deptIndex: 10, plusP1: 0,   minusP1: 30, mistakesP1: 0, plusP2: 0,   minusP2: 0, mistakesP2: 0 },
  { nameAm: "ዘሪቱ ሰጓ",        deptIndex: 10, plusP1: 45,  minusP1: 0,  mistakesP1: 0, plusP2: 50,  minusP2: 0, mistakesP2: 0 },
  // Dept 11: Ironing (4 workers) — rate 0.80
  { nameAm: "ፀሐይ ሐዋ",        deptIndex: 11, plusP1: 120, minusP1: 0, mistakesP1: 0, plusP2: 120, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ብርቱካን ካሳ",     deptIndex: 11, plusP1: 100, minusP1: 0, mistakesP1: 0, plusP2: 100, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ፈቶ ዮሐንስ",       deptIndex: 11, plusP1: 80,  minusP1: 0, mistakesP1: 0, plusP2: 80,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ልዑልሰገድ ተሰማ",   deptIndex: 11, plusP1: 190, minusP1: 0, mistakesP1: 0, plusP2: 210, minusP2: 0, mistakesP2: 0 },
  // Dept 12: Thread trimming (8 workers) — rate 0.70
  { nameAm: "ሳሙኤል ሙሉጌታ",    deptIndex: 12, plusP1: 70, minusP1: 0, mistakesP1: 0, plusP2: 130, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ይፍሩ ወ/ሰنبት",   deptIndex: 12, plusP1: 70, minusP1: 0, mistakesP1: 0, plusP2: 130, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ፍቅርተ ዘርዓይ",    deptIndex: 12, plusP1: 40, minusP1: 0, mistakesP1: 0, plusP2: 60,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ሐናን አህመድ",      deptIndex: 12, plusP1: 40, minusP1: 0, mistakesP1: 0, plusP2: 50,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ትዕዛዝ ሐዋ",       deptIndex: 12, plusP1: 20, minusP1: 0, mistakesP1: 0, plusP2: 40,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ዙፋን ሐሰን",       deptIndex: 12, plusP1: 10, minusP1: 0, mistakesP1: 0, plusP2: 30,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ጌጤ ዋቄ ቀለብ",    deptIndex: 12, plusP1: 10, minusP1: 0, mistakesP1: 0, plusP2: 30,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ሚሚ ጥሩነሽ",      deptIndex: 12, plusP1: 10, minusP1: 0, mistakesP1: 0, plusP2: 47,  minusP2: 0, mistakesP2: 0 },
  // Dept 13: Packing (5 workers) — rate 0.60
  { nameAm: "አቢቢ ደሳለኝ",     deptIndex: 13, plusP1: 100, minusP1: 0, mistakesP1: 0, plusP2: 70,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ሰለሞን አሰፋ",     deptIndex: 13, plusP1: 90,  minusP1: 0, mistakesP1: 0, plusP2: 50,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ፋናዬ ሙሉጌታ",     deptIndex: 13, plusP1: 60,  minusP1: 0, mistakesP1: 0, plusP2: 30,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ሐናን ሶፍያ",       deptIndex: 13, plusP1: 45,  minusP1: 0, mistakesP1: 0, plusP2: 20,  minusP2: 0, mistakesP2: 0 },
  { nameAm: "ሂሩት ሰይድ",       deptIndex: 13, plusP1: 0,   minusP1: 0, mistakesP1: 0, plusP2: 7,   minusP2: 0, mistakesP2: 0 },
  // Dept 14: Sticker/elastic cutting (1 worker) — rate 0.80
  { nameAm: "አዲሱ ቀፀ",        deptIndex: 14, plusP1: 0, minusP1: 30, mistakesP1: 0, plusP2: 90, minusP2: 0, mistakesP2: 0 },
  // Dept 15: Damage and repair (2 workers) — rate 0.80
  { nameAm: "ፍሬዘር ሙሉጌታ",    deptIndex: 15, plusP1: 0, minusP1: 20, mistakesP1: 0, plusP2: 0, minusP2: 10, mistakesP2: 0 },
  { nameAm: "ቤዛ ደሳለኝ",       deptIndex: 15, plusP1: 0, minusP1: 20, mistakesP1: 0, plusP2: 0, minusP2: 20, mistakesP2: 0 },
  // Dept 16: Helper trouser cutting (1 worker) — rate 0.80
  { nameAm: "ወ/ሮ አዜቡ ሙሉጌ",   deptIndex: 16, plusP1: 0, minusP1: 50, mistakesP1: 0, plusP2: 0, minusP2: 0, mistakesP2: 0 },
  // Dept 17: Cutter (1 worker) — rate 0.90
  { nameAm: "ሕዝቅያስ ዮሐንስ",   deptIndex: 17, plusP1: 90, minusP1: 0, mistakesP1: 0, plusP2: 200, minusP2: 0, mistakesP2: 0 },
  // Dept 18: Assistant cutter (1 worker) — rate 0.90
  { nameAm: "ሳምሶን ካሳ",       deptIndex: 18, plusP1: 50, minusP1: 0, mistakesP1: 0, plusP2: 60,  minusP2: 0, mistakesP2: 0 },
  // Dept 19: Quality inspector (1 worker) — rate 0.60, target 0
  { nameAm: "ሰላም ካሳ",         deptIndex: 19, plusP1: 0, minusP1: 0, mistakesP1: 0, plusP2: 0, minusP2: 0, mistakesP2: 0 },
  // Dept 20: Helper (1 worker) — rate 0.60, target 0
  { nameAm: "ሓናን ዘነሙ",        deptIndex: 20, plusP1: 0, minusP1: 0, mistakesP1: 0, plusP2: 0, minusP2: 0, mistakesP2: 0 },
  // Dept 21: Line helpers (2 workers) — target 0
  { nameAm: "ዮሴፍ ወ/ሰንቤት",    deptIndex: 21, plusP1: 0, minusP1: 0, mistakesP1: 0, plusP2: 0, minusP2: 0, mistakesP2: 0 },
  { nameAm: "ዳዊት ተሰማ",       deptIndex: 21, plusP1: 0, minusP1: 0, mistakesP1: 0, plusP2: 0, minusP2: 0, mistakesP2: 0 },
  // Dept 22: Line running (1 worker)
  { nameAm: "ኤልያስ ሙሉጌታ",    deptIndex: 22, plusP1: 0, minusP1: 0, mistakesP1: 0, plusP2: 0, minusP2: 0, mistakesP2: 0 },
  // Dept 23: Line control (1 worker)
  { nameAm: "ፍቃዱ ካሳ",         deptIndex: 23, plusP1: 0, minusP1: 0, mistakesP1: 0, plusP2: 0, minusP2: 0, mistakesP2: 0 },
];

// ─── 4. System users (one per role for testing) ───────────────────────────────

const SYSTEM_USERS: Array<{ code: string; pin: string; role: Role; nameAm: string }> = [
  { code: "ADM-001",  pin: "1234", role: "ADMIN",                  nameAm: "አስተዳዳሪ" },
  { code: "MGR-001",  pin: "1234", role: "PRODUCTION_MANAGER",    nameAm: "ዋና ምርት አስኪያጅ" },
  { code: "STK-001",  pin: "1234", role: "STORE_KEEPER",           nameAm: "የመጋዘን ኃላፊ" },
  { code: "CUT-001",  pin: "1234", role: "CUTTING_MANAGER",        nameAm: "የቆረጣ ኃላፊ" },
  { code: "QCI-001",  pin: "1234", role: "QC_INSPECTOR",           nameAm: "የጥራት ተቆጣጣሪ" },
  { code: "SUP-001",  pin: "1234", role: "LINE_SUPERVISOR",        nameAm: "የመስመር ሱፐርቫይዘር" },
  { code: "ORD-001",  pin: "1234", role: "ORDER_PLACER",           nameAm: "የትዕዛዝ ተቀባይ" },
];

// ─── Seed logic ───────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Departments ──────────────────────────────────────────────────────────
  console.log("  Creating departments...");
  const deptIds: string[] = [];

  for (const dept of DEPARTMENTS) {
    const created = await db.department.upsert({
      where: { nameAm: dept.nameAm },
      update: { 
        nameEn: dept.nameEn, 
        flowOrder: dept.flowOrder,
        controllers: { set: dept.controllers },
      },
      create: {
        nameAm: dept.nameAm,
        nameEn: dept.nameEn,
        flowOrder: dept.flowOrder,
        controllers: dept.controllers,
      },
    });
    deptIds.push(created.id);
  }
  console.log(`    ✓ ${deptIds.length} departments`);

  // ── Employees ────────────────────────────────────────────────────────────
  console.log("  Creating sample employees...");
  const empIds: string[] = [];
  let serial = 1;

  for (const emp of SAMPLE_EMPLOYEES) {
    const deptId = deptIds[emp.deptIndex];
    const existing = await db.employee.findFirst({
      where: { nameAm: emp.nameAm, departmentId: deptId },
    });

    let id: string;
    if (existing) {
      id = existing.id;
      // Track the highest serial number if employee already exists
      if (existing.serialNumber >= serial) {
        serial = existing.serialNumber + 1;
      }
    } else {
      const created = await db.employee.create({
        data: {
          serialNumber: serial,
          nameAm: emp.nameAm,
          departmentId: deptId,
        },
      });
      id = created.id;
      serial++;
    }
    empIds.push(id);
  }
  console.log(`    ✓ ${SAMPLE_EMPLOYEES.length} employees`);

  // ── System users ─────────────────────────────────────────────────────────
  console.log("  Creating system users...");
  for (const u of SYSTEM_USERS) {
    const pinHash = await bcrypt.hash(u.pin, 10);
    
    // Check if AppUser already exists
    const existingUser = await db.appUser.findUnique({
      where: { employeeCode: u.code },
    });
    
    if (existingUser) {
      // Update existing user
      await db.appUser.update({
        where: { employeeCode: u.code },
        data: { pinHash, role: u.role },
      });
    } else {
      // Create new user with employee
      await db.appUser.create({
        data: {
          employeeCode: u.code,
          pinHash,
          role: u.role,
          employee: {
            create: {
              serialNumber: serial++,
              nameAm: u.nameAm,
              department: {
                connect: { id: deptIds[0] },
              },
            },
          },
        },
      });
    }
  }
  console.log(`    ✓ ${SYSTEM_USERS.length} system users`);

  // ── App settings ─────────────────────────────────────────────────────────
  console.log("  Creating default settings...");
  const defaultSettings = [
    { key: "wastage_alert_pct", value: "5.0" },
    { key: "salary_pay_day", value: "30" },
    { key: "full_shift_hours", value: "8" },
    { key: "unusual_count_threshold_pct", value: "150" },
  ];
  for (const s of defaultSettings) {
    await db.appSetting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value, updatedBy: "seed" },
    });
  }
  console.log("    ✓ default settings");

  console.log("\n✅ Seed complete.");
  console.log("\n📋 System user logins (all PIN: 1234):");
  for (const u of SYSTEM_USERS) {
    console.log(`   ${u.code.padEnd(10)} → ${u.nameAm} (${u.role})`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
