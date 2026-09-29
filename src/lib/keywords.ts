import { isHardStopword, isSoftStopword } from "./stopwords";
import { segment, type Token } from "./tokenize";

/** A term worth checking a resume for. */
export interface Keyword {
  /** Matching key: the stems, joined. Unique across the result. */
  key: string;
  /** How it read in the job description, for display. */
  text: string;
  /** The stems, in order. A phrase matches only in this order. */
  stems: string[];
  /** Word count, 1 to 3. */
  size: number;
  /** Times it appeared in the job description. */
  count: number;
  /** How much it should count toward the score. */
  weight: number;
}

/** Longest phrase to consider. Beyond three words, repeats are too rare. */
const MAX_PHRASE = 3;

/** How many keywords to report. Past this they are mostly noise. */
export const MAX_KEYWORDS = 40;

/**
 * At most this many of the reported keywords may be phrases.
 *
 * Single words and phrases are not competing for the same thing. A posting
 * yields far more distinct phrases than distinct skills, so ranking them in
 * one pool lets middling phrases push out every technology the job is
 * actually about — in testing, GraphQL, Jest, Docker, and Next.js all fell off
 * the list. Capping the phrases guarantees the single-word skills a place.
 */
const PHRASE_SLOTS = 14;

/**
 * Section weights.
 *
 * A skill listed under "Requirements" matters more than one mentioned in the
 * benefits blurb, and the boilerplate at the bottom of a posting — legal,
 * perks, equal-opportunity language — is close to pure noise.
 */
const SECTION_PATTERNS: ReadonlyArray<readonly [RegExp, number]> = [
  [/\b(requirement|qualification|must.?have|what you.?ll need|who you are|we.?re looking for)/i, 1.5],
  [/\b(skill|technical|technolog|tech stack|proficienc)/i, 1.4],
  [/\b(responsibilit|what you.?ll do|the role|duties|day.to.day)/i, 1.2],
  // Discounted, not dismissed: a "nice to have" technology is still a real
  // term the posting screens on, and at a steeper discount the named tools in
  // this section drop off the list entirely.
  [/\b(nice.?to.?have|preferred|bonus|desirable|a plus)/i, 0.85],
  [/\b(benefit|perk|compensation|salary|about us|who we are|our (team|mission|value)|equal opportunit|eeo|diversity|accommodat|how to apply)/i, 0.25],
];

/**
 * A bullet is a requirement, never a heading.
 *
 * "- Competitive salary and equity" is short enough to look like a heading and
 * mentions salary, so without this it re-weights everything below it.
 */
const BULLET = /^\s*(?:[-–—*•·]|\d+[.)])\s+/;

/** Weight for text before any recognised heading. */
const DEFAULT_SECTION_WEIGHT = 1;

/** A heading is a short line — a paragraph mentioning "requirements" is not. */
const MAX_HEADING_WORDS = 8;

/**
 * Below this, a term is not worth reporting.
 *
 * Perks and equal-opportunity boilerplate sit at a quarter weight, which is
 * correct for scoring but still leaves words like "equity" and "welcome" with
 * enough to claim a slot. Nobody needs to be told their resume is missing
 * "welcome".
 */
const MIN_WEIGHT = 0.5;

/** Phrases are more specific than single words, so they are worth more. */
const SIZE_WEIGHT: Record<number, number> = { 1: 1, 2: 1.6, 3: 2.1 };

/**
 * How much a named technology outranks an ordinary word of equal frequency.
 *
 * "Docker" and "junior" are both mentioned once in the same section, but only
 * one of them is a skill worth telling someone they are missing.
 */
const PROPER_BOOST = 0.6;

interface Sections {
  /** Weight for each line, by line number. */
  weights: number[];
  /** Lines that are headings, whose own words are structure, not content. */
  headings: Set<number>;
}

/**
 * Work out what each line is worth, from the most recent heading above it.
 */
function sectionWeights(text: string): Sections {
  const lines = text.split("\n");
  const weights: number[] = [];
  const headings = new Set<number>();
  let current = DEFAULT_SECTION_WEIGHT;

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const line = lines[lineNumber];
    const trimmed = line.trim();
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const isBullet = BULLET.test(line);

    // Only a short line can be a heading. This is what stops a sentence like
    // "you will work with our benefits team" from re-weighting everything
    // below it.
    if (!isBullet && wordCount > 0 && wordCount <= MAX_HEADING_WORDS) {
      const matched = SECTION_PATTERNS.find(([pattern]) => pattern.test(trimmed));
      if (matched) {
        current = matched[1];
        headings.add(lineNumber);
      }
    }

    weights.push(current);
  }

  return { weights, headings };
}

