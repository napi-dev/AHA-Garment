/**
 * Daily production sheet PDF — matches salary_schedule.pdf layout (without pay columns).
 * Columns: serial | name | operation | machine | target/day | produced | +/- | % | signature
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

const styles = StyleSheet.create({
  page:     { fontFamily: FONT, fontSize: 8, padding: 24, color: "#1a1a1a" },
  header:   { marginBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  title:    { fontSize: 12, fontWeight: "bold" },
  meta:     { fontSize: 7, color: "#666" },

  table:    { width: "100%" },
  thead:    { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "1pt solid #d1d5db" },
  trow:     { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb" },
  trowAlt:  { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb", backgroundColor: "#fafafa" },
  tfoot:    { flexDirection: "row", backgroundColor: "#eff6ff", borderTop: "1pt solid #93c5fd", marginTop: 2 },

  cSerial:  { width: "4%",  textAlign: "center", padding: "3pt 2pt" },
  cName:    { width: "18%", padding: "3pt 4pt" },
  cOp:      { width: "16%", padding: "3pt 4pt", color: "#555" },
  cMachine: { width: "10%", padding: "3pt 4pt", color: "#777" },
  cTarget:  { width: "10%", textAlign: "center", padding: "3pt 2pt" },
  cProd:    { width: "10%", textAlign: "center", padding: "3pt 2pt", fontWeight: "bold" },
  cDiff:    { width: "9%",  textAlign: "center", padding: "3pt 2pt" },
  cPct:     { width: "9%",  textAlign: "center", padding: "3pt 2pt" },
  cSig:     { width: "14%", padding: "3pt 4pt" },

  positive: { color: "#059669" },
  negative: { color: "#dc2626" },
  boldLabel: { fontWeight: "bold" },
  footer:   { fontSize: 7, color: "#6b7280", marginTop: 10, textAlign: "right" },
});

export interface PdfProductionRow {
  serial:        number;
  nameAm:        string;
  operationAm:   string;
  machineType:   string;
  targetPerDay:  number;
  produced:      number;
  plusPieces:    number;
  minusPieces:   number;
  percentOfTarget: number;
}

export interface DailyProductionSheetPdfProps {
  dateLabel:      string;   // Ethiopian date string
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
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>የሠራተኞች ዕለታዊ ምርት ሰሌዳ</Text>
            <Text style={styles.meta}>ቀን: {dateLabel}  |  ሺፍት: {shift}  |  ሱፐርቫይዘር: {supervisorName}</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={styles.meta}>ጠቅላላ ያደረሱ: {totalProduced.toLocaleString()}</Text>
            <Text style={styles.meta}>ከዒላማ በላይ: {aboveTarget} / {totalWorkers}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={styles.cSerial}>{am.serialNumber}</Text>
            <Text style={styles.cName}>{am.employees.name}</Text>
            <Text style={styles.cOp}>ሥራ</Text>
            <Text style={styles.cMachine}>ማሽን</Text>
            <Text style={styles.cTarget}>{am.counts.dayTarget}</Text>
            <Text style={styles.cProd}>{am.counts.totalProduced}</Text>
            <Text style={styles.cDiff}>{am.counts.difference}</Text>
            <Text style={styles.cPct}>%</Text>
            <Text style={styles.cSig}>{am.signature}</Text>
          </View>

          {rows.map((row, idx) => {
            const diff = row.plusPieces > 0 ? row.plusPieces : -row.minusPieces;
            const isAbove = diff >= 0;
            return (
              <View key={idx} style={idx % 2 === 0 ? styles.trow : styles.trowAlt}>
                <Text style={styles.cSerial}>{row.serial}</Text>
                <Text style={styles.cName}>{row.nameAm}</Text>
                <Text style={styles.cOp}>{row.operationAm}</Text>
                <Text style={styles.cMachine}>{row.machineType}</Text>
                <Text style={styles.cTarget}>{row.targetPerDay > 0 ? row.targetPerDay : "—"}</Text>
                <Text style={[styles.cProd, styles.boldLabel]}>{row.produced}</Text>
                <Text style={[styles.cDiff, isAbove ? styles.positive : styles.negative]}>
                  {diff > 0 ? `+${diff}` : diff < 0 ? String(diff) : "—"}
                </Text>
                <Text style={[styles.cPct, row.percentOfTarget >= 100 ? styles.positive : styles.negative]}>
                  {row.targetPerDay > 0 ? `${row.percentOfTarget}%` : "—"}
                </Text>
                <Text style={styles.cSig}></Text>
              </View>
            );
          })}

          {/* Footer */}
          <View style={styles.tfoot}>
            <Text style={[styles.cSerial]}></Text>
            <Text style={[{ ...styles.cName, width: "44%" }, styles.boldLabel]}>{am.total}</Text>
            <Text style={[styles.cTarget]}></Text>
            <Text style={[styles.cProd, styles.boldLabel]}>{totalProduced.toLocaleString()}</Text>
            <Text style={styles.cDiff}></Text>
            <Text style={styles.cPct}>{totalWorkers > 0 ? `${aboveTarget}/${totalWorkers}` : ""}</Text>
            <Text style={styles.cSig}></Text>
          </View>
        </View>

        <Text style={styles.footer}>
          ዒላማ = በሰዓት ዒላማ × 8 ሰዓቶች  |  ልዩነት = ያደረሱ − ዒላማ  |  ዳሳ ቁጥር ፍሬዎች አልተቆጠሩም
        </Text>
      </Page>
    </Document>
  );
}
