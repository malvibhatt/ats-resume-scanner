import { useId, useRef, useState } from "react";
import { extractText, ExtractionError, FILE_ACCEPT } from "../lib/extractText";

interface DocumentInputProps {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * One document: paste it, pick a file, or drop a file on the box.
 */
export function DocumentInput({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: DocumentInputProps) {
  const textareaId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function readFile(file: File) {
    setReading(true);
    setError(null);

    try {
      const text = await extractText(file);
      onChange(text);
      setFilename(file.name);
    } catch (cause) {
      // Extraction errors are already written for the reader.
      setError(
        cause instanceof ExtractionError
          ? cause.message
          : "That file couldn't be read.",
      );
      setFilename(null);
    } finally {
      setReading(false);
    }
  }

  function handleTyping(text: string) {
    onChange(text);
    // Once it has been edited by hand, it is no longer just the file.
    setFilename(null);
    setError(null);
  }

  function clear() {
    onChange("");
    setFilename(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const words = countWords(value);

  return (
    <section className="doc">
      <header className="doc__header">
        <div>
          <h2 className="doc__label">
            <label htmlFor={textareaId}>{label}</label>
          </h2>
          <p className="doc__hint">{hint}</p>
        </div>

        <div className="doc__actions">
          <button
            type="button"
            className="button button--quiet"
            onClick={() => fileInput.current?.click()}
            disabled={reading}
          >
            {reading ? "Reading…" : "Upload file"}
          </button>
          {value && (
            <button type="button" className="button button--quiet" onClick={clear}>
              Clear
            </button>
          )}
        </div>
      </header>

      <input
        ref={fileInput}
        type="file"
        className="doc__file"
        accept={FILE_ACCEPT}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readFile(file);
        }}
      />

      <textarea
        id={textareaId}
        className={`doc__text ${dragging ? "doc__text--dragging" : ""}`}
        placeholder={placeholder}
        value={value}
        spellCheck={false}
        onChange={(event) => handleTyping(event.target.value)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void readFile(file);
        }}
      />

      <footer className="doc__footer">
        {error ? (
          <p className="doc__error" role="alert">
            {error}
          </p>
        ) : (
          <p className="doc__status">
            {filename && <span className="doc__filename">{filename}</span>}
            {words > 0 && `${words.toLocaleString()} word${words === 1 ? "" : "s"}`}
          </p>
        )}
      </footer>
    </section>
  );
}
