import { describe, expect, it } from "vitest";
import { stem } from "./stem";

describe("stem", () => {
  it("collapses every inflection of a word onto one key", () => {
    // The whole point of the stemmer: these must agree, or a resume saying
    // "managed a team" will not match a posting asking for "management".
    const families = [
      ["manage", "manages", "managed", "managing", "manager", "management"],
      ["develop", "develops", "developed", "developing", "developer", "development"],
      ["deploy", "deploys", "deployed", "deploying", "deployment"],
      ["build", "builds", "building"],
      ["test", "tests", "tested", "testing"],
      ["design", "designs", "designed", "designing", "designer"],
      ["lead", "leads", "leading"],
      ["analyze", "analyzes", "analyzed", "analyzing"],
      ["program", "programs", "programmed", "programming"],
      ["plan", "plans", "planned", "planning"],
      ["optimize", "optimizes", "optimized", "optimizing"],
      ["collaborate", "collaborates", "collaborated", "collaborating"],
      ["library", "libraries"],
      ["priority", "priorities"],
    ];

    for (const family of families) {
      const keys = family.map(stem);
      const unique = new Set(keys);
      expect(
        unique.size,
        `${family.join(", ")} produced ${[...unique].join(", ")}`,
      ).toBe(1);
    }
  });

  it("leaves tech tokens untouched", () => {
    for (const token of ["node.js", "c++", "c#", "ci/cd", "s3", "ec2", ".net", "d3"]) {
      expect(stem(token)).toBe(token);
    }
  });

  it("lowercases", () => {
    expect(stem("React")).toBe("react");
    expect(stem("TypeScript")).toBe("typescript");
  });

  it("does not merge unrelated words", () => {
    // Over-stemming is worse than under-stemming: it reports matches that
    // aren't real.
    const mustDiffer: Array<[string, string]> = [
      ["university", "universal"],
      ["business", "busy"],
      ["testing", "testable"],
      ["react", "reactive"],
      ["data", "database"],
      ["java", "javascript"],
      ["organize", "organic"],
    ];

    for (const [a, b] of mustDiffer) {
      expect(stem(a), `${a} vs ${b}`).not.toBe(stem(b));
    }
  });

  it("does not stem short words into stubs", () => {
    for (const word of ["is", "as", "us", "api", "ops", "aws", "css", "ios"]) {
      expect(stem(word).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("is idempotent", () => {
    // Stemming an already-stemmed word must not change it again, or keys
    // computed at different points will disagree.
    const words = [
      "management", "programming", "libraries", "deployed", "analytics",
      "engineering", "requirements", "responsibilities", "qualifications",
      "communication", "accessibility", "kubernetes", "react", "testing",
    ];

    for (const word of words) {
      const once = stem(word);
      expect(stem(once), `${word} -> ${once} -> ${stem(once)}`).toBe(once);
    }
  });
});
