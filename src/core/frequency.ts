import { InvalidOptionError } from './errors.ts'

/** Supported reference languages for letter-frequency analysis. */
export type FrequencyLanguage = 'en' | 'pl' | 'ja'

/** Letter counts and expected ordering for one normalized input. */
export interface FrequencyAnalysis {
  readonly total: number
  readonly language: FrequencyLanguage
  readonly counts: ReadonlyArray<readonly [character: string, count: number]>
  readonly reference: string
  /** Index of coincidence; absent when the input has fewer than two letters. */
  readonly ic?: number
  /** Index of coincidence of plaintext in `language`, from the same table as `reference`. */
  readonly referenceIc: number
  /**
   * Mean natural-log probability of one letter under the language's frequencies. The closer to
   * zero, the more the letters read like that language; compare it only between texts scored
   * against the same language.
   */
  readonly fit: number
  /** Like `fit`, for letter pairs inside words; English only, absent when no word has two. */
  readonly pairFit?: number
}

/**
 * Percent of A-Z letters in running text: Wikipedia's letter frequency table for English, PWN's
 * count of the IPI PAN corpus for Polish, base letters only. Japanese is Hepburn romaji spelled
 * out from the hiragana counts of Chikamatsu et al. (2000, p. 499), a year of a newspaper: each
 * kana as the Foreign Ministry's passport table writes it, small ya/yu/yo joined to the i-row
 * kana before them, っ doubling a following k, s, t or p in proportion to how often those kana
 * occur. Kanji readings are not in it, and particles stay as their kana spell them (ha, he).
 * Hepburn never writes L, Q, V or X; each gets one occurrence out of the 39 million letters, so
 * a stray loanword lowers the fit instead of sinking it to minus infinity.
 */
const letterPercentages: Record<FrequencyLanguage, Readonly<Record<string, number>>> = {
  en: {
    A: 8.2,
    B: 1.5,
    C: 2.8,
    D: 4.3,
    E: 12.7,
    F: 2.2,
    G: 2,
    H: 6.1,
    I: 7,
    J: 0.16,
    K: 0.77,
    L: 4,
    M: 2.4,
    N: 6.7,
    O: 7.5,
    P: 1.9,
    Q: 0.12,
    R: 6,
    S: 6.3,
    T: 9.1,
    U: 2.8,
    V: 0.98,
    W: 2.4,
    X: 0.15,
    Y: 2,
    Z: 0.074,
  },
  pl: {
    A: 8.91,
    B: 1.47,
    C: 3.96,
    D: 3.25,
    E: 7.66,
    F: 0.3,
    G: 1.42,
    H: 1.08,
    I: 8.21,
    J: 2.28,
    K: 3.51,
    L: 2.1,
    M: 2.8,
    N: 5.52,
    O: 7.75,
    P: 3.13,
    Q: 0.14,
    R: 4.69,
    S: 4.32,
    T: 3.98,
    U: 2.5,
    V: 0.04,
    W: 4.65,
    X: 0.02,
    Y: 3.76,
    Z: 5.64,
  },
  ja: {
    A: 15.2,
    B: 0.503,
    C: 0.254,
    D: 3.18,
    E: 7.24,
    F: 0.0297,
    G: 2.51,
    H: 5.12,
    I: 9.92,
    J: 0.146,
    K: 4.14,
    L: 0.00000256,
    M: 2.61,
    N: 10.2,
    O: 13.4,
    P: 0.0241,
    Q: 0.00000256,
    R: 5.63,
    S: 4.98,
    T: 8.03,
    U: 5.53,
    V: 0.00000256,
    W: 0.315,
    X: 0.00000256,
    Y: 0.839,
    Z: 0.244,
  },
}

