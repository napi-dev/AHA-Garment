/**
 * Seed script — loads all reference data from the master plan appendix.
 * Run with: npm run db:seed
 *
 * Safe to run multiple times (upserts, not inserts).
 * Uses sample data from incentive_v4.pdf appendix as placeholder until
 * the real employee list and incentive card arrive.
 */

import { PrismaClient, BundleStage, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import Decimal from "decimal.js";

const db = new PrismaClient();

// ─── 1. Departments (21 from appendix + support roles) ───────────────────────

const DEPARTMENTS: Array<{
  nameAm: string;
  nameEn: string;
  stage: BundleStage;
  sortOrder: number;
  targetPerHour: number;
  ratePerPiece: string; // string to keep exact Decimal
}> = [
  // Sewing (stage 3)
  { nameAm: "ትከሻ (ፍሬንት)", nameEn: "Shoulder, back and front", stage: "SEWING", sortOrder: 1, targetPerHour: 70, ratePerPiece: "1.00" },
  { nameAm: "ወገብ መቀምቀም", nameEn: "Waist tacking", stage: "SEWING", sortOrder: 2, targetPerHour: 70, ratePerPiece: "1.00" },
  { nameAm: "እጅ / ሳይድ", nameEn: "Sleeve and side", stage: "SEWING", sortOrder: 3, targetPerHour: 75, ratePerPiece: "1.00" },
  { nameAm: "ኪስ መለጠፍ", nameEn: "Pocket attaching", stage: "SEWING", sortOrder: 4, targetPerHour: 80, ratePerPiece: "0.90" },
  { nameAm: "ሳይድ", nameEn: "Side", stage: "SEWING", sortOrder: 5, targetPerHour: 78, ratePerPiece: "1.00" },
  { nameAm: "እጃት", nameEn: "Sleeve", stage: "SEWING", sortOrder: 6, targetPerHour: 76, ratePerPiece: "1.00" },
  { nameAm: "እጅት ደርዝ እና ባጅ", nameEn: "Sleeve topstitch and badge", stage: "SEWING", sortOrder: 7, targetPerHour: 82, ratePerPiece: "0.90" },
  { nameAm: "Interlock ማጠፍ", nameEn: "Interlock hem", stage: "SEWING", sortOrder: 8, targetPerHour: 72, ratePerPiece: "1.20" },
  { nameAm: "ወገብ መቀጠም", nameEn: "Waistband joining", stage: "SEWING", sortOrder: 9, targetPerHour: 75, ratePerPiece: "0.90" },
  { nameAm: "የካንሻይ ወገብ ዝግጅት", nameEn: "Kanshay waist prep", stage: "SEWING", sortOrder: 10, targetPerHour: 82, ratePerPiece: "0.80" },
  // Styling / hit press (stage 6)
  { nameAm: "ሂትፕረስ መለጠፍ", nameEn: "Heat-press applying", stage: "STYLING_HITPRESS", sortOrder: 11, targetPerHour: 90, ratePerPiece: "0.80" },
  // Ironing (stage 7)
  { nameAm: "ካውያ", nameEn: "Ironing", stage: "IRONING", sortOrder: 12, targetPerHour: 45, ratePerPiece: "0.80" },
  // Trimming (stage 4)
  { nameAm: "ቅንጫባ (ክር ለቃሚ)", nameEn: "Thread trimming", stage: "TRIMMING", sortOrder: 13, targetPerHour: 30, ratePerPiece: "0.70" },
  // Packing (stage 8)
  { nameAm: "ማሸግ", nameEn: "Packing", stage: "PACKING", sortOrder: 14, targetPerHour: 55, ratePerPiece: "0.60" },
  // Cutting (stage 2)
  { nameAm: "ስቲከር / ላስቲክ መቀጥ", nameEn: "Sticker and elastic cutting", stage: "CUTTING", sortOrder: 15, targetPerHour: 60, ratePerPiece: "0.80" },
  // QC (stage 5)
  { nameAm: "ዳሜጅ / ሱሪ መስረት", nameEn: "Damage and repair", stage: "QUALITY_CONTROL", sortOrder: 16, targetPerHour: 60, ratePerPiece: "0.80" },
  // Cutting support
  { nameAm: "ረዳት / ሱሪ መቁረጥ", nameEn: "Helper, trouser cutting", stage: "CUTTING", sortOrder: 17, targetPerHour: 50, ratePerPiece: "0.80" },
  { nameAm: "ቆራጭ", nameEn: "Cutter", stage: "CUTTING", sortOrder: 18, targetPerHour: 65, ratePerPiece: "0.90" },
  { nameAm: "ረዳት ቆራጭ", nameEn: "Assistant cutter", stage: "CUTTING", sortOrder: 19, targetPerHour: 55, ratePerPiece: "0.90" },
  // QC inspector (target 0 → always 0 incentive)
  { nameAm: "የጥራት ተቆጣጣሪ", nameEn: "Quality inspector", stage: "QUALITY_CONTROL", sortOrder: 20, targetPerHour: 0, ratePerPiece: "0.60" },
  // Support (target 0)
  { nameAm: "ረዳት", nameEn: "Helper", stage: "SEWING", sortOrder: 21, targetPerHour: 0, ratePerPiece: "0.60" },
  // Extra support rows (always 0, not in incentive card)
  { nameAm: "የመስመር ረዳት", nameEn: "Line helpers", stage: "SEWING", sortOrder: 22, targetPerHour: 0, ratePerPiece: "0.00" },
  { nameAm: "መስመር ማሰራት", nameEn: "Line running", stage: "SEWING", sortOrder: 23, targetPerHour: 0, ratePerPiece: "0.00" },
  { nameAm: "ቁጥጥር", nameEn: "Line control", stage: "SEWING", sortOrder: 24, targetPerHour: 0, ratePerPiece: "0.00" },
];

// ─── 2. Operations (13 from salary_schedule.pdf) ─────────────────────────────

const OPERATIONS = [
  { nameEn: "Cutting and preparation, helpers", nameAm: "ቆረጣ እና ዝግጅት", sortOrder: 1 },
  { nameEn: "DTF sticker heat-pressing", nameAm: "ሂትፕረስ", sortOrder: 2 },
  { nameEn: "Pocket sewing and topstitch", nameAm: "ኪስ መስፋት + ደርዝ", sortOrder: 3 },
  { nameEn: "Neck rib and back tape", nameAm: "አንገት ሪብ እና ጀርባ ቴፕ", sortOrder: 4 },
  { nameEn: "Waistband and elastic joining", nameAm: "ወገብ እና ላስቲክ መቀጠም", sortOrder: 5 },
  { nameEn: "Waist, Kanshay", nameAm: "ወገብ በካንሻይ", sortOrder: 6 },
  { nameEn: "Trouser panel seam, front and back", nameAm: "የሱሪ ፓነል ስፌት", sortOrder: 7 },
  { nameEn: "Shoulder and sleeve joining", nameAm: "ትከሻ እና እጃት መቀጠም", sortOrder: 8 },
  { nameEn: "T-shirt and trouser side seam", nameAm: "ሳይድ ስፌት", sortOrder: 9 },
  { nameEn: "T-shirt and trouser hem or sleeve fold", nameAm: "ሄም ወይም እጃት ማጠፍ", sortOrder: 10 },
  { nameEn: "Line material feeder or helper", nameAm: "ረዳት", sortOrder: 11 },
  { nameEn: "Thread trimming", nameAm: "ቅንጫባ (ክር ለቃሚ)", sortOrder: 12 },
  { nameEn: "Ironing and packing", nameAm: "ካውያ እና ማሸግ", sortOrder: 13 },
];

// ─── 3. Sample employees (one per department, for testing) ───────────────────

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
  { code: "MGR-001",  pin: "1234", role: "SUPER_MANAGER",          nameAm: "ሱፐር ማኔጀር" },
  { code: "STK-001",  pin: "1234", role: "STORE_KEEPER",           nameAm: "የመጋዘን ኃላፊ" },
  { code: "CUT-001",  pin: "1234", role: "CUTTING_MANAGER",        nameAm: "የቆረጣ ኃላፊ" },
  { code: "PRD-001",  pin: "1234", role: "PRODUCTION_MANAGER",     nameAm: "የምርት ኃላፊ" },
  { code: "QCI-001",  pin: "1234", role: "QC_INSPECTOR",           nameAm: "የጥራት ተቆጣጣሪ" },
  { code: "FGM-001",  pin: "1234", role: "FINISHED_GOODS_MANAGER", nameAm: "የተጠናቀቀ እቃ ኃላፊ" },
  { code: "HRC-001",  pin: "1234", role: "HR_CLERK",               nameAm: "የሰው ሀብት" },
  { code: "OPR-001",  pin: "1234", role: "OPERATOR",               nameAm: "ኦፕሬተር" },
];

