import { builtinCiphers, create, type CipherCategory, type CipherInfo } from "@agntn/ciphers";

/** Cipher families as the library names them, plus a label the page can show. */
export const FAMILIES: ReadonlyArray<{ key: CipherInfo["family"]; label: string }> = [
  { key: "substitution-shift", label: "Shift" },
  { key: "substitution-reflection", label: "Reflection" },
  { key: "substitution-keyed", label: "Mixed alphabet" },
  { key: "substitution-multiplicative", label: "Multiplicative" },
  { key: "polyalphabetic", label: "Polyalphabetic" },
  { key: "digraph", label: "Digraph" },
  { key: "polygraphic", label: "Polygraphic" },
  { key: "fractionation", label: "Fractionation" },
  { key: "homophonic", label: "Homophonic" },
  { key: "transposition", label: "Transposition" },
  { key: "rotor", label: "Rotor" },
  { key: "substitution-permutation", label: "SP network" },
  { key: "feistel", label: "Feistel" },
  { key: "lai-massey", label: "Lai-Massey" },
  { key: "arx", label: "ARX" },
  { key: "permutation", label: "Permutation" },
] as const;

/** Icons and a one-liner per cipher. Everything else comes from `create(name).info()`. */
const PRESENTATION: Record<
  (typeof builtinCiphers)[number],
  { icon: string; blurb: string; sample: string; options?: Record<string, string | number> }