/** Norvig's `count_2l.txt` from Google's web corpus, per 10^8 pairs, one row per first letter. */
const englishPairs = `
A 28684 230646 479606 347818 19004 89519 276108 39717 301176 12928 96518 959893 343322 1580351 14535 225608 13228 1030698 652857 1208394 129079 190420 62629 27441 251079 28771
B 204213 17551 12769 7003 407936 3276 2522 4806 130631 20324 1053 212202 15900 5305 214072 6643 409 111994 66050 12157 173153 2284 2962 967 147795 869
C 539137 6903 88789 23316 569319 7553 5705 512237 226573 1465 206581 174384 11831 9913 786865 14138 3697 148824 61138 433211 143391 5461 4711 1050 60339 2124
D 348979 92267 66839 97649 694731 55697 42291 41985 499225 12286 7505 53632 61628 38517 265434 52991 3388 116818 211564 164549 153538 53622 57872 1919 48152 1328
E 838563 189872 597181 862179 411522 221018 172584 85181 241883 17323 37988 568618 446371 1159000 221425 291367 51770 1787107 1458985 641790 72883 224529 299858 200226 126205 8582
F 171323 11146 27611 13455 201475 133827 9751 14227 296120 3116 2226 64994 18633 9081 490925 21245 895 216462 33258 197447 92374 3908 12586 1419 25847 547
G 212740 20486 28890 17430 427267 22821 29865 180467 179978 2374 3583 60136 22193 70341 165221 24229 1038 180311 88595 86227 89463 3614 17608 842 34834 1576
H 617709 15550 24156 15604 1596482 14150 6552 11696 510310 2847 3033 21237 27372 40032 495250 22396 3253 72136 37750 157844 57317 4027 16586 744 39116 2257
I 285464 88492 684520 268416 373772 159714 243672 12426 17298 6195 45040 458762 231937 2020929 687573 124162 10709 255462 847442 911229 15976 232894 14060 21708 1818 51451
J 62856 935 1617 1082 56177 559 428 614 7255 544 1428 626 1139 739 67897 2380 43 2060 1750 668 60782 645 523 85 163 121
K 51124 13805 10787 6664 211656 12874 7065 15927 129153 2967 3181 18611 10775 36404 33870 10560 555 11100 93213 31060 10178 2059 9056 530 14411 510
L 528865 47377 60663 189359 787513 53451 20796 17712 678164 4268 22767 548811 44397 20749 425105 74303 1668 40332 203223 163548 129075 27035 23237 1303 240637 1727
M 603540 115742 24387 13112 763902 14666 8633 9974 286185 2724 2344 18984 117886 14342 319955 213726 623 14692 122741 40691 100365 3639 12796 1908 61789 625
N 477230 51168 370836 1019647 725941 130856 819567 41864 380152 20185 82887 102744 68723 114282 458986 53856 4972 38236 486579 1075132 111917 51495 42728 3522 107174 6887
O 123406 127734 204950 218246 50946 673806 142967 42510 92901 18158 95005 353075 573704 1505987 262957 285987 2058 1289172 297135 485988 793212 176340 299403 25194 48341 6761
P 373246 8295 21732 22297 376662 11247 8634 113349 144354 1135 2507 254865 48985 6166 355327 148034 1530 468742 74009 103456 108790 2792 6976 1307 30946 772
Q 1765 376 785 426 379 637 229 439 1488 104 122 3112 519 432 375 537 248 1234 2035 1386 124144 235 580 115 103 64
R 691600 57534 214048 215571 1629022 66069 101557 34487 721868 7010 115028 100991 202919 173255 698694 89407 4146 126784 472179 467333 127121 105666 46830 2658 240920 4063
S 466781 83270 253140 64666 871946 101829 33679 319643 621858 10169 57782 89608 105713 68683 471711 255004 11251 65644 465928 1180188 274600 19749 109616 3657 70105 2737
T 634772 55710 110301 48439 1213473 54133 25052 1996908 1196772 8046 8877 97603 83861 41568 1027590 67182 2579 404695 449306 288165 237110 20515 121699 5756 228070 5982
U 123329 101422 160439 95142 126785 21235 85998 7869 104443 2178 20578 236134 150012 344597 13657 140741 894 539029 459870 337278 2552 6144 10972 9078 24485 4421
V 150829 2388 4007 14223 635403 1050 2390 2052 346889 231 324 2083 1911 1751 53072 2407 129 3254 7759 2838 2867 1037 1746 717 3369 114
W 249094 8118 11083 8977 280735 7672 3451 180520 322092 3997 2439 14906 10720 67408 176453 12186 409 30622 92227 27094 4285 2244 29416 1713 13390 1528
X 25761 4591 24371 3143 23295 5090 2026 4786 27439 453 584 3216 7500 2029 6903 50643 311 3170 6122 54396 6108 2303 2316 8316 5587 351
Y 100791 41848 60949 35334 104945 34602 17951 25156 61293 8191 5658 41955 54415 35486 303777 71514 2040 48165 158461 94031 12733 8492 39728 1112 5947 3040
Z 23244 1236 1497 1517 45546 681 603 1489 21355 470 557 2336 1262 899 18380 903 92 1429 1851 1124 4447 384 824 241 3028 6101
`

/**
 * Order A-Z by frequency, most frequent first; letters that tie stay in alphabetical order.
 *
 * @param percentages - Percent of running text per letter.
 * @returns {string} All 26 letters, most frequent first.
 */
function frequencyOrder(percentages: Readonly<Record<string, number>>): string {
  return Object.keys(percentages)
    .sort((left, right) => percentages[right]! - percentages[left]!)
    .join('')
}

/**
 * Natural-log probability of each letter, from the percentages normalized to sum to one.
 *
 * @param percentages - Percent of running text per letter.
 * @returns {Map<string, number>} The log probability of every letter.
 */
function logProbabilities(percentages: Readonly<Record<string, number>>): Map<string, number> {
  const total = Object.values(percentages).reduce((sum, percent) => sum + percent, 0)
  return new Map(
    Object.entries(percentages).map(([letter, percent]) => [letter, Math.log(percent / total)]),
  )
}

/**
 * Chance that two letters drawn from plaintext match: the sum of squared letter probabilities.
 *
 * @param percentages - Percent of running text per letter.
 * @returns {number} The expected index of coincidence.
 */
