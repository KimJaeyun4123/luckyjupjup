import { NextResponse } from "next/server";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { kakaoConfig, loadToken } from "@/lib/kakao/token";

/** 카카오 연결 상태: 키 설정 여부, 토큰 유무·만료 */
export async function GET() {
  if (!DH_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  const cfg = kakaoConfig();
  const t = loadToken();
  return NextResponse.json({
    configured: !!cfg,
    redirectUri: cfg?.redirectUri,
    connected: !!t && t.refresh_expires_at > Date.now(),
    connectedAt: t?.connected_at,
    refreshExpiresAt: t ? new Date(t.refresh_expires_at).toISOString() : undefined,
  });
}
