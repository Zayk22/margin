import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { pushSync, pullSync } from "../../../server/sync";
import { OutboxOp } from "../../../lib/types";

export const runtime = "nodejs"; // Ensure Neon WebSocket pool works

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const ops: OutboxOp[] = body.ops;

    if (!Array.isArray(ops) || ops.length === 0) {
      return NextResponse.json({ accepted: [] });
    }

    const accepted = await pushSync(userId, ops);
    return NextResponse.json({ accepted });
  } catch (error) {
    console.error("Sync push error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const since = parseInt(url.searchParams.get("since") || "0", 10);
    const limit = parseInt(url.searchParams.get("limit") || "500", 10);

    const result = await pullSync(userId, since, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync pull error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}