function expectedCoincidence(percentages: Readonly<Record<string, number>>): number {
  const values = Object.values(percentages)
  const total = values.reduce((sum, percent) => sum + percent, 0)
  return values.reduce((sum, percent) => sum + (percent / total) ** 2, 0)
}

/**
 * Natural-log probability of each letter pair.
 *
 * @param table - Lines of a first letter followed by 26 counts, second letter A to Z.
 * @returns {Map<string, number>} The log probability of every pair.
 */
function pairLogProbabilities(table: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const line of table.trim().split('\n')) {
    const [first, ...row] = line.split(' ')
    row.forEach((count, index) => counts.set(`${first}${String.fromCodePoint(65 + index)}`, +count))
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
  return new Map([...counts].map(([pair, count]) => [pair, Math.log(count / total)]))
}

const frequencyReferences: Record<FrequencyLanguage, string> = {
  en: frequencyOrder(letterPercentages.en),
  pl: frequencyOrder(letterPercentages.pl),
  ja: frequencyOrder(letterPercentages.ja),
}

export const referenceCoincidences: Record<FrequencyLanguage, number> = {
  en: expectedCoincidence(letterPercentages.en),
  pl: expectedCoincidence(letterPercentages.pl),
  ja: expectedCoincidence(letterPercentages.ja),
}

export const letterLogProbabilities: Record<FrequencyLanguage, ReadonlyMap<string, number>> = {
  en: logProbabilities(letterPercentages.en),
  pl: logProbabilities(letterPercentages.pl),
  ja: logProbabilities(letterPercentages.ja),
}

/**
 * The `fit` plaintext scores on average: each letter's log probability, weighted by its share.
 *
 * @param percentages - Percent of running text per letter.
 * @returns {number} The expected `fit`.
 */
function expectedFit(percentages: Readonly<Record<string, number>>): number {
  const values = Object.values(percentages)
  const total = values.reduce((sum, percent) => sum + percent, 0)
  return values.reduce((sum, percent) => sum + (percent / total) * Math.log(percent / total), 0)
}

export const referenceFits: Record<FrequencyLanguage, number> = {
  en: expectedFit(letterPercentages.en),
  pl: expectedFit(letterPercentages.pl),
  ja: expectedFit(letterPercentages.ja),
}

const letterPairLogProbabilities: Partial<Record<FrequencyLanguage, ReadonlyMap<string, number>>> =
  {
    en: pairLogProbabilities(englishPairs),
  }

/**
 * Mean log probability of the letter pairs inside the words of an uppercased text.
 *
 * @param upper - Uppercased text; anything outside A-Z ends a word.
 * @param language - Language whose pair table scores the pairs.
 * @returns {number | undefined} The mean, or `undefined` without a pair table or a two-letter word.
 */
function meanPairLog(upper: string, language: FrequencyLanguage): number | undefined {
  const pairLogs = letterPairLogProbabilities[language]
  if (pairLogs === undefined) return undefined
  let pairs = 0
  let logProbability = 0
  for (const word of upper.match(/[A-Z]+/g) ?? []) {
    for (let index = 1; index < word.length; index++) {
      logProbability += pairLogs.get(word.slice(index - 1, index + 1))!
      pairs++
    }
  }
  return pairs === 0 ? undefined : logProbability / pairs
}

/**
 * Refuse a language without a frequency table.
 *
 * @param language - Language to check.
 * @throws {InvalidOptionError} When the language isn't en, pl or ja.
 */
export function assertLanguage(language: string): asserts language is FrequencyLanguage {
  if (!Object.hasOwn(letterPercentages, language)) {
    throw new InvalidOptionError('language', language, 'must be en, pl or ja')
  }
}

/**
 * Analyze A-Z letter counts.
 *
 * @param text - Text to analyze.
 * @param language - Reference frequency table.
 * @returns {FrequencyAnalysis | undefined} The analysis, or `undefined` when no A-Z letters occur.
 * @throws {InvalidOptionError} When the language has no frequency table.
 */
export function analyzeFrequency(
  text: string,
  language: FrequencyLanguage = 'en',
): FrequencyAnalysis | undefined {
  assertLanguage(language)
  const upper = text.toUpperCase()
  const letters = upper.replaceAll(/[^A-Z]/g, '')
  if (letters.length === 0) return undefined

  const frequencies = new Map<string, number>()
  for (const character of letters) {
    frequencies.set(character, (frequencies.get(character) ?? 0) + 1)
  }

  const total = letters.length
  const letterLogs = letterLogProbabilities[language]
  let coincidences = 0
  let logProbability = 0
  for (const [character, count] of frequencies) {
    coincidences += count * (count - 1)
    logProbability += count * letterLogs.get(character)!
  }

  const pairFit = meanPairLog(upper, language)

  return {
    total,
    language,
    counts: [...frequencies.entries()].sort((left, right) => right[1] - left[1]),
    reference: frequencyReferences[language],
    ...(total < 2 ? {} : { ic: coincidences / (total * (total - 1)) }),
    referenceIc: referenceCoincidences[language],
    fit: logProbability / total,
    ...(pairFit === undefined ? {} : { pairFit }),
  }
}
