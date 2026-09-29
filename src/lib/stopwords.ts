import { stem } from "./stem";

/**
 * Words that carry no signal on their own.
 *
 * Two tiers, because a word can be worthless alone but meaningful inside a
 * phrase. "Team" as a keyword tells you nothing — every job description has
 * one. "Cross-functional team" is a real requirement.
 */

/**
 * Grammar. Matched against the raw word, since closed-class words like "is"
 * and "has" do not need stemming and would only be mangled by it.
 *
 * A keyword is never one of these, and a phrase may not begin or end with one.
 */
export const HARD_STOPWORDS: ReadonlySet<string> = new Set([
  "a", "about", "above", "across", "after", "again", "against", "all", "along",
  "also", "although", "am", "among", "an", "and", "another", "any", "anyone",
  "are", "around", "as", "at", "b", "back", "be", "became", "because", "been",
  "before", "behind", "being", "below", "beside", "besides", "best", "better",
  "between", "beyond", "both", "but", "by", "c", "can", "cannot", "could",
  "did", "do", "does", "doing", "done", "down", "due", "during", "e", "each",
  "eg", "eight", "either", "else", "enough", "especially", "etc", "even",
  "ever", "five", "four",
  "every", "everyone", "everything", "few", "for", "from", "further", "get",
  "gets", "getting", "give", "given", "go", "goes", "going", "had", "has",
  "have", "having", "he", "hence", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "however", "i", "ie", "if", "in", "inc", "includ",
  "include", "includes", "including", "indeed",
  "instead", "into", "is", "it", "its", "itself", "just", "keep", "let",
  "like", "likely", "made", "mainly", "make", "makes", "making", "many", "may",
  "maybe", "me", "mean", "meanwhile", "might", "mine", "more", "moreover",
  "most", "mostly", "much", "must", "my", "myself", "namely", "near",
  "neither", "never", "next", "nine", "no", "none", "nor", "not", "nothing",
  "now",
  "of", "off", "often", "on", "once", "one", "ones", "only", "onto", "or",
  "other", "others", "otherwise", "our", "ours", "ourselves", "out", "over",
  "own", "per", "perhaps", "please", "put", "quite", "rather", "re", "really",
  "regarding", "said", "same", "say", "says", "see", "seen", "several",
  "seven", "shall", "she", "should", "similarly", "since", "six", "so",
  "some", "someone",
  "something", "sometimes", "still", "such", "take", "takes", "taking", "than",
  "ten", "that", "the", "their", "theirs", "them", "themselves", "then",
  "there", "three", "two",
  "therefore", "these", "they", "thing", "things", "this", "those", "though",
  "through", "throughout", "thus", "to", "together", "too", "toward",
  "towards", "under", "unless", "until", "up", "upon", "us", "use", "used",
  "uses", "using", "usually", "various", "very", "via", "want", "wants", "was",
  "way", "ways", "we", "well", "were", "what", "whatever", "when", "whenever",
  "where", "whereas", "whether", "which", "while", "who", "whom", "whose",
  "why", "will", "with", "within", "without", "would", "yet", "you", "your",
  "yours", "yourself",
]);

/**
 * Job-description boilerplate: real words that appear in essentially every
 * posting, so they separate nothing. Excluded as a keyword on its own, but
 * allowed inside a phrase — "experience" is noise, the "experience" in
 * "aws experience" is not.
 *
 * This list also carries the generic action verbs a posting uses to describe
 * duties — "build", "ship", "improve". They are what turn a bullet into a
 * sentence, and a phrase hanging off one of them ("ship user-facing features",
 * "turn Figma mocks") is a fragment, not a skill. Genuinely ambiguous words
 * that are as often nouns as verbs — design, review, test, lead, architect —
 * are deliberately absent, so that "design systems" and "code review" survive.
 *
 * Written as natural words and stemmed below, so the list stays readable and
 * can never drift out of sync with the stemmer.
 */
const SOFT_STOPWORD_WORDS: readonly string[] = [
  // Generic duty verbs.
  "assist", "build", "collaborate", "conduct", "contribute", "coordinate",
  "create", "deliver", "drive", "ensure", "establish", "execute", "handle",
  "identify", "improve", "leverage", "maintain", "mentor", "own", "participate",
  "partner", "perform", "ship", "turn", "utilize", "write",

  "ability", "able", "applicant", "application", "apply", "area", "aspect",
  "background", "basis", "candidate", "career", "chance", "colleague",
  "comfortable", "company", "culture", "day", "deep", "degree", "detail",
  "effective", "exposure", "hands-on", "ideally",
  "effectively", "employee", "employer", "environment", "excellent",
  "exceptional", "experience", "expert", "familiar", "familiarity", "focus",
  "good", "great",
  "group", "help", "high", "highly", "hour", "idea", "impact", "include",
  "individual", "industry", "job", "join", "key", "kind", "knowledge",
  "large", "level", "look", "looking", "love", "member", "message", "minimum",
  "month", "need", "office", "opportunity", "organization", "part", "partner",
  "passion", "passionate", "people", "person", "plus", "position", "possible",
  "preferred", "proficiency", "proficient", "provide", "qualification",
  "quality", "requirement", "responsibility", "role", "seeking", "senior",
  "skill", "solid", "strong", "successful", "support", "task", "team",
  "technology", "thrive", "time", "today", "understanding", "value",
  "variety", "week", "work", "world", "year",
];

/** The soft list in the form it will actually be compared against. */
export const SOFT_STOPWORDS: ReadonlySet<string> = new Set(
  SOFT_STOPWORD_WORDS.map(stem),
);

/**
 * True if the word should never appear in a keyword.
 *
 * Takes the raw lowercased word, not a stem.
 */
export function isHardStopword(word: string): boolean {
  return HARD_STOPWORDS.has(word);
}

/**
 * True if the word is worthless on its own but may appear inside a phrase.
 *
 * Takes a stem, not a raw word.
 */
export function isSoftStopword(wordStem: string): boolean {
  return SOFT_STOPWORDS.has(wordStem);
}
