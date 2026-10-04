import {
  InvalidOptionError,
  analyzeFrequency,
  ciphers,
  create,
  estimatePeriod,
  resolveCipher,
} from "@agntn/ciphers";
import {
  bruteForceCaesar,
  formatCipherInfo,
  formatFrequencyAnalysis,
  formatPeriodEstimate,
  rankCaesarShifts,
  transformCipher,
  type CipherToolParams,
} from "#tool-operations";

/** The library as the tool executors take it. The same functions the MCP server and the extensions pass. */
const LIBRARY = {
  InvalidOptionError,
  analyzeFrequency,
  ciphers,
  create,
  estimatePeriod,
  resolveCipher,
};

/** The agent tools. Same names over MCP, Pi and OMP. */
export const TOOLS = [
  "ciphers_encode",
  "ciphers_decode",
  "ciphers_caesar_brute",
  "ciphers_frequency",
  "ciphers_period_estimate",
  "ciphers_family_guess",
  "ciphers_passphrase_probe",
  "ciphers_crib_drag",
  "ciphers_hidden_text_read",
  "ciphers_info",
] as const;

export type ToolName = (typeof TOOLS)[number];

/**
 * The text `ciphers_encode` or `ciphers_decode` hands a model, from the executor the tools run.
 *
 * @param {"encode" | "decode"} operation - Which direction.
 * @param {CipherToolParams} params - The tool arguments.
 * @returns {string} `content[0].text`.
 */
export function transformText(operation: "encode" | "decode", params: CipherToolParams): string {
  return transformCipher(LIBRARY, operation, params).content[0]!.text;
}

/**
 * The text `ciphers_caesar_brute` hands a model.
 *
 * @param {string} text - Caesar ciphertext.
 * @param {"en" | "pl" | "ja"} [language] - Language the plaintext should read in.
 * @returns {string} `content[0].text`, one `shift=N -> text` line per shift, best fit first.
 */
export function bruteText(text: string, language?: "en" | "pl" | "ja"): string {
  return bruteForceCaesar(LIBRARY, text, language).content[0]!.text;
}

/**
 * The 25 shifts in the order the CLI and the tool rank them.
 *
 * @param {string} text - Caesar ciphertext.
 * @param {"en" | "pl" | "ja"} [language] - Language the plaintext should read in.
 * @returns {Array<{ shift: number; text: string }>} Best fit first.
 */
export function bruteRows(
  text: string,
  language?: "en" | "pl" | "ja",
): Array<{ shift: number; text: string }> {
  return rankCaesarShifts(LIBRARY, text, language);
}

/**
 * The text `ciphers_frequency` hands a model.
 *
 * @param {string} text - Text to count.
 * @param {"en" | "pl" | "ja"} [language] - Reference language.
 * @returns {string} `content[0].text`.
 */
export function frequencyText(text: string, language?: "en" | "pl" | "ja"): string {
  return formatFrequencyAnalysis(LIBRARY, text, language).content[0]!.text;
}

/**
 * The text `ciphers_period_estimate` hands a model.
 *
 * @param {string} text - Vigenère ciphertext.
 * @param {"en" | "pl" | "ja"} [language] - Language the plaintext should read in.
 * @param {number} [maxPeriod] - Longest key length to try.
 * @returns {string} `content[0].text`.
 * @throws {InvalidOptionError} When `maxPeriod` is out of range.
 */
export function periodText(
  text: string,
  language?: "en" | "pl" | "ja",
  maxPeriod?: number,
): string {
  return formatPeriodEstimate(LIBRARY, text, language, maxPeriod).content[0]!.text;
}

/**
 * The text `ciphers_info` hands a model about one cipher.
 *
 * @param {string} name - A registered cipher.
 * @returns {string} `content[0].text`.
 */
export function infoText(name: string): string {
  return formatCipherInfo(LIBRARY, name).content[0]!.text;
}
