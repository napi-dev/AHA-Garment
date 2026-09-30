/**
 * Daily production sheet PDF — two pages:
 *   Page 1: Production table (landscape A4)
 *   Page 2: Today's audit log (portrait A4)
 *
 * @react-pdf/renderer rules enforced:
 *  - No array styles, no object spreads in style
 *  - All <Text> children are plain strings — never undefined/null/JSX
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { am } from "@/lib/i18n/am";
import path from "path";

try {
  Font.register({
    family: "NotoEthiopic",
    src: path.join(process.cwd(), "public", "fonts", "NotoSansEthiopic-Regular.ttf"),
  });
} catch { /* font file not present — renders without Ethiopic glyphs */ }

const FONT = "NotoEthiopic";

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Shared
  page:        { fontFamily: FONT, fontSize: 8, padding: 24, color: "#1a1a1a" },
  pagePort:    { fontFamily: FONT, fontSize: 8, padding: 28, color: "#1a1a1a" },

  // Production page header
  headerRow:   { marginBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  headerL:     { flexDirection: "column" },
  headerR:     { flexDirection: "column", alignItems: "flex-end" },
  title:       { fontSize: 12, fontWeight: "bold" },
  meta:        { fontSize: 7, color: "#666" },

  // Production table
  table:       { width: "100%" },
  thead:       { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "1pt solid #d1d5db" },
  trow:        { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb" },
  trowAlt:     { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb", backgroundColor: "#fafafa" },
  tfoot:       { flexDirection: "row", backgroundColor: "#eff6ff", borderTop: "1pt solid #93c5fd", marginTop: 2 },

  cSerial:     { width: "4%",  textAlign: "center", padding: "3pt 2pt" },
  cName:       { width: "18%", padding: "3pt 4pt" },
  cNameWide:   { width: "44%", padding: "3pt 4pt" },
  cOp:         { width: "16%", padding: "3pt 4pt", color: "#555" },
  cMachine:    { width: "10%", padding: "3pt 4pt", color: "#777" },
  cTarget:     { width: "10%", textAlign: "center", padding: "3pt 2pt" },
  cProd:       { width: "10%", textAlign: "center", padding: "3pt 2pt" },
  cProdBold:   { width: "10%", textAlign: "center", padding: "3pt 2pt", fontWeight: "bold" },
  cDiff:       { width: "9%",  textAlign: "center", padding: "3pt 2pt" },
  cDiffPos:    { width: "9%",  textAlign: "center", padding: "3pt 2pt", color: "#059669" },
  cDiffNeg:    { width: "9%",  textAlign: "center", padding: "3pt 2pt", color: "#dc2626" },
  cPct:        { width: "9%",  textAlign: "center", padding: "3pt 2pt" },
  cPctPos:     { width: "9%",  textAlign: "center", padding: "3pt 2pt", color: "#059669" },
  cPctNeg:     { width: "9%",  textAlign: "center", padding: "3pt 2pt", color: "#dc2626" },
  cSig:        { width: "14%", padding: "3pt 4pt" },

  footer:      { fontSize: 7, color: "#6b7280", marginTop: 10, textAlign: "right" },

  // Audit log page
  auditTitle:  { fontSize: 11, fontWeight: "bold", marginBottom: 6 },
  auditMeta:   { fontSize: 7, color: "#666", marginBottom: 10 },
  auditTable:  { width: "100%" },
  auditHead:   { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "1pt solid #d1d5db" },
  auditRow:    { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb" },
  auditRowAlt: { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb", backgroundColor: "#fafafa" },

  aTime:       { width: "14%", padding: "3pt 4pt", fontSize: 7, color: "#555" },
  aUser:       { width: "12%", padding: "3pt 4pt", fontSize: 7, fontWeight: "bold" },
  aAction:     { width: "28%", padding: "3pt 4pt" },
  aEntity:     { width: "20%", padding: "3pt 4pt", color: "#555", fontSize: 7 },
  aReason:     { width: "26%", padding: "3pt 4pt", color: "#555", fontSize: 7 },

  noAudit:     { padding: "12pt 4pt", color: "#9ca3af", textAlign: "center", fontSize: 8 },
  pageNum:     { fontSize: 7, color: "#9ca3af", textAlign: "right", marginTop: 8 },
});

// ─── Human-readable action labels ─────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  SAVE_HOURLY_COUNT:        "ቁጥር ገባ",
  VERIFY_COUNT:             "ቁጥር ተረጋገጠ",
  CLOSE_DAY:                "ቀን ተዘጋ",
  CLOSE_INCENTIVE_PERIOD:   "ወቅት ተጠናቀቀ",
  APPROVE_INCENTIVE_PERIOD: "ወቅት ፀደቀ",
  SET_SALARY:               "ደሞዝ ተቀየረ",
  APPROVE_SALARY_SCHEDULE:  "ደሞዝ ሰሌዳ ፀደቀ",
  CREATE_EMPLOYEE:          "ሠራተኛ ተጨመረ",
  UPDATE_EMPLOYEE:          "ሠራተኛ ተስተካከለ",
  DELETE_EMPLOYEE:          "ሠራተኛ ተሰረዘ",
  RECORD_OFFENCE:           "ጥፋት ሰነድ ሆነ",
  LIFT_SUSPENSION:          "ታግዱ ተነሳ",
  SAVE_ATTENDANCE:          "መገኘት ተቀመጠ",
  RECEIVE_STOCK:            "ጥሬ ዕቃ ገባ",
  ISSUE_STOCK:              "ጥሬ ዕቃ ወጣ",
  UPDATE_SETTING:           "ቅንብር ተቀየረ",
  SET_DATE_OVERRIDE:        "ቀን ተስተካከለ",
  CREATE_USER:              "ተጠቃሚ ተፈጠረ",
  UPDATE_USER:              "ተጠቃሚ ተቀየረ",
  RESET_PIN:                "ፒን ተቀየረ",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfProductionRow {
  serial:          number;
  nameAm:          string;
  operationAm:     string;
  machineType:     string;
  targetPerDay:    number;
  produced:        number;
  plusPieces:      number;
  minusPieces:     number;
  percentOfTarget: number;
}

export interface PdfAuditRow {
  time:       string;   // "14:32"
  userCode:   string;   // "MGR-001"
  action:     string;   // raw action key
  entity:     string;   // "Employee", "SalaryRecord", …
  entityId:   string;
  reason:     string;
}

export interface DailyProductionSheetPdfProps {
  dateLabel:      string;  // Ethiopian date e.g. "20/1/2019 ዓ.ም"
  dateFilename:   string;  // safe filename e.g. "20-1-2019"
  supervisorName: string;
  shift:          string;
  rows:           PdfProductionRow[];
  totalProduced:  number;
  aboveTarget:    number;
  totalWorkers:   number;
  auditRows:      PdfAuditRow[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DailyProductionSheetPdf({
  dateLabel, supervisorName, shift, rows,
  totalProduced, aboveTarget, totalWorkers, auditRows,
}: DailyProductionSheetPdfProps) {
  return (
    <Document>
      {/* ── PAGE 1: Production table (landscape) ── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.headerRow}>
          <View style={s.headerL}>
            <Text style={s.title}>{"የሠራተኞች ዕለታዊ ምርት ሰሌዳ"}</Text>
            <Text style={s.meta}>{`ቀን: ${dateLabel}  |  ሺፍት: ${shift}  |  ሱፐርቫይዘር: ${supervisorName}`}</Text>
          </View>
          <View style={s.headerR}>
            <Text style={s.meta}>{`ጠቅላላ ያደረሱ: ${totalProduced.toLocaleString()}`}</Text>
            <Text style={s.meta}>{`ከዒላማ በላይ: ${aboveTarget} / ${totalWorkers}`}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.thead}>
            <Text style={s.cSerial}>{am.serialNumber}</Text>
            <Text style={s.cName}>{am.employees.name}</Text>
            <Text style={s.cOp}>{"ሥራ"}</Text>
            <Text style={s.cMachine}>{"ማሽን"}</Text>
            <Text style={s.cTarget}>{am.counts.dayTarget}</Text>
            <Text style={s.cProd}>{am.counts.totalProduced}</Text>
            <Text style={s.cDiff}>{am.counts.difference}</Text>
            <Text style={s.cPct}>{"%"}</Text>
            <Text style={s.cSig}>{am.signature}</Text>
          </View>

          {rows.map((row, idx) => {
            const diff     = row.plusPieces > 0 ? row.plusPieces : -row.minusPieces;
            const isAbove  = diff >= 0;
            const abovePct = row.percentOfTarget >= 100;
            return (
              <View key={String(idx)} style={idx % 2 === 0 ? s.trow : s.trowAlt}>
                <Text style={s.cSerial}>{String(row.serial ?? "—")}</Text>
                <Text style={s.cName}>{row.nameAm ?? "—"}</Text>
                <Text style={s.cOp}>{row.operationAm ?? "—"}</Text>
                <Text style={s.cMachine}>{row.machineType ?? "—"}</Text>
                <Text style={s.cTarget}>{row.targetPerDay > 0 ? String(row.targetPerDay) : "—"}</Text>
                <Text style={s.cProdBold}>{String(row.produced ?? 0)}</Text>
                <Text style={isAbove ? s.cDiffPos : s.cDiffNeg}>
                  {diff > 0 ? `+${diff}` : diff < 0 ? String(diff) : "—"}
                </Text>
                <Text style={abovePct ? s.cPctPos : s.cPctNeg}>
                  {row.targetPerDay > 0 ? `${row.percentOfTarget}%` : "—"}
                </Text>
                <Text style={s.cSig}>{" "}</Text>
              </View>
            );
          })}

          <View style={s.tfoot}>
            <Text style={s.cSerial}>{" "}</Text>
            <Text style={s.cNameWide}>{am.total}</Text>
            <Text style={s.cTarget}>{" "}</Text>
            <Text style={s.cProdBold}>{totalProduced.toLocaleString()}</Text>
            <Text style={s.cDiff}>{" "}</Text>
            <Text style={s.cPct}>{totalWorkers > 0 ? `${aboveTarget}/${totalWorkers}` : "—"}</Text>
            <Text style={s.cSig}>{" "}</Text>
          </View>
        </View>

        <Text style={s.footer}>
          {"ዒላማ = በሰዓት ዒላማ × 8 ሰዓቶች  |  ልዩነት = ያደረሱ − ዒላማ  |  ገጽ 1"}
        </Text>
      </Page>

      {/* ── PAGE 2: Audit log (portrait) ── */}
      <Page size="A4" orientation="portrait" style={s.pagePort}>
        <Text style={s.auditTitle}>{"የዕለት የሥርዓት ምዝገባ (Audit Log)"}</Text>
        <Text style={s.auditMeta}>{`ቀን: ${dateLabel}  |  ጠቅላላ ምዝገቦች: ${auditRows.length}`}</Text>

        <View style={s.auditTable}>
          {/* Head */}
          <View style={s.auditHead}>
            <Text style={s.aTime}>{"ሰዓት"}</Text>
            <Text style={s.aUser}>{"ተጠቃሚ"}</Text>
            <Text style={s.aAction}>{"ድርጊት"}</Text>
            <Text style={s.aEntity}>{"ዓይነት / መለያ"}</Text>
            <Text style={s.aReason}>{"ማብራሪያ"}</Text>
          </View>

          {auditRows.length === 0 && (
            <View style={s.auditRow}>
              <Text style={s.noAudit}>{"ዛሬ ምንም የሥርዓት ምዝገባ አልተካሄደም"}</Text>
            </View>
          )}

          {auditRows.map((row, idx) => (
            <View key={String(idx)} style={idx % 2 === 0 ? s.auditRow : s.auditRowAlt}>
              <Text style={s.aTime}>{row.time ?? "—"}</Text>
              <Text style={s.aUser}>{row.userCode ?? "—"}</Text>
              <Text style={s.aAction}>{ACTION_LABELS[row.action] ?? row.action ?? "—"}</Text>
              <Text style={s.aEntity}>{`${row.entity ?? "—"} / ${(row.entityId ?? "—").slice(0, 10)}`}</Text>
              <Text style={s.aReason}>{row.reason ?? "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={s.pageNum}>{"ገጽ 2  |  ይህ ሰነድ ራስ-ሰር ተዘጋጅቷል"}</Text>
      </Page>
    </Document>
  );
}
