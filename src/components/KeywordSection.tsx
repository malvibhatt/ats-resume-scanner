import type { ScoredKeyword } from "../lib/scan";

type Tone = "matched" | "partial" | "missing";

interface KeywordSectionProps {
  title: string;
  description: string;
  tone: Tone;
  keywords: ScoredKeyword[];
  /** Shown instead of the list when there is nothing in it. */
  emptyMessage: string;
}

/** One labelled group of keyword chips. */
export function KeywordSection({
  title,
  description,
  tone,
  keywords,
  emptyMessage,
}: KeywordSectionProps) {
  return (
    <section className={`keywords keywords--${tone}`}>
      <header className="keywords__header">
        <h3 className="keywords__title">
          {title}
          <span className="keywords__count">{keywords.length}</span>
        </h3>
        <p className="keywords__description">{description}</p>
      </header>

      {keywords.length === 0 ? (
        <p className="keywords__empty">{emptyMessage}</p>
      ) : (
        <ul className="keywords__list">
          {keywords.map((keyword) => (
            <li key={keyword.key} className="chip">
              {keyword.text}
              {keyword.count > 1 && (
                <span
                  className="chip__count"
                  title={`Mentioned ${keyword.count} times in the job description`}
                >
                  {keyword.count}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
