/**
 * Estimate the token count of a text string.
 * Uses ~4 chars per token, a standard approximation for English/code content.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
