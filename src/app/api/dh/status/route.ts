import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { SESSION_COOKIE, getSession, maskId } from "@/lib/dh/session";

/** 로그인 여부와 예치금만 가볍게 돌려준다 (결과 화면의 구매 버튼용) */
export async function GET() {
  if (!DH_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  const client = getSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!client) return NextResponse.json({ loggedIn: false });
  try {
    return NextResponse.json({ loggedIn: true, userId: maskId(client.userId), balance: await client.balance() });
  } catch {
    return NextResponse.json({ loggedIn: false });
  }
}
