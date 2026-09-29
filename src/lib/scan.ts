import { extractKeywords, type Keyword } from "./keywords";
import { segment, tokenize } from "./tokenize";

/** A job-description keyword, with how well the resume covers it. */
export interface ScoredKeyword extends Keyword {
  /**
   * How much of the term the resume has, from 0 to 1.
   *
   * 1 means the term itself is present. Anything in between means the words
   * turn up but the term does not.
   */
  coverage: number;
}

export interface ScanResult {
  /** Whole percent, 0 to 100. */
  score: number;
  /** Terms the resume contains. */
  matched: ScoredKeyword[];
  /** Terms whose words appear, but not as the term itself. */
  partial: ScoredKeyword[];
  /** Terms the resume does not mention at all. */
  missing: ScoredKeyword[];
  /** Every keyword considered, strongest first. */
  keywords: ScoredKeyword[];
}

/**
 * Most credit a phrase can earn when its words are present but scattered.
 *
 * Listing "web", "core", and "vitals" in three unrelated places is not the
 * same as having worked on Core Web Vitals, but it is not nothing either.
 */
const SCATTERED_CREDIT = 0.5;

/** Longest phrase indexed from the resume. Matches the extractor's limit. */
const MAX_PHRASE = 3;

/**
 * Index every word and short phrase in the resume.
 *
 * Line breaks are flattened to spaces first. A PDF wraps lines wherever the
 * column ends, so "Core Web\nVitals" is the same term as "Core Web Vitals" —
 * honouring that break would report the phrase missing from a resume that
 * plainly contains it. Sentence punctuation and bullets still separate, so
 * "React. Native" cannot masquerade as "React Native".
 */
function indexResume(resume: string): { words: Set<string>; phrases: Set<string> } {
  const words = new Set<string>();
  const phrases = new Set<string>();

  for (const token of tokenize(resume)) words.add(token.stem);

  const unwrapped = resume.replace(/\n/g, " ");

  for (const { tokens } of segment(unwrapped)) {
    for (let size = 2; size <= MAX_PHRASE; size++) {
      for (let start = 0; start + size <= tokens.length; start++) {
        phrases.add(
          tokens
            .slice(start, start + size)
            .map((token) => token.stem)
            .join(" "),
        );
      }
    }
  }

  return { words, phrases };
}

/** How much of one keyword the resume covers. */
function coverageOf(
  keyword: Keyword,
  index: { words: Set<string>; phrases: Set<string> },
): number {
  if (keyword.size === 1) {
    return index.words.has(keyword.key) ? 1 : 0;
  }

  if (index.phrases.has(keyword.key)) return 1;

  const present = keyword.stems.filter((s) => index.words.has(s)).length;
  return SCATTERED_CREDIT * (present / keyword.size);
}

/**
 * Compare a resume against a job description.
 *
 * The score is the share of the job description's keyword weight that the
 * resume covers, so missing something the posting stresses costs more than
 * missing something it mentions once in passing.
 */
export function scan(resume: string, jobDescription: string): ScanResult {
  const keywords = extractKeywords(jobDescription);

  const empty: ScanResult = {
    score: 0,
    matched: [],
    partial: [],
    missing: [],
    keywords: [],
  };

  if (keywords.length === 0) return empty;

  const index = indexResume(resume);

  const scored: ScoredKeyword[] = keywords.map((keyword) => ({
    ...keyword,
    coverage: coverageOf(keyword, index),
  }));

  let earned = 0;
  let available = 0;

  for (const keyword of scored) {
    earned += keyword.weight * keyword.coverage;
    available += keyword.weight;
  }

  return {
    score: available === 0 ? 0 : Math.round((earned / available) * 100),
    matched: scored.filter((k) => k.coverage === 1),
    partial: scored.filter((k) => k.coverage > 0 && k.coverage < 1),
    missing: scored.filter((k) => k.coverage === 0),
    keywords: scored,
  };
}