/** True if this run of tokens is worth treating as a keyword. */
function isCandidate(tokens: Token[]): boolean {
  // Nothing may be built out of grammar.
  if (tokens.some((token) => isHardStopword(token.word))) return false;

  // A phrase must not dangle: "react and" and "of react" are not keywords.
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  if (isHardStopword(first.word) || isHardStopword(last.word)) return false;

  // Bare numbers are never keywords, though "5+" inside a phrase is fine.
  if (tokens.every((token) => /^[\d.+]+$/.test(token.word))) return false;

  // Single characters are noise, except real technologies like "R" and "C".
  if (tokens.length === 1 && first.word.length < 2) return false;

  if (tokens.length === 1) {
    // "experience" alone says nothing, even though "aws experience" does.
    return !isSoftStopword(first.stem);
  }

  // A phrase must be anchored at both ends by a real term. Sliding a window
  // over prose otherwise yields mostly fragments — "Experience writing unit",
  // "Strong TypeScript skills", "frontend development experience" — which
  // crowd out the actual skills. Boilerplate is fine in the middle, where it
  // does real work: "aws experience", "years of python".
  if (isSoftStopword(first.stem) || isSoftStopword(last.stem)) return false;

  return true;
}

interface Occurrence {
  count: number;
  /** Summed section weight, so repeats in important sections count more. */
  sectionWeight: number;
  text: string;
  stems: string[];
  /** Fraction of the words that look like names, at its strongest sighting. */
  properShare: number;
}

/** True if `inner` appears as a contiguous run inside `outer`. */
function contains(outer: string[], inner: string[]): boolean {
  if (inner.length >= outer.length) return false;

  for (let start = 0; start + inner.length <= outer.length; start++) {
    let matched = true;
    for (let i = 0; i < inner.length; i++) {
      if (outer[start + i] !== inner[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }

  return false;
}

/**
 * Remove keywords that only ever occur inside a longer keyword.
 *
 * A sliding window over "Core Web Vitals" also produces "Core Web", "Web
 * Vitals", "Core", and "Vitals" — six entries for one idea, which would fill
 * the list and read as padding. Equal counts are the test for redundancy: if
 * "Web" appears more often than "Core Web Vitals" does, it stands on its own
 * somewhere and is kept.
 *
 * Expects the list already sorted by weight, so the survivor is the strongest.
 */
function dropRedundant(sorted: Keyword[]): Keyword[] {
  const kept: Keyword[] = [];

  for (const keyword of sorted) {
    const isSubsumed = kept.some(
      (other) =>
        other.count === keyword.count && contains(other.stems, keyword.stems),
    );
    if (!isSubsumed) kept.push(keyword);
  }

  return kept;
}

/**
 * Pull the terms worth matching out of a job description.
 *
 * Returned highest-weight first, capped at {@link MAX_KEYWORDS}.
 */
export function extractKeywords(jobDescription: string): Keyword[] {
  const { weights, headings } = sectionWeights(jobDescription);
  const found = new Map<string, Occurrence>();

  for (const { tokens, line } of segment(jobDescription)) {
    // A heading labels the section; it is not one of its requirements.
    // Without this, "Benefits" and "Nice" rank as skills.
    if (headings.has(line)) continue;

    const lineWeight = weights[line] ?? DEFAULT_SECTION_WEIGHT;

    for (let size = 1; size <= MAX_PHRASE; size++) {
      for (let start = 0; start + size <= tokens.length; start++) {
        const run = tokens.slice(start, start + size);
        if (!isCandidate(run)) continue;

        const key = run.map((token) => token.stem).join(" ");
        const properShare =
          run.filter((token) => token.proper).length / run.length;
        const existing = found.get(key);

        if (existing) {
          existing.count += 1;
          existing.sectionWeight += lineWeight;
          // A word only has to read as a name once to be one: "React" leading
          // a bullet looks ordinary, but it is the same React either way.
          existing.properShare = Math.max(existing.properShare, properShare);
        } else {
          found.set(key, {
            count: 1,
            sectionWeight: lineWeight,
            text: run.map((token) => token.raw).join(" "),
            stems: run.map((token) => token.stem),
            properShare,
          });
        }
      }
    }
  }

  const keywords: Keyword[] = [];

  for (const [key, occurrence] of found) {
    const size = occurrence.stems.length;

    // Repetition signals importance, but with sharply diminishing returns —
    // a word used ten times is not ten times as important as one used once.
    const frequency = 1 + Math.log2(occurrence.count);

    // Average section weight, so a term is judged by where it tends to appear
    // rather than by how many times it appears.
    const section = occurrence.sectionWeight / occurrence.count;

    const named = 1 + PROPER_BOOST * occurrence.properShare;

    keywords.push({
      key,
      text: occurrence.text,
      stems: occurrence.stems,
      size,
      count: occurrence.count,
      weight: frequency * section * (SIZE_WEIGHT[size] ?? 1) * named,
    });
  }

  const byWeight = (a: Keyword, b: Keyword) =>
    b.weight - a.weight || a.text.localeCompare(b.text);

  keywords.sort(byWeight);

  const distinct = dropRedundant(keywords);

  // Fill the phrase slots first, then give every remaining slot to single
  // words, so that a long tail of phrases can never starve the skills.
  const worthwhile = distinct.filter((k) => k.weight >= MIN_WEIGHT);

  const phrases = worthwhile.filter((k) => k.size > 1).slice(0, PHRASE_SLOTS);
  const singles = worthwhile
    .filter((k) => k.size === 1)
    .slice(0, MAX_KEYWORDS - phrases.length);

  return [...phrases, ...singles].sort(byWeight);
}
