import { NextResponse } from "next/server";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { sendToMe } from "@/lib/kakao/send";
import { kakaoConfig } from "@/lib/kakao/token";

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  try {
    return !!origin && !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** 연결 확인용 테스트 메시지를 내 카카오톡으로 보낸다 */
export async function POST(req: Request) {
  if (!DH_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const cfg = kakaoConfig();
  if (!cfg) return NextResponse.json({ error: "KAKAO_REST_API_KEY 가 설정되어 있지 않습니다." }, { status: 400 });
  try {
    await sendToMe(cfg, `🍀 행운줍줍 카카오톡 연결 확인\n${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}\n금요일 구매·토요일 결과가 이 채팅으로 옵니다.`, `${process.env.LOTTO_SITE_URL ?? "https://gyulngyul.vercel.app/lotto"}/my`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
