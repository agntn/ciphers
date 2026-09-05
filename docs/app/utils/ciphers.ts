import { builtinCiphers, create, type CipherInfo } from "@agntn/ciphers";

/** Cipher families as the library names them, plus a label the page can show. */
export const FAMILIES: ReadonlyArray<{ key: CipherInfo["family"]; label: string }> = [
  { key: "substitution-shift", label: "Shift" },
  { key: "substitution-reflection", label: "Reflection" },
  { key: "substitution-multiplicative", label: "Multiplicative" },
  { key: "polyalphabetic", label: "Polyalphabetic" },
  { key: "digraph", label: "Digraph" },
  { key: "fractionation", label: "Fractionation" },
  { key: "transposition", label: "Transposition" },
  { key: "rotor", label: "Rotor" },
] as const;

/** Icons and a one-liner per cipher. Everything else comes from `create(name).info()`. */
const PRESENTATION: Record<
  (typeof builtinCiphers)[number],
  { icon: string; blurb: string; sample: string; options?: Record<string, string | number> }
> = {
  caesar: { icon: "i-solar-restart-linear", blurb: "Shift every letter by N", sample: "ATTACK AT DAWN", options: { shift: 3 } },
  rot13: { icon: "i-solar-restart-linear", blurb: "Caesar with shift 13, its own inverse", sample: "HELLO WORLD" },
  rot47: { icon: "i-solar-hashtag-linear", blurb: "Shift 47 over printable ASCII", sample: "Hello, World! 123" },
  atbash: { icon: "i-solar-flip-horizontal-linear", blurb: "Mirror the alphabet, A becomes Z", sample: "ATTACK AT DAWN" },
  vigenere: { icon: "i-solar-key-linear", blurb: "A keyword picks the shift per letter", sample: "ATTACK AT DAWN", options: { key: "LEMON" } },
  trithemius: { icon: "i-solar-calculator-linear", blurb: "Shift 0, 1, 2, 3 and on", sample: "HELLO WORLD" },
  alberti: { icon: "i-solar-vinyl-record-linear", blurb: "A keyed disk that turns every few letters", sample: "ATTACK AT DAWN", options: { key: "ALBERTI", period: 4 } },
  "rail-fence": { icon: "i-solar-shuffle-linear", blurb: "Zigzag over rails, read row by row", sample: "WE ARE DISCOVERED", options: { rails: 3 } },
  affine: { icon: "i-solar-calculator-linear", blurb: "a·x + b mod 26", sample: "AFFINE CIPHER", options: { a: 5, b: 8 } },
  playfair: { icon: "i-solar-widget-4-linear", blurb: "Letter pairs through a keyed 5×5 table", sample: "HIDE THE GOLD", options: { key: "PLAYFAIR EXAMPLE" } },
  polybius: { icon: "i-solar-widget-4-linear", blurb: "Each letter becomes a row and a column", sample: "HELLO" },
  morse: { icon: "i-solar-radio-linear", blurb: "Dots, dashes and a slash between words", sample: "SOS" },
  bacon: { icon: "i-solar-code-2-linear", blurb: "Five A or B per letter", sample: "SECRET" },
  "tap-code": { icon: "i-solar-widget-4-linear", blurb: "Knocks on a 5×5 grid, C and K share", sample: "HELP" },
  columnar: { icon: "i-solar-shuffle-linear", blurb: "Rows in, columns out in keyword order", sample: "ATTACK AT DAWN", options: { key: "ZEBRA" } },
  adfgvx: { icon: "i-solar-widget-4-linear", blurb: "A 6×6 grid of letters and digits", sample: "ATTACK AT 1200" },
  bifid: { icon: "i-solar-widget-4-linear", blurb: "Polybius coordinates, split and re-read", sample: "FLEE AT ONCE", options: { key: "BICONDITIONAL", period: 5 } },
  enigma: { icon: "i-solar-lock-keyhole-linear", blurb: "Wehrmacht M3, rotors I II III, reflector B", sample: "ATTACK AT DAWN", options: { positions: "MCK", rings: "BDF", plugboard: "AV BS CG" } },
};

export interface CipherEntry {
  slug: (typeof builtinCiphers)[number];
  to: string;
  icon: string;
  blurb: string;
  sample: string;
  options: Record<string, string | number>;
  info: CipherInfo;
}

/** The eighteen built-in ciphers in registry order, with their live metadata. */
export const CIPHERS: readonly CipherEntry[] = builtinCiphers.map((slug) => ({
  slug,
  to: `/ciphers/${slug}`,
  icon: PRESENTATION[slug].icon,
  blurb: PRESENTATION[slug].blurb,
  sample: PRESENTATION[slug].sample,
  options: PRESENTATION[slug].options ?? {},
  info: create(slug).info(),
}));

export function cipherEntry(slug: string): CipherEntry | undefined {
  return CIPHERS.find((cipher) => cipher.slug === slug);
}

export function familyLabel(family: CipherInfo["family"]): string {
  return FAMILIES.find((row) => row.key === family)?.label ?? family;
}

/** The five agent tools. Same names over MCP, Pi and OMP. */
export const TOOLS = [
  "cipher_encode",
  "cipher_decode",
  "cipher_brute_caesar",
  "cipher_frequency",
  "cipher_info",
] as const;
