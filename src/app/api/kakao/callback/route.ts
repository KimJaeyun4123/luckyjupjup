import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { exchangeCode, kakaoConfig } from "@/lib/kakao/token";

/** 카카오 인가 코드를 토큰으로 바꿔 agent/kakao-token.json 에 저장하고 /dh 로 돌아간다 */
export async function GET(req: Request) {
  if (!DH_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  const cfg = kakaoConfig();
  if (!cfg) return NextResponse.json({ error: "KAKAO_REST_API_KEY 가 설정되어 있지 않습니다." }, { status: 400 });
  const u = new URL(req.url);
  const back = (msg: string) => NextResponse.redirect(new URL(`/lotto/dh?kakao=${encodeURIComponent(msg)}`, u.origin));
  const err = u.searchParams.get("error");
  if (err) return back(`실패: ${u.searchParams.get("error_description") ?? err}`);
  const jar = await cookies();
  const state = jar.get("lj_kakao_state")?.value;
  jar.delete("lj_kakao_state");
  if (!state || state !== u.searchParams.get("state")) return back("실패: state 가 맞지 않습니다. 다시 시도하세요.");
  const code = u.searchParams.get("code");
  if (!code) return back("실패: 인가 코드가 없습니다.");
  try {
    await exchangeCode(cfg, code);
    return back("연결됨");
  } catch (e) {
    return back(`실패: ${(e as Error).message}`);
  }
}
