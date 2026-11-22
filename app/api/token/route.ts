import crypto from "crypto";
import { NextResponse } from "next/server";
import { registry } from "@/lib/registry";

// Issues a Nexconn user token. The App Secret never leaves the server.
export async function POST(req: Request) {
  const { userId, name, subject } = await req.json();
  if (!/^[a-zA-Z0-9_-]{2,32}$/.test(userId || "")) {
    return NextResponse.json({ error: "Username: 2-32 letters, numbers, _ or -" }, { status: 400 });
  }
  const key = process.env.NEXT_PUBLIC_NEXCONN_APP_KEY, secret = process.env.NEXCONN_APP_SECRET;
  if (!key || !secret) return NextResponse.json({ error: "Server is missing App Key/Secret" }, { status: 500 });

  const nonce = crypto.randomBytes(8).toString("hex");
  const ts = String(Date.now());
  const sig = crypto.createHash("sha1").update(secret + nonce + ts).digest("hex");
  const host = process.env.NEXCONN_API_HOST || "api.sg-light-api.com";
  const displayName = name || userId;

  const r = await fetch(`https://${host}/v4/auth/access-token/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "App-Key": key, Nonce: nonce, Timestamp: ts, Signature: sig },
    body: JSON.stringify({
      userId,
      name: displayName,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`,
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  const token = j?.result?.accessToken;
  if (j?.code !== 0 || !token) {
    return NextResponse.json({ error: "Token request failed", detail: j }, { status: 502 });
  }

  registry.set(userId, { userId, name: displayName, subject: subject || "", seen: Date.now() });
  return NextResponse.json({ token });
}