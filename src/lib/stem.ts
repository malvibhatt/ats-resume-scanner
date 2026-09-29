/**
 * A deliberately conservative stemmer.
 *
 * The goal is that every inflection of a word collapses to the same key, so
 * "managing" on a resume matches "management" in a job description. It is not
 * trying to produce real words — "manage" stems to "manag", and that is fine
 * as long as it is consistent.
 *
 * Full Porter stemming is too aggressive here: it collapses "university" and
 * "universal", which would report false matches to someone's face.
 */

/** Suffix rules, longest first. Each entry is [suffix, replacement]. */
const SUFFIXES: ReadonlyArray<readonly [string, string]> = [
  // Nominalizations, before the plain verb endings that would eat them.
  ["ization", "ize"], // organization -> organize
  ["ational", "ate"], // operational  -> operate
  ["fulness", "ful"],
  ["ousness", "ous"],
  ["iveness", "ive"],
  ["ement", "e"], // management   -> manage
  ["ation", "ate"], // automation   -> automate
  ["ities", "ity"], // priorities   -> priority
  ["ility", "le"], // accessibility-> accessible
  ["ments", ""],
  ["ment", ""], // deployment   -> deploy
  ["ship", ""], // leadership   -> leader -> lead
  ["ness", ""],
  ["ices", "ex"], // indices      -> index
  ["ies", "y"], // libraries    -> library
  ["sses", "ss"], // classes      -> class
  ["shes", "sh"],
  ["ches", "ch"],
  ["xes", "x"],
  ["zes", "z"],
  ["ing", ""], // building     -> build
  ["ers", ""],
  ["er", ""], // manager      -> manag
  ["ed", ""], // managed      -> manag
  ["ly", ""],
  ["es", ""],
  ["s", ""], // tools        -> tool
];

/**
 * Enough passes to peel any stack of suffixes English actually produces
 * ("responsibilities" needs two), with a hard stop so a pathological rule
 * interaction cannot spin.
 */
const MAX_PASSES = 5;

/** Consonant pairs that are genuinely part of the word, not doubling. */
const REAL_DOUBLES = new Set(["ll", "ss", "ff", "zz", "oo", "ee"]);

/**
 * "programming" -> "programm" -> "program", so that it matches "program".
 * Leaves "pass" and "full" alone.
 */
function undouble(word: string): string {
  if (word.length < 4) return word;
  const tail = word.slice(-2);
  if (tail[0] !== tail[1]) return word;
  if (REAL_DOUBLES.has(tail)) return word;
  return word.slice(0, -1);
}

/**
 * Reduce a word to a matching key.
 *
 * Tokens containing anything other than letters are returned untouched —
 * "node.js", "c++", "ci/cd", and "s3" must not be mangled.
 */
export function stem(word: string): string {
  const lower = word.toLowerCase();

  // Tech tokens and anything with digits or punctuation are left exactly as-is.
  if (!/^[a-z]+$/.test(lower)) return lower;

  // Too short to carry a suffix worth stripping.
  if (lower.length <= 3) return lower;

  let result = lower;

  // Peel suffixes until nothing more applies. A single pass is not enough:
  // "engineering" sheds "ing" to leave "engineer", which must then shed "er"
  // so that it agrees with the stem of "engineer" itself.
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const before = result;

    for (const [suffix, replacement] of SUFFIXES) {
      if (!result.endsWith(suffix)) continue;

      const stripped =
        result.slice(0, result.length - suffix.length) + replacement;

      // Never stem down to a stub; "sees" must not become "s".
      if (stripped.length < 3) continue;

      result = replacement === "" ? undouble(stripped) : stripped;
      break;
    }

    if (result === before) break;
  }

  // Collapse the trailing "e" last, so that "manage", "managed", "managing",
  // "manager", and "management" all land on "manag".
  if (result.length > 3 && result.endsWith("e")) {
    result = result.slice(0, -1);
  }

  return result;
}
