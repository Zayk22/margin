import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { pushSync, pullSync } from "../../../server/sync";
import { OutboxOp } from "../../../lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const ops: OutboxOp[] = body.ops;
    if (!Array.isArray(ops) || ops.length === 0) {
      return NextResponse.json({ accepted: [], rejected: [] });
    }

    const result = await pushSync(userId, ops);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync push error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    let since = parseInt(url.searchParams.get("since") || "0", 10);
    if (isNaN(since) || since < 0) since = 0;

    let limit = parseInt(url.searchParams.get("limit") || "500", 10);
    if (isNaN(limit)) limit = 500;
    limit = Math.max(1, Math.min(limit, 500));

    const result = await pullSync(userId, since, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync pull error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}