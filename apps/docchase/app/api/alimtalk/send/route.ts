import { NextResponse } from "next/server";
import { sendAlimtalk, sendAlimtalkMany, type AlimtalkSendInput } from "@/lib/alimtalk";

export const runtime = "nodejs";

type Body = {
  messages?: AlimtalkSendInput[];
  message?: AlimtalkSendInput;
  /** When false, always practice even if Solapi is configured */
  preferLive?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const list = body.messages?.length
      ? body.messages
      : body.message
        ? [body.message]
        : [];
    if (!list.length) {
      return NextResponse.json({ error: "messages 필요" }, { status: 400 });
    }
    if (list.length > 80) {
      return NextResponse.json({ error: "한 번에 80건까지" }, { status: 400 });
    }

    for (const m of list) {
      if (!m.to || !m.officeName || !m.clientName) {
        return NextResponse.json({ error: "to, officeName, clientName 필수" }, { status: 400 });
      }
    }

    const forcePractice = body.preferLive === false;
    const opts = { forcePractice };

    if (list.length === 1) {
      const result = await sendAlimtalk(list[0], opts);
      return NextResponse.json({
        ok: result.ok,
        results: [result],
        liveCount: result.ok && result.mode === "live" ? 1 : 0,
        practiceCount: result.ok && result.mode === "practice" ? 1 : 0,
        failCount: result.ok ? 0 : 1,
      });
    }

    const batch = await sendAlimtalkMany(list, opts);
    return NextResponse.json({ ok: batch.failCount === 0, ...batch });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "발송 오류" },
      { status: 500 },
    );
  }
}
