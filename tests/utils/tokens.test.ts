import { describe, it, expect } from "vitest";
import { estimateTokens } from "../../src/utils/tokens";

describe("estimateTokens", () => {
  it("estimates ~4 chars per token", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
  });

  it("rounds up for partial tokens", () => {
    expect(estimateTokens("abc")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("handles longer content", () => {
    const text = "x".repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });
});
