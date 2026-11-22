import { NextResponse } from "next/server";
import { registry } from "@/lib/registry";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ users: [...registry.values()] });
}
