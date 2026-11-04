import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { SESSION_COOKIE, dropSession } from "@/lib/dh/session";

export async function POST() {
  if (!DH_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  const jar = await cookies();
  dropSession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
