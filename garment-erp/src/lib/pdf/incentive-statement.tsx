/**
 * Incentive statement PDF — built with @react-pdf/renderer.
 *
 * Layout matches incentive_v4.pdf:
 *   Header: title, period dates, payment day
 *   Table:  serial | name | dept | rate | + | − | mistakes | calculated | payable | signature
 *   Footer: totals row + formula note
 *
 * Ethiopic text is rendered via a fallback font declaration.
 * If the font file is not present, text renders as boxes — acceptable
 * for development; embed NotoSansEthiopic-Regular.ttf before production.
 */

import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import { am } from "@/lib/i18n/am";
import path from "path";

// Register Ethiopic font — font file must be placed at public/fonts/NotoSansEthiopic-Regular.ttf
// Falls back gracefully if file is missing.
try {
  Font.register({
    family: "NotoEthiopic",
    src: path.join(process.cwd(), "public", "fonts", "NotoSansEthiopic-Regular.ttf"),
  });
} catch {
  // Font file not present — text will render without Ethiopic glyphs
}

const FONT = "NotoEthiopic";

const styles = StyleSheet.create({
  page:      { fontFamily: FONT, fontSize: 8, padding: 28, color: "#1a1a1a" },
  header:    { marginBottom: 12 },
  title:     { fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 4 },
  subtitle:  { fontSize: 9,  textAlign: "center", color: "#555", marginBottom: 2 },
  formula:   { fontSize: 7,  textAlign: "center", color: "#888", marginBottom: 10, fontStyle: "italic" },

  table:     { width: "100%" },
  thead:     { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "1pt solid #d1d5db" },
  trow:      { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb" },
  trowAlt:   { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb", backgroundColor: "#fafafa" },
  tfoot:     { flexDirection: "row", backgroundColor: "#eff6ff", borderTop: "1pt solid #93c5fd", marginTop: 2 },

  // Column widths (must total 100%)
  cSerial:   { width: "4%",  textAlign: "center", padding: "3pt 2pt" },
  cName:     { width: "16%", padding: "3pt 4pt" },
  cDept:     { width: "14%", padding: "3pt 4pt", color: "#555" },
  cRate:     { width: "8%",  textAlign: "center", padding: "3pt 2pt" },
  cPlus:     { width: "8%",  textAlign: "center", padding: "3pt 2pt" },
  cMinus:    { width: "8%",  textAlign: "center", padding: "3pt 2pt" },
  cMistakes: { width: "7%",  textAlign: "center", padding: "3pt 2pt" },
  cCalc:     { width: "12%", textAlign: "right",  padding: "3pt 4pt" },
  cPay:      { width: "12%", textAlign: "right",  padding: "3pt 4pt", fontWeight: "bold" },
  cSig:      { width: "11%", padding: "3pt 4pt" },

  totalLabel: { fontWeight: "bold" },
  negative:   { color: "#dc2626" },
  positive:   { color: "#059669" },
  suspended:  { color: "#9ca3af" },
  note:       { fontSize: 7, color: "#6b7280", marginTop: 10, textAlign: "center" },
});

export interface PdfIncentiveLine {
  serial:        number;
  nameAm:        string;
  deptNameAm:    string;
  ratePerPiece:  string;
  plusPieces:    number;
  minusPieces:   number;
  mistakes:      number;
  calculated:    string;
  payable:       string;
  isSuspended:   boolean;
}

export interface IncentiveStatementPdfProps {
  periodLabel:   string;  // e.g. "ኢንሴንቲቭ ክፍያ — ቀን 4"
  dateRange:     string;  // e.g. "ነሐሴ 20 — መስከረም 4, 2018 ዓ.ም"
  lines:         PdfIncentiveLine[];
  totalCalc:     string;
  totalPay:      string;
}

export function IncentiveStatementPdf({
  periodLabel, dateRange, lines, totalCalc, totalPay,
}: IncentiveStatementPdfProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{periodLabel}</Text>
          <Text style={styles.subtitle}>{dateRange}</Text>
          <Text style={styles.formula}>{am.incentive.formula}</Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Head */}
          <View style={styles.thead}>
            <Text style={styles.cSerial}>{am.serialNumber}</Text>
            <Text style={styles.cName}>{am.employees.name}</Text>
            <Text style={styles.cDept}>{am.employees.department}</Text>
            <Text style={styles.cRate}>{am.incentive.rate}</Text>
            <Text style={styles.cPlus}>{am.incentive.plusPieces}</Text>
            <Text style={styles.cMinus}>{am.incentive.minusPieces}</Text>
            <Text style={styles.cMistakes}>{am.counts.mistakes}</Text>
            <Text style={styles.cCalc}>{am.incentive.calculated}</Text>
            <Text style={styles.cPay}>{am.incentive.payable}</Text>
            <Text style={styles.cSig}>{am.signature}</Text>
          </View>

          {/* Rows */}
          {lines.map((line, idx) => {
            const calc = parseFloat(line.calculated);
            const pay  = parseFloat(line.payable);
            const rowStyle = idx % 2 === 0 ? styles.trow : styles.trowAlt;
            return (
              <View key={idx} style={rowStyle}>
                <Text style={styles.cSerial}>{line.serial}</Text>
                <Text style={styles.cName}>{line.nameAm}</Text>
                <Text style={styles.cDept}>{line.deptNameAm}</Text>
                <Text style={styles.cRate}>{parseFloat(line.ratePerPiece).toFixed(2)}</Text>
                <Text style={[styles.cPlus,  line.plusPieces  > 0 ? styles.positive : {}]}>
                  {line.plusPieces  > 0 ? `+${line.plusPieces}`  : "—"}
                </Text>
                <Text style={[styles.cMinus, line.minusPieces > 0 ? styles.negative : {}]}>
                  {line.minusPieces > 0 ? `−${line.minusPieces}` : "—"}
                </Text>
                <Text style={styles.cMistakes}>
                  {line.mistakes > 0 ? String(line.mistakes) : "—"}
                </Text>
                <Text style={[styles.cCalc, calc < 0 ? styles.negative : {}]}>
                  {calc.toFixed(2)}
                </Text>
                <Text style={[styles.cPay, line.isSuspended ? styles.suspended : pay > 0 ? styles.positive : {}]}>
                  {line.isSuspended ? am.incentive.suspended : pay.toFixed(2)}
                </Text>
                <Text style={styles.cSig}></Text>
              </View>
            );
          })}

          {/* Footer totals */}
          <View style={styles.tfoot}>
            <Text style={[styles.cSerial, styles.totalLabel]}></Text>
            <Text style={[{ ...styles.cName, width: "38%" }, styles.totalLabel]}>{am.total}</Text>
            <Text style={[styles.cRate]}></Text>
            <Text style={[styles.cPlus]}></Text>
            <Text style={[styles.cMinus]}></Text>
            <Text style={[styles.cMistakes]}></Text>
            <Text style={[styles.cCalc, styles.totalLabel,
              parseFloat(totalCalc) < 0 ? styles.negative : {}]}>
              {parseFloat(totalCalc).toFixed(2)}
            </Text>
            <Text style={[styles.cPay, styles.totalLabel, styles.positive]}>
              {parseFloat(totalPay).toFixed(2)}
            </Text>
            <Text style={styles.cSig}></Text>
          </View>
        </View>

        <Text style={styles.note}>{am.incentive.payableRule}</Text>
      </Page>
    </Document>
  );
}
