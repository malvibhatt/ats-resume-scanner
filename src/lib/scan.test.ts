import { describe, expect, it } from "vitest";
import { scan } from "./scan";

const JOB_DESCRIPTION = `Senior Frontend Engineer

Requirements
- Expert knowledge of React and TypeScript
- Experience with GraphQL and REST APIs
- Familiarity with Docker and CI/CD pipelines
- Strong understanding of web accessibility

Nice to Have
- Experience with Next.js

Benefits
- Competitive salary`;

const has = (list: { text: string }[], text: string) =>
  list.some((k) => k.text.toLowerCase() === text.toLowerCase());

describe("scan", () => {
  it("scores a resume that covers everything near the top", () => {
    const resume = `Frontend Engineer
      Built React and TypeScript applications.
      Worked with GraphQL and REST APIs daily.
      Shipped with Docker and CI/CD pipelines.
      Strong focus on web accessibility.
      Side projects in Next.js.`;

    expect(scan(resume, JOB_DESCRIPTION).score).toBeGreaterThan(80);
  });

  it("scores an unrelated resume near the bottom", () => {
    const resume = `Pastry Chef
      Ran a bakery kitchen for nine years.
      Trained apprentices in laminated dough and sugar work.`;

    expect(scan(resume, JOB_DESCRIPTION).score).toBeLessThan(15);
  });

  it("puts every keyword in exactly one bucket", () => {
    const result = scan("React and TypeScript", JOB_DESCRIPTION);
    const bucketed =
      result.matched.length + result.partial.length + result.missing.length;

    expect(bucketed).toBe(result.keywords.length);
  });

  it("reports what is present and what is not", () => {
    const result = scan("I write React and TypeScript every day.", JOB_DESCRIPTION);

    expect(has(result.matched, "react")).toBe(true);
    expect(has(result.matched, "typescript")).toBe(true);
    expect(has(result.missing, "docker")).toBe(true);
    expect(has(result.matched, "docker")).toBe(false);
  });

  it("matches across inflections", () => {
    // The posting says "Engineer"; the resume says "Engineering".
    const result = scan("Engineering manager who has managed React teams", JOB_DESCRIPTION);
    expect(has(result.missing, "react")).toBe(false);
  });

  it("matches a phrase that a PDF wrapped onto two lines", () => {
    // pdf.js inserts a newline wherever the column ended, so a resume that
    // plainly says "CI/CD pipelines" arrives with a break in the middle.
    const wrapped = scan("Owned our CI/CD\npipelines end to end.", JOB_DESCRIPTION);
    const inline = scan("Owned our CI/CD pipelines end to end.", JOB_DESCRIPTION);

    expect(wrapped.score).toBe(inline.score);
    expect(has(wrapped.matched, "ci/cd pipelines")).toBe(true);
  });

  it("does not join a phrase across a sentence break", () => {
    // "React. Native" is two sentences, not React Native.
    const result = scan("I use React. Native apps are not my focus.", JOB_DESCRIPTION);
    const phrases = result.matched.filter((k) => k.size > 1);

    for (const phrase of phrases) {
      expect(phrase.text.toLowerCase()).not.toBe("react native");
    }
  });

  it("gives partial credit for scattered words, but less than for the phrase", () => {
    const scattered = scan("Accessibility matters. I build for the web.", JOB_DESCRIPTION);
    const exact = scan("Deep experience with web accessibility.", JOB_DESCRIPTION);

    expect(exact.score).toBeGreaterThan(scattered.score);
  });

  it("weights a requirement above a perk", () => {
    const requirement = scan("React React React", JOB_DESCRIPTION);
    const perk = scan("Competitive salary", JOB_DESCRIPTION);

    expect(requirement.score).toBeGreaterThan(perk.score);
  });

  it("is not thrown by empty input", () => {
    expect(scan("", JOB_DESCRIPTION).score).toBe(0);
    expect(scan("React", "").score).toBe(0);
    expect(scan("", "").keywords).toEqual([]);
    expect(scan("", "").missing).toEqual([]);
  });

  it("never reports a score outside 0 to 100", () => {
    const resumes = ["", "React", JOB_DESCRIPTION, "x".repeat(5000)];

    for (const resume of resumes) {
      const { score } = scan(resume, JOB_DESCRIPTION);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(score)).toBe(true);
    }
  });

  it("scores the job description against itself close to perfect", () => {
    // Every keyword came from this text, so anything well short of 100 means
    // the matcher is failing to find terms the extractor just produced.
    expect(scan(JOB_DESCRIPTION, JOB_DESCRIPTION).score).toBeGreaterThanOrEqual(99);
  });

  it("orders each list by weight, strongest first", () => {
    const { missing } = scan("nothing relevant here", JOB_DESCRIPTION);

    for (let i = 1; i < missing.length; i++) {
      expect(missing[i - 1].weight).toBeGreaterThanOrEqual(missing[i].weight);
    }
  });
});
