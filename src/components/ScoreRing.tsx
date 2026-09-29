interface ScoreRingProps {
  score: number;
}

const RADIUS = 54;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE) * 2;

/** Where the score stops being a problem and starts being a good sign. */
function band(score: number): "low" | "mid" | "high" {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

function verdict(score: number): string {
  if (score >= 75) return "Strong match";
  if (score >= 50) return "Worth tightening";
  return "Needs work";
}

/** The headline number, as a ring that fills with the score. */
export function ScoreRing({ score }: ScoreRingProps) {
  const filled = CIRCUMFERENCE * (score / 100);

  return (
    <div className={`ring ring--${band(score)}`}>
      <svg
        className="ring__svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`Match score ${score} percent — ${verdict(score)}`}
      >
        <circle
          className="ring__track"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          className="ring__value"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
          // Start at twelve o'clock rather than three.
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>

      <div className="ring__readout" aria-hidden="true">
        <span className="ring__number">{score}</span>
        <span className="ring__unit">%</span>
      </div>

      <p className="ring__verdict">{verdict(score)}</p>
    </div>
  );
}
