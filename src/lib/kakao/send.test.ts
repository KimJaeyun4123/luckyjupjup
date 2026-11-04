import { describe, expect, it } from "vitest";
import { chunkText, htmlToPlain } from "./send";

describe("카카오 메시지", () => {
  it("HTML 을 평문으로", () => {
    expect(htmlToPlain('🍀 <b>1247회</b>\n<code>A  1 2 3</code>\n<a href="https://x/lotto">행운줍줍에서 보기</a> &amp; 끝')).toBe("🍀 1247회\nA  1 2 3\n행운줍줍에서 보기 https://x/lotto & 끝");
  });
  it("200자 단위로 줄에서 자른다", () => {
    const lines = Array.from({ length: 12 }, (_, i) => `${i}: ${"가".repeat(30)}`);
    const chunks = chunkText(lines.join("\n"));
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(200);
    expect(chunks.join("\n")).toBe(lines.join("\n"));
  });
  it("한 줄이 200자를 넘으면 자른다", () => {
    const c = chunkText("x".repeat(500));
    expect(c).toHaveLength(1);
    expect(c[0].length).toBe(200);
  });
});
