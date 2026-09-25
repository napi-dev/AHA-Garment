/**
 * Phase 2 seed — loads sample materials, suppliers, garment styles, BOM,
 * and one active production order so Phase 2 screens have data to show.
 *
 * Run with: npm run db:seed-phase2
 *
 * Safe to run multiple times (upserts / find-or-create).
 */

import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

// Seed scripts must use the direct (non-pooler) URL — Neon's pooler
// rejects direct TCP connections from CLI scripts.
const db = new PrismaClient({
  log: ["error"],
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

// ─── Suppliers ────────────────────────────────────────────────────────────────

const SUPPLIERS = [
  { nameAm: "አዲስ ጨርቅ አቅራቢ",   nameEn: "Addis Fabric Supplier",  contact: "+251911000001" },
  { nameAm: "ኢትዮ ጥሬ እቃ ንግድ",  nameEn: "Ethio Raw Materials",    contact: "+251911000002" },
  { nameAm: "ቀርቀሃ ድረ-ሰሌዳ",     nameEn: "Qerqeha Accessories",    contact: "+251911000003" },
];

// ─── Materials (with BOM standard weights) ────────────────────────────────────

const MATERIALS: Array<{
  nameAm: string; nameEn: string; unit: string; minimumLevel: string; sku?: string;
}> = [
  { nameAm: "ነጭ ቲ-ሸርት ጨርቅ",        nameEn: "White T-Shirt Fabric",     unit: "kg",   minimumLevel: "20.000" },
  { nameAm: "ሰማያዊ ሱሪ ጨርቅ",          nameEn: "Blue Trouser Fabric",      unit: "kg",   minimumLevel: "15.000" },
  { nameAm: "ቀይ ፖሎ ጨርቅ",            nameEn: "Red Polo Fabric",          unit: "kg",   minimumLevel: "10.000" },
  { nameAm: "ሪብ ጨርቅ (ለቲ-ሸርት አንገት)", nameEn: "Rib Fabric (T-shirt neck)", unit: "kg",   minimumLevel: "5.000"  },
  { nameAm: "ፖሊስተር ጨርቅ",            nameEn: "Polyester Fabric",         unit: "kg",   minimumLevel: "8.000"  },
  { nameAm: "ዚፕ (20 ሴ.ሜ)",           nameEn: "Zipper 20cm",              unit: "pcs",  minimumLevel: "100"    },
  { nameAm: "ቁልፍ (4 ቀዳዳ)",          nameEn: "Button 4-hole",            unit: "pcs",  minimumLevel: "500"    },
  { nameAm: "ቀጭን ቅርፊት ሱሪ",          nameEn: "Elastic Band 3cm",         unit: "m",    minimumLevel: "50.000" },
  { nameAm: "መስፊያ ክር (ነጭ)",          nameEn: "Sewing Thread White",      unit: "roll", minimumLevel: "20"     },
  { nameAm: "መስፊያ ክር (ጥቁር)",         nameEn: "Sewing Thread Black",      unit: "roll", minimumLevel: "20"     },
  { nameAm: "DTF ስቲከር ጠቅ.",          nameEn: "DTF Sticker Sheet",        unit: "pcs",  minimumLevel: "200"    },
  { nameAm: "ማሸጊያ ከረጢት",            nameEn: "Polybag Packaging",        unit: "pcs",  minimumLevel: "300"    },
  { nameAm: "ካርቶን ሳጥን",             nameEn: "Carton Box",               unit: "pcs",  minimumLevel: "50"     },
];

// ─── Garment styles ───────────────────────────────────────────────────────────

const STYLES = [
  {
    nameAm: "ነጭ ቲ-ሸርት",
    nameEn: "White T-Shirt",
    bom: [
      { materialIdx: 0, qty: "0.2500", unit: "kg" }, // white fabric
      { materialIdx: 3, qty: "0.0200", unit: "kg" }, // rib fabric
      { materialIdx: 8, qty: "0.0100", unit: "roll" }, // white thread
    ],
  },
  {
    nameAm: "ሰማያዊ ሱሪ",
    nameEn: "Blue Trouser",
    bom: [
      { materialIdx: 1, qty: "0.3500", unit: "kg" }, // blue trouser fabric
      { materialIdx: 5, qty: "1",      unit: "pcs" }, // zipper
      { materialIdx: 7, qty: "0.7000", unit: "m"   }, // elastic band
      { materialIdx: 9, qty: "0.0150", unit: "roll"}, // black thread
    ],
  },
  {
    nameAm: "ቀይ ፖሎ ሸሚዝ",
    nameEn: "Red Polo Shirt",
    bom: [
      { materialIdx: 2, qty: "0.2800", unit: "kg"  }, // red polo fabric
      { materialIdx: 6, qty: "3",      unit: "pcs" }, // buttons
      { materialIdx: 8, qty: "0.0120", unit: "roll"}, // white thread
    ],
  },
];

// ─── Initial stock movements ──────────────────────────────────────────────────

const INITIAL_STOCK: Array<{ materialIdx: number; qty: string }> = [
  { materialIdx: 0,  qty: "150.000" },
  { materialIdx: 1,  qty: "120.000" },
  { materialIdx: 2,  qty: "80.000"  },
  { materialIdx: 3,  qty: "30.000"  },
  { materialIdx: 4,  qty: "60.000"  },
  { materialIdx: 5,  qty: "500"     },
  { materialIdx: 6,  qty: "2000"    },
  { materialIdx: 7,  qty: "200.000" },
  { materialIdx: 8,  qty: "100"     },
  { materialIdx: 9,  qty: "100"     },
  { materialIdx: 10, qty: "1000"    },
  { materialIdx: 11, qty: "2000"    },
  { materialIdx: 12, qty: "200"     },
];

// ─── Seed logic ───────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Phase 2 seed...\n");

  // ── Suppliers ────────────────────────────────────────────────────────────
  console.log("  Creating suppliers...");
  const supplierIds: string[] = [];
  for (const s of SUPPLIERS) {
    const existing = await db.supplier.findFirst({ where: { nameAm: s.nameAm } });
    if (existing) { supplierIds.push(existing.id); continue; }
    const created = await db.supplier.create({ data: s });
    supplierIds.push(created.id);
  }
  console.log(`    ✓ ${SUPPLIERS.length} suppliers`);

  // ── Lots ──────────────────────────────────────────────────────────────────
  const lot = await db.lot.findFirst({ where: { lotNumber: "LOT-2018-001" } })
    ?? await db.lot.create({
      data: {
        lotNumber: "LOT-2018-001",
        supplierId: supplierIds[0],
        receivedAt: new Date("2025-09-11T00:00:00Z"),
        notes: "መጀመሪያ ሎት",
      },
    });

  // ── Materials ────────────────────────────────────────────────────────────
  console.log("  Creating materials...");
  const materialIds: string[] = [];
  for (let i = 0; i < MATERIALS.length; i++) {
    const m = MATERIALS[i];
    const sku = m.sku ?? `MAT-${String(i + 1).padStart(3, "0")}`;
    const existing = await db.material.findFirst({ where: { nameAm: m.nameAm } });
    if (existing) { materialIds.push(existing.id); continue; }
    const created = await db.material.create({
      data: { nameAm: m.nameAm, nameEn: m.nameEn, unit: m.unit, minimumLevel: m.minimumLevel, sku },
    });
    materialIds.push(created.id);
  }
  console.log(`    ✓ ${MATERIALS.length} materials`);

  // ── Initial stock ─────────────────────────────────────────────────────────
  console.log("  Adding initial stock...");
  const systemUser = await db.appUser.findFirst({ where: { role: "STORE_KEEPER" } })
    ?? await db.appUser.findFirst({ where: { role: "ADMIN" } });
  if (systemUser) {
    for (const s of INITIAL_STOCK) {
      const matId = materialIds[s.materialIdx];
      const existing = await db.stockMovement.findFirst({
        where: { materialId: matId, type: "RECEIVE", reference: "SEED_INITIAL" },
      });
      if (existing) continue;
      await db.stockMovement.create({
        data: {
          materialId: matId,
          type: "RECEIVE",
          quantity: new Decimal(s.qty),
          lotId: lot.id,
          reference: "SEED_INITIAL",
          date: new Date("2025-09-11T00:00:00Z"),
          enteredById: systemUser.id,
          notes: "መጀመሪያ ክምችት",
        },
      });
    }
    console.log(`    ✓ initial stock for ${INITIAL_STOCK.length} materials`);
  } else {
    console.log("    ⚠️  No system user found — skipping stock movements. Run db:seed first.");
  }

  // ── Garment styles + BOM ──────────────────────────────────────────────────
  console.log("  Creating styles and BOM...");
  const styleIds: string[] = [];
  for (let i = 0; i < STYLES.length; i++) {
    const s = STYLES[i];
    const existing = await db.garmentStyle.findFirst({ where: { nameAm: s.nameAm } });
    let styleId: string;
    if (existing) {
      styleId = existing.id;
    } else {
      const count = await db.garmentStyle.count();
      const created = await db.garmentStyle.create({
        data: {
          nameAm: s.nameAm,
          nameEn: s.nameEn,
          code: `STY-${String(count + 1).padStart(3, "0")}`,
        },
      });
      styleId = created.id;
    }
    styleIds.push(styleId);

    // BOM items
    for (const b of s.bom) {
      const matId = materialIds[b.materialIdx];
      await db.bomItem.upsert({
        where: { styleId_materialId: { styleId, materialId: matId } },
        update: { qtyPerPiece: b.qty, unit: b.unit },
        create: { styleId, materialId: matId, qtyPerPiece: b.qty, unit: b.unit },
      });
    }

    // Stage routes (default 9 stages)
    const STAGES = [
      "RECEIVING","CUTTING","SEWING","TRIMMING",
      "QUALITY_CONTROL","STYLING_HITPRESS","IRONING","PACKING","DELIVERY",
    ] as const;
    for (let si = 0; si < STAGES.length; si++) {
      await db.styleStageRoute.upsert({
        where: { styleId_stage: { styleId, stage: STAGES[si] } },
        update: { sortOrder: si + 1 },
        create: { styleId, stage: STAGES[si], sortOrder: si + 1 },
      });
    }
  }
  console.log(`    ✓ ${STYLES.length} styles with BOM`);

  // ── Production orders ─────────────────────────────────────────────────────
  console.log("  Creating sample production orders...");
  const ordersToCreate = [
    { styleIdx: 0, quantity: 500, customer: "ደምበኛ A",  dueDate: "2026-10-15" },
    { styleIdx: 1, quantity: 300, customer: "ደምበኛ B",  dueDate: "2026-11-01" },
    { styleIdx: 2, quantity: 200, customer: "ደምበኛ C",  dueDate: "2026-10-30" },
  ];

  for (const o of ordersToCreate) {
    const styleId = styleIds[o.styleIdx];
    const existing = await db.prodOrder.findFirst({
      where: { customer: o.customer, styleId },
    });
    if (existing) continue;

    const count = await db.prodOrder.count();
    await db.prodOrder.create({
      data: {
        orderNumber: `ORD-${String(count + 1).padStart(4, "0")}`,
        styleId,
        quantity: o.quantity,
        customer: o.customer,
        dueDate: new Date(o.dueDate + "T00:00:00Z"),
      },
    });
  }
  console.log(`    ✓ ${ordersToCreate.length} production orders`);

  console.log("\n✅ Phase 2 seed complete.");
  console.log("\nYou can now:");
  console.log("  • /materials       — view stock levels");
  console.log("  • /production      — view orders and start cutting");
  console.log("  • /production/styles — view styles and BOM");
  console.log("  • /cutting/new     — record a cut job");
  console.log("  • /production/bundles — live bundle board");
}

main()
  .catch((e) => { console.error("❌ Phase 2 seed failed:", e); process.exit(1); })
  .finally(() => db.$disconnect());
