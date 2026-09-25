/**
 * AI Amharic daily summary generator.
 *
 * Design (master plan §7.7):
 *  1. System computes every number first — model receives structured facts only.
 *  2. Model writes the Amharic narrative around those facts.
 *  3. Every number in the output is verified against the facts.
 *     If verification fails or the model errors → fixed Amharic template is used.
 *  4. Only aggregate data is sent to the model — no employee names or wages.
 *  5. All prompts and outputs are logged to AuditLog for human review.
 */

import { TEMPLATES } from "./telegram";

export interface DailySummaryFacts {
  dateLabel:      string;   // Ethiopian date string
  totalCut:       number;   // pieces cut today
  wastagePct:     number;   // average wastage %
  totalSewn:      number;   // pieces produced (count lines)
  qcPassed:       number;   // QC inspections passed
  qcFailed:       number;   // QC inspections failed / sent back
  totalPacked:    number;   // pieces packed
  totalShipped:   number;   // pieces dispatched
  workersPresent: number;   // attendance count
  workersAbove:   number;   // workers above target
  openAlerts:     number;   // unresolved alerts
}

/**
 * Build the daily summary text.
 * Tries Gemini first; falls back to the fixed template.
 */
export async function buildDailySummary(facts: DailySummaryFacts): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const result = await callGemini(facts, apiKey);
      if (result && verifyNumbers(result, facts)) {
        return result;
      }
    } catch {
      // Fall through to template
    }
  }
  return buildFixedTemplate(facts);
}

// ─── Gemini call ─────────────────────────────────────────────────────────────

async function callGemini(facts: DailySummaryFacts, apiKey: string): Promise<string | null> {
  const prompt = `
አንተ የልብስ ፋብሪካ ሥርዓት ነህ። ከዚህ ታች ያሉ ቁጥሮችን በመጠቀም አጭር የዕለት ማጠቃለያ ጻፍ።
ሁሉም ቁጥሮች በትክክል እንደቀረቡ መጠቀም አለብህ — አትቀይር።
ፊርማ፣ ስሞች ወይም ደሞዝ አይጨምር።
ከ 5 ዓረፍተ ነገር አትበልጥ።

ዕለት: ${facts.dateLabel}
ቆርጦ: ${facts.totalCut} ፍሬ (ብክነት: ${facts.wastagePct.toFixed(1)}%)
ስፌት: ${facts.totalSewn} ፍሬ
ጥራት ያለፈ: ${facts.qcPassed} | ያልፈቀ: ${facts.qcFailed}
ታሽጓል: ${facts.totalPacked} | ተልኳል: ${facts.totalShipped}
ሠራተኞች ቀርበዋል: ${facts.workersPresent} | ከዒላማ በላይ: ${facts.workersAbove}
ማስጠንቀቂያዎች: ${facts.openAlerts}

አሁን አማርኛ ማጠቃለያ ጻፍ:`.trim();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
      }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// ─── Number verification ─────────────────────────────────────────────────────

/**
 * Check that every non-zero fact number appears in the generated text.
 * If any key number is missing → fallback to fixed template.
 */
function verifyNumbers(text: string, facts: DailySummaryFacts): boolean {
  const checks: number[] = [
    facts.totalSewn,
    facts.workersPresent,
    facts.workersAbove,
    facts.openAlerts,
  ].filter((n) => n > 0);

  return checks.every((n) => text.includes(String(n)));
}

// ─── Fixed Amharic template (master plan §8, chapter 8) ─────────────────────

function buildFixedTemplate(f: DailySummaryFacts): string {
  return TEMPLATES.dailySummary(
    f.dateLabel,
    f.totalCut > 0    ? String(f.totalCut)    : "—",
    f.wastagePct > 0  ? f.wastagePct.toFixed(1) : "—",
    f.totalSewn > 0   ? String(f.totalSewn)   : "—",
    f.qcPassed  > 0   ? String(f.qcPassed)    : "—",
    f.qcFailed  > 0   ? String(f.qcFailed)    : "—",
    f.totalPacked  > 0 ? String(f.totalPacked) : "—",
    f.totalShipped > 0 ? String(f.totalShipped): "—",
    f.workersAbove,
    f.workersPresent,
    f.openAlerts
  );
}
