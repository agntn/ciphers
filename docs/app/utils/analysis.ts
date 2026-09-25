import { analyzeFrequency, create, type FrequencyLanguage } from "@agntn/ciphers";

export interface BruteRow {
  shift: number;
  text: string;
}

/**
 * All 25 Caesar shifts, the way `ciphers brute` and `cipher_brute_caesar` list them: best letter
 * fit to the language first, ties in shift order.
 */
export function bruteRows(text: string, language: FrequencyLanguage = "en"): BruteRow[] {
  const caesar = create("caesar");
  return Array.from({ length: 25 }, (_, i) => {
    const decoded = caesar.decode(text, { shift: i + 1 }).text;
    return { shift: i + 1, text: decoded, fit: analyzeFrequency(decoded, language)?.fit ?? 0 };
  })
    .sort((left, right) => right.fit - left.fit)
    .map(({ shift, text: decoded }) => ({ shift, text: decoded }));
}

export interface FrequencyBar {
  letter: string;
  count: number;
  /** Width as a percentage of the most frequent letter. */
  width: number;
}

export interface FrequencyView {
  total: number;
  ic?: number;
  /** Index of coincidence of plaintext in the chosen language. */
  referenceIc: number;
  bars: FrequencyBar[];
  expected: string;
  actual: string;
}

/** A histogram ready to draw, at most `limit` letters. Undefined when the text has no letters. */
export function frequencyView(
  text: string,
  language: FrequencyLanguage = "en",
  limit = 26,
): FrequencyView | undefined {
  const analysis = analyzeFrequency(text, language);
  if (!analysis) {
    return undefined;
  }
  const rows = analysis.counts.slice(0, limit);
  const max = rows[0]?.[1] ?? 1;
  return {
    total: analysis.total,
    ic: analysis.ic,
    referenceIc: analysis.referenceIc,
    bars: rows.map(([letter, count]) => ({ letter, count, width: Math.round((count / max) * 100) })),
    expected: analysis.reference.slice(0, limit),
    actual: rows.map(([letter]) => letter).join(""),
  };
}