> = {
  caesar: { icon: "i-lucide-rotate-ccw", blurb: "Shift every letter by N", sample: "ATTACK AT DAWN", options: { shift: 3 } },
  rot13: { icon: "i-lucide-rotate-ccw", blurb: "Caesar with shift 13, its own inverse", sample: "HELLO WORLD" },
  rot47: { icon: "i-lucide-hash", blurb: "Shift 47 over printable ASCII", sample: "Hello, World! 123" },
  atbash: { icon: "i-lucide-flip-horizontal-2", blurb: "Mirror the alphabet, A becomes Z", sample: "ATTACK AT DAWN" },
  substitution: { icon: "i-lucide-replace", blurb: "One shuffled alphabet, keyed by a word", sample: "FLEE AT ONCE", options: { key: "ZEBRAS" } },
  vigenere: { icon: "i-lucide-key-round", blurb: "A keyword picks the shift per letter", sample: "ATTACK AT DAWN", options: { key: "LEMON" } },
  gronsfeld: { icon: "i-lucide-hash", blurb: "A PIN for a key, every digit one shift", sample: "GRONSFELD", options: { key: "1234" } },
  beaufort: { icon: "i-lucide-key-round", blurb: "Subtract the text from a repeating key", sample: "DCODE", options: { key: "KEY" } },
  porta: { icon: "i-lucide-arrow-left-right", blurb: "Thirteen tables, each one trades the halves of A-Z", sample: "DEFEND THE EAST WALL", options: { key: "FORTIFICATION" } },
  autokey: { icon: "i-lucide-key-round", blurb: "The plaintext extends the primer key", sample: "ATTACK AT DAWN", options: { key: "QUEENLY" } },
  "running-key": { icon: "i-lucide-book-text", blurb: "A page of a book as the key, never repeated", sample: "FLEE AT ONCE", options: { key: "errors can occur in several places" } },
  trithemius: { icon: "i-lucide-list-ordered", blurb: "Shift 0, 1, 2, 3 and on", sample: "HELLO WORLD" },
  alberti: { icon: "i-lucide-disc-3", blurb: "A keyed disk that turns every few letters", sample: "ATTACK AT DAWN", options: { key: "ALBERTI", period: 4 } },
  "quagmire-1": { icon: "i-lucide-table", blurb: "A keyed plain alphabet over a straight one, slid by an indicator word", sample: "THE QUAG ONE", options: { key: "SPRINGFEVER", indicator: "FLOWER" } },
  "quagmire-2": { icon: "i-lucide-table-2", blurb: "Straight plain alphabet, keyed cipher alphabet, same slide", sample: "IN THE QUAG TWO", options: { key: "SPRINGFEVER", indicator: "FLOWER" } },
  "quagmire-3": { icon: "i-lucide-sheet", blurb: "One keyed alphabet on both sides of the tableau", sample: "THE SAME KEYED ALPHABET", options: { key: "AUTOMOBILE", indicator: "HIGHWAY" } },
  "quagmire-4": { icon: "i-lucide-rows-3", blurb: "Three keywords: plain alphabet, cipher alphabet, indicator", sample: "THIS ONE EMPLOYS THREE KEYWORDS", options: { key: "SENSORY", secondKey: "PERCEPTION", indicator: "EXTRA", indicatorUnder: "S" } },
  "rail-fence": { icon: "i-lucide-activity", blurb: "Zigzag over rails, read row by row", sample: "WE ARE DISCOVERED", options: { rails: 3 } },
  affine: { icon: "i-lucide-calculator", blurb: "a·x + b mod 26", sample: "AFFINE CIPHER", options: { a: 5, b: 8 } },
  playfair: { icon: "i-lucide-grid-2x2", blurb: "Letter pairs through a keyed 5×5 table", sample: "HIDE THE GOLD", options: { key: "PLAYFAIR EXAMPLE" } },
  "four-square": { icon: "i-lucide-layout-grid", blurb: "Letter pairs across two plain and two keyed squares", sample: "ATTACK AT DAWN", options: { key: "EXAMPLE", secondKey: "KEYWORD" } },
  "two-square": { icon: "i-lucide-rows-2", blurb: "Letter pairs across two keyed squares, one in five left alone", sample: "HELP ME OBI WAN KENOBI", options: { key: "EXAMPLE", secondKey: "KEYWORD" } },
  hill: { icon: "i-lucide-brackets", blurb: "Letter blocks times a key matrix, mod 26", sample: "ACT CAT", options: { key: "GYBNQKURP" } },
  polybius: { icon: "i-lucide-grid-3x3", blurb: "Each letter becomes a row and a column", sample: "HELLO" },
  nihilist: { icon: "i-lucide-grid-2x2-plus", blurb: "Square numbers plus a keyword, no wrap at 100", sample: "DYNAMITE WINTER PALACE", options: { key: "RUSSIAN", square: "ZEBRAS" } },
  morse: { icon: "i-lucide-radio", blurb: "Dots, dashes and a slash between words", sample: "SOS" },
  bacon: { icon: "i-lucide-binary", blurb: "Five A or B per letter", sample: "SECRET" },
  "tap-code": { icon: "i-lucide-grid-3x3", blurb: "Knocks on a 5×5 grid, C and K share", sample: "HELP" },
  a1z26: { icon: "i-lucide-arrow-down-a-z", blurb: "A is 1, Z is 26, dashes between", sample: "ATTACK AT DAWN" },
  book: { icon: "i-lucide-book-open", blurb: "Every word as its place in a text both sides own", sample: "seek and ye shall find", options: { book: "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you." } },
  columnar: { icon: "i-lucide-columns-3", blurb: "Rows in, columns out in keyword order", sample: "ATTACK AT DAWN", options: { key: "ZEBRA" } },
  route: { icon: "i-lucide-route", blurb: "Rows in, a spiral or a snake out", sample: "ATTACK AT DAWN", options: { width: 4 } },
  adfgvx: { icon: "i-lucide-table", blurb: "A 6×6 grid of letters and digits", sample: "ATTACK AT 1200" },
  bifid: { icon: "i-lucide-grid-3x3", blurb: "Polybius coordinates, split and re-read", sample: "FLEE AT ONCE", options: { key: "BICONDITIONAL", period: 5 } },
  "straddling-checkerboard": { icon: "i-lucide-hash", blurb: "The VIC board, one digit for common letters and two for the rest", sample: "ATTACK AT DAWN" },
  enigma: { icon: "i-lucide-keyboard", blurb: "Wehrmacht M3, rotors I II III, reflector B", sample: "ATTACK AT DAWN", options: { positions: "MCK", rings: "BDF", plugboard: "AV BS CG" } },
  aes: { icon: "i-lucide-blocks", blurb: "AES, every 16-byte block on its own", sample: "ATTACK AT DAWN", options: { key: "2b7e151628aed2a6abf7158809cf4f3c" } },
  "aes-cbc": { icon: "i-lucide-blocks", blurb: "AES with every block chained to the one before", sample: "ATTACK AT DAWN", options: { key: "2b7e151628aed2a6abf7158809cf4f3c", iv: "000102030405060708090a0b0c0d0e0f" } },
  "aes-cfb": { icon: "i-lucide-blocks", blurb: "AES as a keystream, the ciphertext fed back in", sample: "ATTACK AT DAWN", options: { key: "2b7e151628aed2a6abf7158809cf4f3c", iv: "000102030405060708090a0b0c0d0e0f" } },
  "aes-ofb": { icon: "i-lucide-blocks", blurb: "AES fed its own output, a keystream that never sees the text", sample: "ATTACK AT DAWN", options: { key: "2b7e151628aed2a6abf7158809cf4f3c", iv: "ffeeddccbbaa99887766554433221100" } },
  "aes-ctr": { icon: "i-lucide-blocks", blurb: "AES over a counter, a keystream with no feedback", sample: "ATTACK AT DAWN", options: { key: "2b7e151628aed2a6abf7158809cf4f3c", iv: "f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff" } },
  "aes-ccm": { icon: "i-lucide-blocks", blurb: "AES over a counter, with a tag that catches any change", sample: "ATTACK AT DAWN", options: { key: "2b7e151628aed2a6abf7158809cf4f3c", nonce: "000102030405060708090a0b" } },
  "aes-ocb": { icon: "i-lucide-blocks", blurb: "AES once per block, encrypting and signing in the same pass", sample: "ATTACK AT DAWN", options: { key: "2b7e151628aed2a6abf7158809cf4f3c", nonce: "000102030405060708090a0b" } },
  "aes-lrw": { icon: "i-lucide-blocks", blurb: "AES with every block masked by its position", sample: "ATTACK AT DAWN", options: { key: "4562ac25f828176d4c268414b5680185258e2a05e73e9d03ee5a830ccc094c87" } },
  "aes-xts": { icon: "i-lucide-blocks", blurb: "AES for disk sectors, the last block stealing from the one before", sample: "ATTACK AT DAWN FROM THE NORTH", options: { key: "2718281828459045235360287471352631415926535897932384626433832795" } },
  "aes-cbc-mac": { icon: "i-lucide-blocks", blurb: "AES over the text for a tag, the text itself left as it is", sample: "ATTACK AT DAWN", options: { key: "2b7e151628aed2a6abf7158809cf4f3c" } },
  "aes-passphrase": { icon: "i-lucide-blocks", blurb: "What CryptoJS leaves on a page, AES keyed by a password", sample: "ATTACK AT DAWN", options: { key: "secret", salt: "0123456789abcdef" } },
  rijndael: { icon: "i-lucide-blocks", blurb: "AES before NIST cut it down, blocks up to 256 bits", sample: "ATTACK AT DAWN", options: { key: "2b7e151628aed2a6abf7158809cf4f3c762e7160f38b4da56a784d9045190cfe", blockSize: 256 } },
  des: { icon: "i-lucide-split", blurb: "The 1977 standard, 56 key bits and 16 Feistel rounds", sample: "ATTACK AT DAWN", options: { key: "0123456789abcdef" } },
  desx: { icon: "i-lucide-split", blurb: "DES between two XORs, 184 key bits for the price of one pass", sample: "ATTACK AT DAWN", options: { key: "0123456789abcdeff0e1d2c3b4a596871122334455667788" } },
  "triple-des": { icon: "i-lucide-split", blurb: "DES three times, every 8-byte block on its own", sample: "ATTACK AT DAWN", options: { key: "0123456789abcdef23456789abcdef01456789abcdef0123" } },
  "triple-des-cbc": { icon: "i-lucide-split", blurb: "Triple DES with every block chained to the one before", sample: "ATTACK AT DAWN", options: { key: "0123456789abcdef23456789abcdef01456789abcdef0123", iv: "0001020304050607" } },
  blowfish: { icon: "i-lucide-split", blurb: "Schneier's Feistel cipher, S-boxes grown from the key and pi", sample: "ATTACK AT DAWN", options: { key: "0123456789abcdeff0e1d2c3b4a59687" } },
  idea: { icon: "i-lucide-square-sigma", blurb: "The PGP 2 cipher, XOR, addition and multiplication and no tables", sample: "ATTACK AT DAWN", options: { key: "00010002000300040005000600070008" } },
  lucifer: { icon: "i-lucide-split", blurb: "The IBM cipher DES was cut down from, 128-bit blocks and keys", sample: "ATTACK AT DAWN", options: { key: "0123456789abcdeffedcba9876543210" } },
  mars: { icon: "i-lucide-split", blurb: "IBM's AES finalist, 32 rounds and an S-box grown from SHA-1", sample: "ATTACK AT DAWN", options: { key: "0123456789abcdeffedcba9876543210" } },
  serpent: { icon: "i-lucide-blocks", blurb: "The AES runner-up, 32 rounds of 4-bit S-boxes run bitslice", sample: "ATTACK AT DAWN", options: { key: "0123456789abcdeffedcba9876543210" } },
  cast5: { icon: "i-lucide-split", blurb: "The cipher RFC 4880 asked OpenPGP to carry, rotations and eight stored S-boxes", sample: "ATTACK AT DAWN", options: { key: "0123456712345678234567893456789a" } },
  openpgp: { icon: "i-lucide-file-lock", blurb: "What gpg --symmetric writes, a PGP MESSAGE block opened by a passphrase", sample: "ATTACK AT DAWN", options: { key: "secret", salt: "0123456789abcdef", iv: "000102030405060708090a0b0c0d0e0f", count: 1024 } },
  rabbit: { icon: "i-lucide-rabbit", blurb: "The eSTREAM stream cipher from RFC 4503, a squaring where the S-boxes would be", sample: "ATTACK AT DAWN", options: { key: "912813292e3d36fe3bfc62f1dc51c3ac" } },
  rc4: { icon: "i-lucide-shuffle", blurb: "Rivest's 1987 trade secret, a shuffled table of 256 bytes and one swap per byte", sample: "Attack at dawn", options: { key: "536563726574" } },
  xor: { icon: "i-lucide-repeat", blurb: "Vigenère on bytes, a short key repeated and XORed in", sample: "Attack at dawn", options: { key: "494345" } },
  salsa20: { icon: "i-lucide-music", blurb: "Bernstein's first dance, twenty rounds of add, rotate and XOR", sample: "ATTACK AT DAWN", options: { key: "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f", nonce: "0001020304050607" } },
  xsalsa20: { icon: "i-lucide-music-2", blurb: "Salsa20 with a nonce long enough to pick at random, the NaCl one", sample: "ATTACK AT DAWN", options: { key: "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f", nonce: "000102030405060708090a0b0c0d0e0f1011121314151617" } },
  chacha20: { icon: "i-lucide-footprints", blurb: "Salsa20 reshuffled, the stream cipher inside TLS 1.3 and WireGuard", sample: "ATTACK AT DAWN", options: { key: "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f", nonce: "000000000000004a00000000" } },
  xchacha20: { icon: "i-lucide-footprints", blurb: "ChaCha20 with a 24-byte nonce, so nobody has to count", sample: "ATTACK AT DAWN", options: { key: "808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f", nonce: "404142434445464748494a4b4c4d4e4f5051525354555658" } },
  "chacha20-poly1305": { icon: "i-lucide-shield-check", blurb: "ChaCha20 with a Poly1305 tag, so a changed byte gets caught", sample: "ATTACK AT DAWN", options: { key: "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f", nonce: "070000004041424344454647" } },
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

/** The built-in ciphers in registry order, with their live metadata. */
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

/**
 * How many built-in ciphers the library files under one family.
 *
 * @param family - A family name as `info().family` reports it.
 * @returns {number} The count in the registry.
 */
export function familySize(family: CipherInfo["family"]): number {
  return CIPHERS.filter((cipher) => cipher.info.family === family).length;
}

/**
 * How many built-in ciphers the library files under one category.
 *
 * @param category - A category as `info().category` reports it.
 * @returns {number} The count in the registry.
 */
export function categorySize(category: CipherCategory): number {
  return CIPHERS.filter((cipher) => cipher.info.category === category).length;
}

/** The families the registry uses, counted from `info().family`, not from the `FAMILIES` labels. */
export const FAMILY_COUNT = new Set(CIPHERS.map((cipher) => cipher.info.family)).size;

/**
 * The keyspace as `info()` states it, cut to the figure, so a readout shows `2^56` and a tooltip
 * carries the whole sentence.
 *
 * @param {CipherInfo} info - The cipher's metadata.
 * @returns {{ short: string; full: string } | undefined} Undefined when the cipher states none.
 */
export function keyspaceParts(info: CipherInfo): { short: string; full: string } | undefined {
  if (!info.keyspace) return undefined;
  const cut = info.keyspace.indexOf(" (");
  const head = cut === -1 ? info.keyspace : info.keyspace.slice(0, cut);
  return { short: head.replace(/ keys$/u, ""), full: info.keyspace };
}

/**
 * One cipher's place in the registry, 1-based, the way an ID bar numbers it.
 *
 * @param {string} slug - A built-in cipher.
 * @returns {number} Its position in `builtinCiphers`.
 */
export function registryPosition(slug: string): number {
  return CIPHERS.findIndex((cipher) => cipher.slug === slug) + 1;
}
