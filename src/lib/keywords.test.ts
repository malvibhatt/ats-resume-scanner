import { describe, expect, it } from "vitest";
import { extractKeywords, MAX_KEYWORDS } from "./keywords";

/** A posting with the shape real ones have: headings, bullets, and filler. */
const JOB_DESCRIPTION = `Senior Frontend Engineer

About Us
We are a fast-growing fintech company on a mission to make banking simple.
Our team is distributed across 12 countries and we love what we do.

What You'll Do
- Build and ship user-facing features in React and TypeScript
- Partner with designers to turn Figma mocks into accessible interfaces
- Improve application performance and Core Web Vitals
- Review code and mentor junior engineers

Requirements
- 5+ years of professional frontend development experience
- Expert knowledge of React, including hooks and state management
- Strong TypeScript skills and experience with modern build tooling
- Experience with REST APIs and GraphQL
- Solid understanding of web accessibility standards
- Experience writing unit and integration tests with Jest

Nice to Have
- Experience with Next.js or server-side rendering
- Familiarity with CI/CD pipelines and Docker
- Background in design systems

Benefits
- Competitive salary and equity
- Unlimited paid time off and flexible working hours
- Annual learning budget and conference travel

We are an equal opportunity employer and welcome applicants from all backgrounds.`;

const keywords = extractKeywords(JOB_DESCRIPTION);
const texts = keywords.map((k) => k.text.toLowerCase());
const weightOf = (text: string) =>
  keywords.find((k) => k.text.toLowerCase() === text)?.weight ?? 0;

describe("extractKeywords", () => {
  it("finds the technologies the posting is actually about", () => {
    for (const expected of ["react", "typescript", "graphql", "jest", "docker"]) {
      expect(texts, `missing ${expected}`).toContain(expected);
    }
  });

  it("keeps technology names whole", () => {
    expect(texts).toContain("next.js");
    expect(texts.some((t) => t.includes("ci/cd"))).toBe(true);
    // If the tokenizer had split these, the halves would show up instead.
    expect(texts).not.toContain("cd");
  });

  it("ranks a named technology above an ordinary word used as often", () => {
    // Docker and "performance" are each mentioned once. Only one of them is
    // worth telling someone they are missing.
    expect(weightOf("docker")).toBeGreaterThan(weightOf("performance"));
  });

  it("reports one entry per idea, not every sub-phrase", () => {
    // "Core Web Vitals" also yields "Core Web", "Web Vitals", and "Vitals".
    expect(texts).toContain("core web vitals");
    expect(texts).not.toContain("core web");
    expect(texts).not.toContain("web vitals");
  });

  it("drops boilerplate that appears in every posting", () => {
    for (const noise of [
      "experience", "team", "years", "strong", "skills", "knowledge",
      "work", "ability", "company", "requirements",
    ]) {
      expect(texts, `${noise} should not be a keyword`).not.toContain(noise);
    }
  });

  it("drops grammar and fragments", () => {
    for (const fragment of ["the", "and", "with", "of", "we are", "of react"]) {
      expect(texts).not.toContain(fragment);
    }
    // Nothing may begin or end on a stopword.
    for (const keyword of keywords) {
      expect(keyword.text.toLowerCase()).not.toMatch(/^(the|and|with|of|in|to|a|an)\s/);
      expect(keyword.text.toLowerCase()).not.toMatch(/\s(the|and|with|of|in|to|a|an)$/);
    }
  });

  it("weights a requirement above a perk", () => {
    // "react" is listed under Requirements; "salary" under Benefits. If the
    // section weighting does nothing, these come out level.
    expect(weightOf("react")).toBeGreaterThan(weightOf("salary"));
    expect(weightOf("typescript")).toBeGreaterThan(weightOf("conference travel"));
  });

  it("recognises a heading even when it is plural", () => {
    // Regression: the patterns once ended in \b, so "requirement" could never
    // match the word "Requirements" that actually appears in postings. Section
    // weighting silently did nothing.
    const plural = extractKeywords(
      "Requirements\n- Kubernetes\n\nBenefits\n- Massage",
    );
    const kubernetes = plural.find((k) => k.text.toLowerCase() === "kubernetes");
    const massage = plural.find((k) => k.text.toLowerCase() === "massage");

    expect(kubernetes).toBeDefined();
    expect(kubernetes!.weight).toBeGreaterThan(massage?.weight ?? 0);
  });

  it("does not mistake a bullet for a heading", () => {
    // "- Competitive salary and equity" is short and mentions salary, so a
    // naive heading check re-weights every bullet after it as a perk.
    const withBullets = extractKeywords(
      "Requirements\n- Competitive salary and equity\n- Kubernetes and Terraform",
    );
    const kubernetes = withBullets.find(
      (k) => k.text.toLowerCase() === "kubernetes",
    );

    expect(kubernetes).toBeDefined();
    // Still carrying the Requirements weight, not the perk weight.
    expect(kubernetes!.weight).toBeGreaterThan(1);
  });

  it("does not report the heading words themselves", () => {
    for (const heading of ["benefits", "requirements", "nice"]) {
      expect(texts, `${heading} is a heading, not a skill`).not.toContain(heading);
    }
  });

  it("drops contraction fragments", () => {
    // "What You'll Do" once produced a keyword called "ll".
    expect(texts).not.toContain("ll");
    expect(texts).not.toContain("s");
  });

  it("weights a phrase above the single words inside it", () => {
    const phrase = keywords.find((k) => k.size > 1);
    expect(phrase).toBeDefined();
  });

  it("never exceeds the cap and returns sorted, unique keywords", () => {
    expect(keywords.length).toBeLessThanOrEqual(MAX_KEYWORDS);

    const keys = keywords.map((k) => k.key);
    expect(new Set(keys).size, "duplicate keys").toBe(keys.length);

    for (let i = 1; i < keywords.length; i++) {
      expect(keywords[i - 1].weight).toBeGreaterThanOrEqual(keywords[i].weight);
    }
  });

  it("reports phrase length and count honestly", () => {
    for (const keyword of keywords) {
      expect(keyword.size).toBe(keyword.stems.length);
      expect(keyword.size).toBeGreaterThanOrEqual(1);
      expect(keyword.size).toBeLessThanOrEqual(3);
      expect(keyword.count).toBeGreaterThan(0);
      expect(keyword.weight).toBeGreaterThan(0);
    }
  });

  it("returns nothing for empty or contentless input", () => {
    expect(extractKeywords("")).toEqual([]);
    expect(extractKeywords("   \n\n  ")).toEqual([]);
    expect(extractKeywords("the and of with to a an")).toEqual([]);
  });
});
