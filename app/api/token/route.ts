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
  if (!key || !secret) return NextResponse.json({ error: "Missing on server: " + (!key ? "NEXT_PUBLIC_NEXCONN_APP_KEY " : "") + (!secret ? "NEXCONN_APP_SECRET" : "") }, { status: 500 });

  const nonce = crypto.randomBytes(8).toString("hex");
  const ts = String(Date.now());
  const sig = crypto.createHash("sha1").update(secret + nonce + ts).digest("hex");
  const host = process.env.NEXCONN_API_HOST || "api.sg-light-api.com";
  // VERIFY: path/body field names against Nexconn Server API docs if this returns an error.
  const r = await fetch(`https://${host}/v4/auth/access-token/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "App-Key": key, Nonce: nonce, Timestamp: ts, Signature: sig },
    body: JSON.stringify({ user_id: userId, id: userId, name: name || userId }),
  });
  const j: any = await r.json().catch(() => ({}));
  const token = j.token ?? j.data?.token ?? j.access_token ?? j.data?.access_token;
  if (!token) return NextResponse.json({ error: "Token request failed", detail: j }, { status: 502 });

  registry.set(userId, { userId, name: name || userId, subject: subject || "", seen: Date.now() });
  return NextResponse.json({ token });
}