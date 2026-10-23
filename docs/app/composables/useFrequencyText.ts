import { analyzeFrequency, type QuadgramScore } from "@agntn/ciphers";
import { formatFrequencyAnalysis } from "#tool-operations";

/** `scoreQuadgrams`, once a mounted page has fetched it. */
const scoreQuadgrams = shallowRef<(text: string) => QuadgramScore | undefined>();

/**
 * What `ciphers_frequency` hands a model. Quadgrams land after mount, 38 kB gz no page waits on.
 *
 * @returns {(text: string, language?: "en" | "pl" | "ja") => string} `content[0].text` for a text.
 */
export function useFrequencyText(): (text: string, language?: "en" | "pl" | "ja") => string {
  onMounted(async () => {
    scoreQuadgrams.value ??= (await import("#quadgrams")).scoreQuadgrams;
  });
  return (text, language) =>
    formatFrequencyAnalysis(
      { analyzeFrequency, scoreQuadgrams: scoreQuadgrams.value ?? (() => undefined) },
      text,
      language,
    ).content[0]!.text;
}
