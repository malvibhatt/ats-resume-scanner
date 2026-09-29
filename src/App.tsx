import { useState } from "react";
import "./App.css";
import { DocumentInput } from "./components/DocumentInput";
import { KeywordSection } from "./components/KeywordSection";
import { ScoreRing } from "./components/ScoreRing";
import { scan, type ScanResult } from "./lib/scan";

/** Below this there is not enough text to say anything useful. */
const MIN_WORDS = 20;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function App() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  // Held rather than derived, so the results do not churn while you are still
  // editing the inputs.
  const [result, setResult] = useState<ScanResult | null>(null);

  const resumeWords = countWords(resume);
  const jobWords = countWords(jobDescription);
  const ready = resumeWords >= MIN_WORDS && jobWords >= MIN_WORDS;

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">ATS Resume Scanner</h1>
        <p className="app__tagline">
          Compare your resume against a job description to see which keywords
          you match and which you are missing.
        </p>
        <p className="app__privacy">
          Everything runs in your browser. Your resume is never uploaded.
        </p>
      </header>

      <main>
        <div className="app__inputs">
          <DocumentInput
            label="Your resume"
            hint="PDF, Word, or paste the text"
            placeholder="Paste your resume here, or drop a file on this box…"
            value={resume}
            onChange={setResume}
          />
          <DocumentInput
            label="Job description"
            hint="Paste the posting you are applying to"
            placeholder="Paste the job description here…"
            value={jobDescription}
            onChange={setJobDescription}
          />
        </div>

        <div className="app__scan">
          <button
            type="button"
            className="button button--primary"
            disabled={!ready}
            onClick={() => setResult(scan(resume, jobDescription))}
          >
            Scan
          </button>
          {!ready && (
            <p className="app__scan-hint">
              {resumeWords === 0 && jobWords === 0
                ? "Add your resume and a job description to begin."
                : "Both need a little more text before a scan means anything."}
            </p>
          )}
        </div>

        {result && (
          <section className="results" aria-live="polite">
            <div className="results__score">
              <ScoreRing score={result.score} />
              <p className="results__breakdown">
                You match <strong>{result.matched.length}</strong> of{" "}
                <strong>{result.keywords.length}</strong> key terms from this
                posting.
              </p>
            </div>

            <div className="results__lists">
              <KeywordSection
                title="Matching keywords"
                description="Terms from the posting that already appear in your resume."
                tone="matched"
                keywords={result.matched}
                emptyMessage="None yet — nothing from the posting appears in your resume."
              />

              {result.partial.length > 0 && (
                <KeywordSection
                  title="Partly covered"
                  description="You use these words, but not as the phrase the posting uses."
                  tone="partial"
                  keywords={result.partial}
                  emptyMessage=""
                />
              )}

              <KeywordSection
                title="Missing keywords"
                description="Worth adding, where you can back them up honestly."
                tone="missing"
                keywords={result.missing}
                emptyMessage="Nothing missing — your resume covers every term."
              />
            </div>

            <p className="results__caveat">
              Only add a keyword if it is genuinely true of your experience. A
              resume that gets you past a filter and then falls apart in the
              interview has not helped you.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