// ─── Seed logic ───────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Departments ──────────────────────────────────────────────────────────
  console.log("  Creating departments...");
  const deptIds: string[] = [];

  for (const dept of DEPARTMENTS) {
    const created = await db.department.upsert({
      where: { nameEn: dept.nameEn },
      update: { nameAm: dept.nameAm, stage: dept.stage, sortOrder: dept.sortOrder },
      create: {
        nameAm: dept.nameAm,
        nameEn: dept.nameEn,
        stage: dept.stage,
        sortOrder: dept.sortOrder,
      },
    });
    deptIds.push(created.id);
  }
  console.log(`    ✓ ${deptIds.length} departments`);

  // ── Incentive cards (effective from 2018-01-01 EC / ~2025-09-11 Greg) ──
  console.log("  Creating incentive cards...");
  const effectiveFrom = new Date("2025-09-11T00:00:00Z"); // ~ Meskerem 1, 2018 EC
  const setByUserId = "seed";

  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const dept = DEPARTMENTS[i];
    const deptId = deptIds[i];
    if (dept.ratePerPiece === "0.00" && dept.targetPerHour === 0) continue;

    // Close any existing open card
    await db.incentiveCard.updateMany({
      where: { departmentId: deptId, effectiveTo: null },
      data: { effectiveTo: effectiveFrom },
    });

    // Use createOrUpdate pattern — compound unique now exists in schema
    const existing = await db.incentiveCard.findUnique({
      where: { departmentId_effectiveFrom: { departmentId: deptId, effectiveFrom } },
    });
    if (!existing) {
      await db.incentiveCard.create({
        data: {
          departmentId: deptId,
          targetPerHour: dept.targetPerHour,
          ratePerPiece: new Decimal(dept.ratePerPiece),
          effectiveFrom,
          effectiveTo: null,
          setByUserId,
        },
      });
    }
  }
  console.log("    ✓ incentive cards");

  // ── Operations ───────────────────────────────────────────────────────────
  console.log("  Creating operations...");
  const opIds: string[] = [];
  for (const op of OPERATIONS) {
    const created = await db.operation.upsert({
      where: { nameEn: op.nameEn },
      update: { nameAm: op.nameAm, sortOrder: op.sortOrder },
      create: { nameEn: op.nameEn, nameAm: op.nameAm, sortOrder: op.sortOrder },
    });
    opIds.push(created.id);
  }
  console.log(`    ✓ ${opIds.length} operations`);

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
    } else {
      const created = await db.employee.create({
        data: {
          serialNumber: serial++,
          nameAm: emp.nameAm,
          departmentId: deptId,
        },
      });
      id = created.id;
    }
    empIds.push(id);
    serial++;
  }
  console.log(`    ✓ ${SAMPLE_EMPLOYEES.length} employees`);

  // ── System users ─────────────────────────────────────────────────────────
  console.log("  Creating system users...");
  for (const u of SYSTEM_USERS) {
    const pinHash = await bcrypt.hash(u.pin, 10);
    await db.appUser.upsert({
      where: { employeeCode: u.code },
      update: { pinHash, role: u.role },
      create: {
        employeeCode: u.code,
        pinHash,
        role: u.role,
        employee: {
          create: {
            serialNumber: serial++,
            nameAm: u.nameAm,
            department: {
              connect: { id: deptIds[0] }, // temporary dept assignment for system users
            },
          },
        },
      },
    });
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
