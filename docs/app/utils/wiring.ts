import { create } from "@agntn/ciphers";

/** Input characters and the output units they fix: one letter to one, a pair to a pair, a block to a block. */
export interface WireGroup {
  inputs: number[];
  outputs: number[];
}

/**
 * The units a ciphertext is drawn in: characters, or bytes of hex for a block cipher.
 *
 * @param {string} text - Ciphertext.
 * @param {boolean} block - Whether the cipher answers in hex.
 * @returns {string[]} One entry per drawn cell.
 */
export function outputUnits(text: string, block: boolean): string[] {
  return block ? (text.match(/.{1,2}/gu) ?? []) : [...text];
}

/**
 * How many leading units two unit lists share.
 *
 * @param {string[]} left - Units of one output.
 * @param {string[]} right - Units of the other.
 * @returns {number} The shared prefix length.
 */
function shared(left: string[], right: string[]): number {
  let index = 0;
  while (index < left.length && index < right.length && left[index] === right[index]) index += 1;
  return index;
}

/**
 * Which input characters fix which output units, measured by the library itself. A transposition
 * gets a private marker per character, so the permutation reads straight off its output. Every
 * other cipher encodes growing prefixes of the text: the output units a prefix already agrees on
 * belong to the characters that arrived since the last agreement. What only the whole text settles
 * goes to the characters still waiting, and a tail longer than any letter needed, a tag, to all of them.
 *
 * @param {string} slug - A built-in cipher.
 * @param {string} plaintext - The sample text.
 * @param {Record<string, string | number>} options - The sample options.
 * @param {boolean} block - Whether the cipher answers in hex.
 * @returns {WireGroup[]} The groups in input order.
 */
export function wiring(
  slug: string,
  plaintext: string,
  options: Record<string, string | number>,
  block: boolean,
): WireGroup[] {
  const cipher = create(slug);
  const inputs = [...plaintext];
  const outputs = outputUnits(cipher.encode(plaintext, options).text, block);

  if (cipher.info().family === "transposition") {
    const markers = inputs.map((_, index) => String.fromCodePoint(0xe000 + index));
    const moved = [...cipher.encode(markers.join(""), options).text];
    if (moved.length === inputs.length) {
      return inputs.map((_, index) => ({
        inputs: [index],
        outputs: [moved.indexOf(markers[index]!)],
      }));
    }
  }

  const groups: WireGroup[] = [];
  let pending: number[] = [];
  let fixed = 0;
  for (let length = 1; length < inputs.length; length += 1) {
    pending.push(length - 1);
    let prefix: string[];
    try {
      prefix = outputUnits(cipher.encode(inputs.slice(0, length).join(""), options).text, block);
    } catch {
      continue;
    }
    const agreed = shared(prefix, outputs);
    if (agreed > fixed) {
      groups.push({ inputs: pending, outputs: range(fixed, agreed) });
      pending = [];
      fixed = agreed;
    }
  }
  pending.push(inputs.length - 1);
  const rest = range(fixed, outputs.length);
  const typical = Math.max(1, ...groups.map((group) => group.outputs.length));
  if (groups.length > 0 && rest.length > 2 * typical) {
    /** A tail far longer than any letter needed is a tag: the last letter takes its share, the tag hears everyone. */
    groups.push({ inputs: pending, outputs: rest.slice(0, typical) });
    groups.push({ inputs: inputs.map((_, index) => index), outputs: rest.slice(typical) });
  } else if (rest.length > 0) {
    groups.push({ inputs: pending, outputs: rest });
  }
  return groups;
}

/**
 * Whole numbers from `start` up to `end`, not including it.
 *
 * @param {number} start - First number.
 * @param {number} end - One past the last.
 * @returns {number[]} The range.
 */
function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index);
}
