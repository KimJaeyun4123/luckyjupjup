import { KAKAO_API, type KakaoConfig, TOKEN_FILE, freshToken } from "./token";

/** 카카오 텍스트 템플릿은 200자까지다. 줄 단위로 잘라 여러 번 보낸다 */
export const TEXT_LIMIT = 200;

/** 텔레그램용 HTML 을 카카오용 평문으로 */
export const htmlToPlain = (s: string) =>
  s
    .replace(/<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>/g, "$2 $1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

export function chunkText(text: string, limit = TEXT_LIMIT): string[] {
  const out: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    const piece = line.length > limit ? line.slice(0, limit - 1) + "…" : line;
    const next = cur ? `${cur}\n${piece}` : piece;
    if (next.length > limit) {
      if (cur) out.push(cur);
      cur = piece;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

/** '나에게 보내기'. 링크를 주면 첫 메시지에 버튼으로 붙는다 */
export async function sendToMe(cfg: KakaoConfig, text: string, link?: string, file = TOKEN_FILE): Promise<void> {
  const token = await freshToken(cfg, file);
  const chunks = chunkText(htmlToPlain(text));
  for (let i = 0; i < chunks.length; i++) {
    const template = {
      object_type: "text",
      text: chunks[i],
      link: { web_url: link ?? "https://www.dhlottery.co.kr/", mobile_web_url: link ?? "https://www.dhlottery.co.kr/" },
      ...(i === 0 && link ? { button_title: "행운줍줍에서 보기" } : {}),
    };
    const res = await fetch(`${KAKAO_API}/v2/api/talk/memo/default/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({ template_object: JSON.stringify(template) }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`카카오톡 전송 실패: HTTP ${res.status} ${body.slice(0, 200)}`);
    }
  }
}
