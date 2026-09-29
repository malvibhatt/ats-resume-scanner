import type { TextItem } from "pdfjs-dist/types/src/display/api";

/**
 * pdf.js and mammoth are large — together they roughly quadruple the bundle.
 * Both are loaded on demand so that pasting text, or uploading a format that
 * needs neither, costs nothing.
 */
async function loadPdfjs() {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

/** Largest file we will try to read, in bytes. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type SupportedFormat = "pdf" | "docx" | "text";

/** Accept attribute for a file input that matches what this module can read. */
export const FILE_ACCEPT = ".pdf,.docx,.txt,.md";

/**
 * Thrown when a file cannot be read. The message is written for the user, so it
 * can be rendered directly rather than mapped to another string.
 */
export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

function formatOf(file: File): SupportedFormat {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".txt") || name.endsWith(".md")) return "text";

  // Fall back to the MIME type, since some browsers and drag sources give a
  // file no extension at all.
  if (file.type === "application/pdf") return "pdf";
  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (file.type.startsWith("text/")) return "text";

  if (name.endsWith(".doc")) {
    throw new ExtractionError(
      "Legacy .doc files aren't supported. Re-save it as .docx or PDF and try again.",
    );
  }
  if (name.endsWith(".pages")) {
    throw new ExtractionError(
      "Pages files aren't supported. Export to PDF or Word and try again.",
    );
  }

  throw new ExtractionError(
    "Unsupported file type. Upload a PDF, DOCX, or plain text file.",
  );
}

/**
 * Collapse the whitespace that document extraction leaves behind, while keeping
 * line breaks — the keyword pass uses them to find section headings.
 */
export function normalizeWhitespace(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    // Non-breaking and other Unicode space separators; PDFs are full of them,
    // and left alone they read as word characters during tokenizing.
    .replace(/\p{Zs}/gu, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    // Any run of blank lines means the same thing as one blank line.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);

      try {
        const content = await page.getTextContent();
        let text = "";

        for (const item of content.items) {
          // Marked-content items carry no text and have no `str`.
          if (!("str" in item)) continue;
          const textItem = item as TextItem;
          text += textItem.str;
          // pdf.js reports line breaks separately from the glyph runs.
          if (textItem.hasEOL) text += "\n";
        }

        pages.push(text);
      } finally {
        page.cleanup();
      }
    }

    return pages.join("\n\n");
  } finally {
    // Tears down the document and its worker port.
    await loadingTask.destroy();
  }
}

async function extractDocx(file: File): Promise<string> {
  const { default: mammoth } = await import("mammoth");
  const { value } = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  return value;
}

/**
 * Read a resume or job description out of a file.
 *
 * Everything happens in the browser — the file is never uploaded.
 */
export async function extractText(file: File): Promise<string> {
  if (file.size === 0) {
    throw new ExtractionError("That file is empty.");
  }
  if (file.size > MAX_FILE_BYTES) {
    const limitMb = Math.round(MAX_FILE_BYTES / 1024 / 1024);
    throw new ExtractionError(`That file is larger than ${limitMb}MB.`);
  }

  const format = formatOf(file);

  let raw: string;
  try {
    if (format === "pdf") raw = await extractPdf(file);
    else if (format === "docx") raw = await extractDocx(file);
    else raw = await file.text();
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError(
      format === "pdf"
        ? "That PDF couldn't be read. It may be password-protected or corrupted."
        : "That file couldn't be read. It may be corrupted.",
    );
  }

  const text = normalizeWhitespace(raw);

  if (!text) {
    throw new ExtractionError(
      format === "pdf"
        ? "No text found in that PDF. If it's a scan, the text is an image — export a text-based PDF instead."
        : "No text found in that file.",
    );
  }

  return text;
}
