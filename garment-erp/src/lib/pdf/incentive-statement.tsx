/**
 * Incentive statement PDF — built with @react-pdf/renderer.
 *
 * Layout matches incentive_v4.pdf:
 *   Header: title, period dates, payment day
 *   Table:  serial | name | dept | rate | + | − | mistakes | calculated | payable | signature
 *   Footer: totals row + formula note
 */

import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import { am } from "@/lib/i18n/am";
import path from "path";

// Register Ethiopic font
try {
  Font.register({
    family: "NotoEthiopic",
    src: path.join(process.cwd(), "public", "fonts", "NotoSansEthiopic-Regular.ttf"),
  });
} catch {
  // Font file not present — text renders without Ethiopic glyphs
}

const FONT = "NotoEthiopic";

const s = StyleSheet.create({
  page:       { fontFamily: FONT, fontSize: 8, padding: 28, color: "#1a1a1a" },
  header:     { marginBottom: 12 },
  title:      { fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 4 },
  subtitle:   { fontSize: 9,  textAlign: "center", color: "#555", marginBottom: 2 },
  formula:    { fontSize: 7,  textAlign: "center", color: "#888", marginBottom: 10 },
  table:      { width: "100%" },
  thead:      { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "1pt solid #d1d5db" },
  trow:       { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb" },
  trowAlt:    { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb", backgroundColor: "#fafafa" },
  tfoot:      { flexDirection: "row", backgroundColor: "#eff6ff", borderTop: "1pt solid #93c5fd", marginTop: 2 },
  // columns
  cSerial:    { width: "4%",  textAlign: "center", padding: "3pt 2pt" },
  cName:      { width: "16%", padding: "3pt 4pt" },
  cNameWide:  { width: "38%", padding: "3pt 4pt" },
  cDept:      { width: "14%", padding: "3pt 4pt", color: "#555" },
  cRate:      { width: "8%",  textAlign: "center", padding: "3pt 2pt" },
  cPlus:      { width: "8%",  textAlign: "center", padding: "3pt 2pt" },
  cPlusPos:   { width: "8%",  textAlign: "center", padding: "3pt 2pt", color: "#059669" },
  cMinus:     { width: "8%",  textAlign: "center", padding: "3pt 2pt" },
  cMinusNeg:  { width: "8%",  textAlign: "center", padding: "3pt 2pt", color: "#dc2626" },
  cMistakes:  { width: "7%",  textAlign: "center", padding: "3pt 2pt" },
  cCalc:      { width: "12%", textAlign: "right",  padding: "3pt 4pt" },
  cCalcNeg:   { width: "12%", textAlign: "right",  padding: "3pt 4pt", color: "#dc2626" },
  cCalcBold:  { width: "12%", textAlign: "right",  padding: "3pt 4pt", fontWeight: "bold" },
  cCalcBoldN: { width: "12%", textAlign: "right",  padding: "3pt 4pt", fontWeight: "bold", color: "#dc2626" },
  cPay:       { width: "12%", textAlign: "right",  padding: "3pt 4pt", fontWeight: "bold" },
  cPayPos:    { width: "12%", textAlign: "right",  padding: "3pt 4pt", fontWeight: "bold", color: "#059669" },
  cPaySusp:   { width: "12%", textAlign: "right",  padding: "3pt 4pt", fontWeight: "bold", color: "#9ca3af" },
  cPayBoldPos:{ width: "12%", textAlign: "right",  padding: "3pt 4pt", fontWeight: "bold", color: "#059669" },
  cSig:       { width: "11%", padding: "3pt 4pt" },
  note:       { fontSize: 7,  color: "#6b7280", marginTop: 10, textAlign: "center" },
});

export interface PdfIncentiveLine {
  serial:       number;
  nameAm:       string;
  deptNameAm:   string;
  ratePerPiece: string;
  plusPieces:   number;
  minusPieces:  number;
  mistakes:     number;
  calculated:   string;
  payable:      string;
  isSuspended:  boolean;
}

export interface IncentiveStatementPdfProps {
  periodLabel: string;
  dateRange:   string;
  lines:       PdfIncentiveLine[];
  totalCalc:   string;
  totalPay:    string;
}

export function IncentiveStatementPdf({
  periodLabel, dateRange, lines, totalCalc, totalPay,
}: IncentiveStatementPdfProps) {
  const totalCalcNum = parseFloat(totalCalc);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{periodLabel}</Text>
          <Text style={s.subtitle}>{dateRange}</Text>
          <Text style={s.formula}>{am.incentive.formula}</Text>
        </View>

        {/* Table */}
        <View style={s.table}>
          {/* Head */}
          <View style={s.thead}>
            <Text style={s.cSerial}>{am.serialNumber}</Text>
            <Text style={s.cName}>{am.employees.name}</Text>
            <Text style={s.cDept}>{am.employees.department}</Text>
            <Text style={s.cRate}>{am.incentive.rate}</Text>
            <Text style={s.cPlus}>{am.incentive.plusPieces}</Text>
            <Text style={s.cMinus}>{am.incentive.minusPieces}</Text>
            <Text style={s.cMistakes}>{am.counts.mistakes}</Text>
            <Text style={s.cCalc}>{am.incentive.calculated}</Text>
            <Text style={s.cPay}>{am.incentive.payable}</Text>
            <Text style={s.cSig}>{am.signature}</Text>
          </View>

          {/* Data rows — no array styles, no object spreads */}
          {lines.map((line, idx) => {
            const calc = parseFloat(line.calculated);
            const pay  = parseFloat(line.payable);
            const rowStyle = idx % 2 === 0 ? s.trow : s.trowAlt;

            // Pick pre-defined styles based on conditions
            const plusStyle    = line.plusPieces  > 0 ? s.cPlusPos    : s.cPlus;
            const minusStyle   = line.minusPieces > 0 ? s.cMinusNeg   : s.cMinus;
            const calcStyle    = calc < 0          ? s.cCalcNeg    : s.cCalc;
            const payStyle     = line.isSuspended  ? s.cPaySusp
                                 : pay > 0         ? s.cPayPos     : s.cPay;

            return (
              <View key={String(idx)} style={rowStyle}>
                <Text style={s.cSerial}>{String(line.serial)}</Text>
                <Text style={s.cName}>{line.nameAm}</Text>
                <Text style={s.cDept}>{line.deptNameAm}</Text>
                <Text style={s.cRate}>{parseFloat(line.ratePerPiece).toFixed(2)}</Text>
                <Text style={plusStyle}>
                  {line.plusPieces > 0 ? String(line.plusPieces) : "—"}
                </Text>
                <Text style={minusStyle}>
                  {line.minusPieces > 0 ? String(line.minusPieces) : "—"}
                </Text>
                <Text style={s.cMistakes}>
                  {line.mistakes > 0 ? String(line.mistakes) : "—"}
                </Text>
                <Text style={calcStyle}>{calc.toFixed(2)}</Text>
                <Text style={payStyle}>
                  {line.isSuspended ? am.incentive.suspended : pay.toFixed(2)}
                </Text>
                <Text style={s.cSig}>{""}</Text>
              </View>
            );
          })}

          {/* Footer totals */}
          <View style={s.tfoot}>
            <Text style={s.cSerial}>{""}</Text>
            <Text style={s.cNameWide}>{am.total}</Text>
            <Text style={s.cRate}>{""}</Text>
            <Text style={s.cPlus}>{""}</Text>
            <Text style={s.cMinus}>{""}</Text>
            <Text style={s.cMistakes}>{""}</Text>
            <Text style={totalCalcNum < 0 ? s.cCalcBoldN : s.cCalcBold}>
              {totalCalcNum.toFixed(2)}
            </Text>
            <Text style={s.cPayBoldPos}>{parseFloat(totalPay).toFixed(2)}</Text>
            <Text style={s.cSig}>{""}</Text>
          </View>
        </View>

        <Text style={s.note}>{am.incentive.payableRule}</Text>
      </Page>
    </Document>
  );
}
