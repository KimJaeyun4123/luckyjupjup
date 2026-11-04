import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { authorizeUrl, kakaoConfig } from "@/lib/kakao/token";

/** 카카오 로그인으로 보낸다 (talk_message 동의). 로컬·개인 배포 전용 */
export async function GET() {
  if (!DH_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  const cfg = kakaoConfig();
  if (!cfg) return NextResponse.json({ error: "KAKAO_REST_API_KEY 가 설정되어 있지 않습니다." }, { status: 400 });
  const state = randomBytes(16).toString("base64url");
  (await cookies()).set("lj_kakao_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(authorizeUrl(cfg, state));
}
