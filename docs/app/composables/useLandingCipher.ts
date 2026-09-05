import { create } from "@agntn/ciphers";
import { CIPHERS, type CipherEntry } from "../utils/ciphers";

/** The order the landing walks the ciphers in. Neighbours are kept different on purpose. */
const WALK = [
  "caesar",
  "vigenere",
  "playfair",
  "rail-fence",
  "enigma",
  "atbash",
  "polybius",
  "columnar",
  "affine",
  "bifid",
  "morse",
  "alberti",
  "adfgvx",
  "bacon",
  "trithemius",
  "tap-code",
  "rot13",
  "rot47",
] as const;

export interface LandingSample {
  entry: CipherEntry;
  plaintext: string;
  options: Record<string, string | number>;
  ciphertext: string;
  roundtrip: string;
}

/** Encodes one fixed sample. A throw here is a broken sample, not a runtime case. */
export function encodeSample(entry: CipherEntry): LandingSample {
  const cipher = create(entry.slug);
  const encoded = cipher.encode(entry.sample, entry.options);
  return {
    entry,
    plaintext: entry.sample,
    options: entry.options,
    ciphertext: encoded.text,
    roundtrip: cipher.decode(encoded.text, entry.options).text,
  };
}

/** One clock for every landing panel. The library computes the samples, at build and live. */
export function useLandingCipher() {
  const samples = WALK.map((slug) => encodeSample(CIPHERS.find((row) => row.slug === slug)!));
  const tick = ref(0);
  const paused = ref(false);
  const index = computed(() => tick.value % samples.length);
  const current = computed(() => samples[index.value]!);

  /** Caesar shift 3 of the current plaintext, for the brute force panel. */
  const caesar = computed(() => create("caesar").encode(current.value.plaintext, { shift: 3 }).text);

  let timer: number | undefined;

  function step(delta: number) {
    tick.value = Math.max(0, tick.value + delta);
  }

  function stopWalk() {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  }

  function startWalk() {
    stopWalk();
    if (!import.meta.client || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    timer = window.setInterval(() => {
      if (!paused.value && !document.hidden) {
        step(1);
      }
    }, 4200);
  }

  onMounted(startWalk);
  onUnmounted(stopWalk);

  return { samples, tick, index, paused, current, caesar, step };
}
