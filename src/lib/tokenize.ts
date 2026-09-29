import { stem } from "./stem";

export interface Token {
  /** The word as written, for display. */
  raw: string;
  /** Lowercased. */
  word: string;
  /** Matching key. */
  stem: string;
  /**
   * Looks like the name of a technology rather than an ordinary word.
   *
   * Set for internal capitals and for names carrying punctuation, and raised
   * by {@link segment} for words capitalized away from the start of a
   * sentence. Without this, "GraphQL" and "Docker" score the same as "junior"
   * and "modern", and get pushed off the list by them.
   */
  proper: boolean;
}

/**
 * Matches a word, keeping the punctuation that is part of a technology's name.
 *
 * A naive `\w+` split turns "Node.js" into "node" and "js", "CI/CD" into two
 * useless halves, and drops the "++" that is the entire point of "C++" — so
 * internal `. + # / -` are kept, along with trailing `+` and `#`.
 *
 * The optional leading dot is for ".NET". Sentence-ending periods do not
 * survive, because a dot only counts when a letter or digit follows it.
 */
const TOKEN_PATTERN = /\.?[a-z0-9]+(?:[.+#/-][a-z0-9]+)*[+#]*/gi;

/**
 * A run of text with no sentence or line break inside it.
 *
 * Phrases are only built within a segment — "React. Node" must not produce the
 * phrase "react node", since those words are merely adjacent, not related.
 */
export interface Segment {
  tokens: Token[];
  /** Index of the line this segment started on, for section lookup. */
  line: number;
}

/**
 * Contractions and possessives.
 *
 * The tokenizer treats an apostrophe as a break, so "You'll" would otherwise
 * yield a stray "ll" token — which duly showed up as a ranked keyword.
 */
const CONTRACTION = /['’`](ll|ve|re|s|t|d|m)\b/gi;

/** "GraphQL", "jQuery", "PostgreSQL" — a capital that is not the first letter. */
const INTERNAL_CAPITAL = /.[A-Z]/;

/** "node.js", "ci/cd", "c++" — punctuation only a product name would carry. */
const NAME_PUNCTUATION = /[.+#/]/;

function toToken(raw: string): Token {
  const word = raw.toLowerCase();
  return {
    raw,
    word,
    stem: stem(word),
    proper: INTERNAL_CAPITAL.test(raw) || NAME_PUNCTUATION.test(raw),
  };
}

/** Split text into tokens, discarding structure. */
export function tokenize(text: string): Token[] {
  const cleaned = text.replace(CONTRACTION, "");
  return (cleaned.match(TOKEN_PATTERN) ?? []).map(toToken);
}

/**
 * Where one segment ends and the next begins.
 *
 * The period is guarded by a lookahead so that it only breaks a sentence when
 * whitespace or the end of the line follows. A bare `.` here would split
 * "Node.js" in half before the tokenizer ever saw it.
 *
 * The comma matters as much as the full stop: skill lists are written
 * "Angular, Spring Boot", and running those together invents a phrase
 * ("Angular Spring Boot") that matches nothing and hides the two real terms.
 *
 * The slash only breaks when spaced — "React / Angular" is a list, but
 * "CI/CD" and "TCP/IP" are single names.
 */
const SEGMENT_BREAK = /\.(?=\s|$)|[,;:!?&•·|()[\]{}]+|\s[-–—/]\s/;

/**
 * Split text into segments of tokens, preserving the line each began on.
 *
 * Splits on line breaks and on sentence-ending punctuation, plus the bullet
 * and list separators that job descriptions are built out of.
 */
export function segment(text: string): Segment[] {
  const segments: Segment[] = [];
  const lines = text.split("\n");

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const parts = lines[lineNumber].split(SEGMENT_BREAK);

    for (const part of parts) {
      const tokens = tokenize(part);
      if (tokens.length === 0) continue;

      // A capital away from the start of a sentence is a name, not grammar.
      // This is what separates "Docker" and "Figma" from "junior" and
      // "modern"; the first word is skipped because its capital says nothing.
      for (let i = 1; i < tokens.length; i++) {
        if (/^[A-Z]/.test(tokens[i].raw)) tokens[i].proper = true;
      }

      segments.push({ tokens, line: lineNumber });
    }
  }

  return segments;
}

/**
 * Every stem present in a document, for membership tests.
 *
 * Phrases are matched separately, since they depend on word order.
 */
export function stemSet(text: string): Set<string> {
  const set = new Set<string>();
  for (const token of tokenize(text)) set.add(token.stem);
  return set;
}
