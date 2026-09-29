/**
 * Daily production sheet PDF.
 * Rules for @react-pdf/renderer compatibility:
 *  - NO array styles: style={[a, b]} — use flat named styles only
 *  - NO object spread in style: style={{ ...a, width: "x" }}
 *  - All <Text> children must be strings/numbers — never undefined/null/JSX
 *  - Every conditional renders to a string, never to a React element
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
} catch { /* font file not present */ }

const FONT = "NotoEthiopic";

const s = StyleSheet.create({
  page:      { fontFamily: FONT, fontSize: 8, padding: 24, color: "#1a1a1a" },
  headerRow: { marginBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  headerL:   { flexDirection: "column" },
  headerR:   { flexDirection: "column", alignItems: "flex-end" },
  title:     { fontSize: 12, fontWeight: "bold" },
  meta:      { fontSize: 7, color: "#666" },

  table:     { width: "100%" },
  thead:     { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "1pt solid #d1d5db" },
  trow:      { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb" },
  trowAlt:   { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb", backgroundColor: "#fafafa" },
  tfoot:     { flexDirection: "row", backgroundColor: "#eff6ff", borderTop: "1pt solid #93c5fd", marginTop: 2 },

  // column base styles
  cSerial:   { width: "4%",  textAlign: "center", padding: "3pt 2pt" },
  cName:     { width: "18%", padding: "3pt 4pt" },
  cNameWide: { width: "44%", padding: "3pt 4pt" },
  cOp:       { width: "16%", padding: "3pt 4pt", color: "#555" },
  cMachine:  { width: "10%", padding: "3pt 4pt", color: "#777" },
  cTarget:   { width: "10%", textAlign: "center", padding: "3pt 2pt" },
  cProd:     { width: "10%", textAlign: "center", padding: "3pt 2pt" },
  cProdBold: { width: "10%", textAlign: "center", padding: "3pt 2pt", fontWeight: "bold" },
  cDiff:     { width: "9%",  textAlign: "center", padding: "3pt 2pt" },
  cDiffPos:  { width: "9%",  textAlign: "center", padding: "3pt 2pt", color: "#059669" },
  cDiffNeg:  { width: "9%",  textAlign: "center", padding: "3pt 2pt", color: "#dc2626" },
  cPct:      { width: "9%",  textAlign: "center", padding: "3pt 2pt" },
  cPctPos:   { width: "9%",  textAlign: "center", padding: "3pt 2pt", color: "#059669" },
  cPctNeg:   { width: "9%",  textAlign: "center", padding: "3pt 2pt", color: "#dc2626" },
  cSig:      { width: "14%", padding: "3pt 4pt" },

  footer:    { fontSize: 7, color: "#6b7280", marginTop: 10, textAlign: "right" },
});

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

export interface DailyProductionSheetPdfProps {
  dateLabel:      string;
  supervisorName: string;
  shift:          string;
  rows:           PdfProductionRow[];
  totalProduced:  number;
  aboveTarget:    number;
  totalWorkers:   number;
}

export function DailyProductionSheetPdf({
  dateLabel, supervisorName, shift, rows,
  totalProduced, aboveTarget, totalWorkers,
}: DailyProductionSheetPdfProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>

        {/* Header */}
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

        {/* Table */}
        <View style={s.table}>
          {/* Head row */}
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
            const diff    = row.plusPieces > 0 ? row.plusPieces : -row.minusPieces;
            const isAbove = diff >= 0;
            const abovePct = row.percentOfTarget >= 100;

            return (
              <View key={String(idx)} style={idx % 2 === 0 ? s.trow : s.trowAlt}>
                <Text style={s.cSerial}>{String(row.serial)}</Text>
                <Text style={s.cName}>{row.nameAm}</Text>
                <Text style={s.cOp}>{row.operationAm}</Text>
                <Text style={s.cMachine}>{row.machineType}</Text>
                <Text style={s.cTarget}>{row.targetPerDay > 0 ? String(row.targetPerDay) : "—"}</Text>
                <Text style={s.cProdBold}>{String(row.produced)}</Text>
                <Text style={isAbove ? s.cDiffPos : s.cDiffNeg}>
                  {diff > 0 ? `+${diff}` : diff < 0 ? String(diff) : "—"}
                </Text>
                <Text style={abovePct ? s.cPctPos : s.cPctNeg}>
                  {row.targetPerDay > 0 ? `${row.percentOfTarget}%` : "—"}
                </Text>
                <Text style={s.cSig}>{""}</Text>
              </View>
            );
          })}

          {/* Footer totals */}
          <View style={s.tfoot}>
            <Text style={s.cSerial}>{""}</Text>
            <Text style={s.cNameWide}>{am.total}</Text>
            <Text style={s.cTarget}>{""}</Text>
            <Text style={s.cProdBold}>{totalProduced.toLocaleString()}</Text>
            <Text style={s.cDiff}>{""}</Text>
            <Text style={s.cPct}>
              {totalWorkers > 0 ? `${aboveTarget}/${totalWorkers}` : ""}
            </Text>
            <Text style={s.cSig}>{""}</Text>
          </View>
        </View>

        <Text style={s.footer}>
          {"ዒላማ = በሰዓት ዒላማ × 8 ሰዓቶች  |  ልዩነት = ያደረሱ − ዒላማ"}
        </Text>
      </Page>
    </Document>
  );
}
