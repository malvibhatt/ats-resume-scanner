import { describe, expect, it } from "vitest";
import { segment, tokenize } from "./tokenize";

const words = (text: string) => tokenize(text).map((t) => t.word);

describe("tokenize", () => {
  it("keeps technology names intact", () => {
    // Splitting these is the single most damaging thing a resume tokenizer can
    // do — they are exactly the keywords that matter.
    expect(words("Node.js")).toEqual(["node.js"]);
    expect(words("CI/CD")).toEqual(["ci/cd"]);
    expect(words("C++")).toEqual(["c++"]);
    expect(words("C#")).toEqual(["c#"]);
    expect(words("full-stack")).toEqual(["full-stack"]);
    expect(words("ASP.NET")).toEqual(["asp.net"]);
    expect(words("Vue.js and React")).toEqual(["vue.js", "and", "react"]);
  });

  it("drops sentence punctuation but keeps internal dots", () => {
    expect(words("We use Node.js. It is fast.")).toEqual([
      "we", "use", "node.js", "it", "is", "fast",
    ]);
  });

  it("handles commas, parens, and slashes between words", () => {
    expect(words("React, Redux (Toolkit)")).toEqual([
      "react", "redux", "toolkit",
    ]);
  });

  it("keeps version and range numbers", () => {
    expect(words("5+ years")).toEqual(["5+", "years"]);
    expect(words("Python 3.11")).toEqual(["python", "3.11"]);
  });

  it("ignores empty and symbol-only input", () => {
    expect(words("")).toEqual([]);
    expect(words("   \n  ")).toEqual([]);
    expect(words("--- *** ///")).toEqual([]);
  });
});

describe("segment", () => {
  it("does not let phrases form across a sentence boundary", () => {
    const segments = segment("We use React. Node powers the API.");
    expect(segments.map((s) => s.tokens.map((t) => t.word))).toEqual([
      ["we", "use", "react"],
      ["node", "powers", "the", "api"],
    ]);
  });

  it("splits on line breaks and bullets", () => {
    const segments = segment("• React\n• Node.js\n• GraphQL");
    expect(segments.map((s) => s.tokens.map((t) => t.word))).toEqual([
      ["react"],
      ["node.js"],
      ["graphql"],
    ]);
  });

  it("records the line each segment came from", () => {
    const segments = segment("Requirements\nReact experience\nNode experience");
    expect(segments.map((s) => s.line)).toEqual([0, 1, 2]);
  });

  it("splits list items joined by semicolons", () => {
    const segments = segment("React; Node; GraphQL");
    expect(segments).toHaveLength(3);
  });
});
