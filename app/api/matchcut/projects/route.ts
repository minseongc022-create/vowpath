import { NextResponse } from "next/server";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "@/lib/matchcut/projects-store";
import { requireMatchCutSession } from "@/lib/matchcut/session";

export async function GET(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const project = await getProject(session.sub, id);
      if (!project) {
        return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, project });
    }
    const projects = await listProjects(session.sub);
    return NextResponse.json({
      ok: true,
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        sourceUrl: p.sourceUrl,
        platform: p.platform,
        status: p.status,
        creditsUsed: p.creditsUsed,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        hasAngles: Boolean(p.generatedAngles?.length),
      })),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "목록 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const project = await createProject({
      userId: session.sub,
      title: String(body.title ?? ""),
      sourceUrl: String(body.sourceUrl ?? ""),
      platform: body.platform,
      listing: body.listing,
      match: body.match,
      selectedCandidate: body.selectedCandidate,
      creditsUsed: Number(body.creditsUsed ?? 0),
    });
    return NextResponse.json({ ok: true, project });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "id 필요" }, { status: 400 });
    }
    const project = await updateProject(session.sub, id, {
      title: body.title,
      status: body.status,
      selectedCandidate: body.selectedCandidate,
      generatedAngles: body.generatedAngles,
      detailPageHtml: body.detailPageHtml,
      creditsUsed: body.creditsUsed,
      match: body.match,
      listing: body.listing,
    });
    if (!project) {
      return NextResponse.json({ error: "없음" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, project });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id 필요" }, { status: 400 });
    }
    const ok = await deleteProject(session.sub, id);
    return NextResponse.json({ ok });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
