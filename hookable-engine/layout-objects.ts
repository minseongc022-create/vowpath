/**
 * 4단계 — 생성(Generate): 편집 가능한 코드 객체 조립
 *
 * Hookable은 텍스트·이미지·섹션을 "편집 가능한 코드 객체"로 만들어 캔버스에서
 * 드래그앤드롭/AI 채팅으로 고칠 수 있게 한다. 이 모듈은 그 데이터 모델(누가
 * 무엇을 어떤 섹션에 왜 넣었는지 추적 가능한 구조)만 재현한다 — 실제 드래그앤
 * 드롭 캔버스 UI는 만들지 않는다(요청 범위 밖: "기능만").
 */

import type { CodeObject, CopyDraft, DetailPageDocument, ProductInput, SectionPlan } from "./types";

export const LAYOUT_OBJECTS_VERSION = "1.0";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

/** 섹션마다 이미지를 몇 장씩 배정할지 — features가 가장 많이 가져간다 */
function imageBudget(kind: string): number {
  if (kind === "hook") return 1;
  if (kind === "features") return 3;
  if (kind === "proof") return 1;
  return 0;
}

export function buildDocument(input: ProductInput, plan: SectionPlan, copy: CopyDraft): DetailPageDocument {
  counter = 0;
  const objects: CodeObject[] = [];
  const sectionOrder = plan.sections.map((s) => s.kind);

  let imageCursor = 0;
  const takeImages = (n: number): string[] => {
    const slice = input.imageUrls.slice(imageCursor, imageCursor + n);
    imageCursor += slice.length;
    return slice;
  };

  for (const planned of plan.sections) {
    const sectionCopy = copy.sections.find((c) => c.kind === planned.kind);
    const childIds: string[] = [];
    const sectionId = nextId("section");

    if (sectionCopy?.heading) {
      const headingId = nextId("text");
      objects.push({ id: headingId, type: "text", sectionKind: planned.kind, role: "heading", content: sectionCopy.heading });
      childIds.push(headingId);
    }

    for (const paragraph of sectionCopy?.body ?? []) {
      const bodyId = nextId("text");
      objects.push({ id: bodyId, type: "text", sectionKind: planned.kind, role: "body", content: paragraph });
      childIds.push(bodyId);
    }

    const images = takeImages(imageBudget(planned.kind));
    for (const src of images) {
      const imgId = nextId("image");
      objects.push({ id: imgId, type: "image", sectionKind: planned.kind, src, alt: input.name });
      childIds.push(imgId);
    }

    if (sectionCopy?.rows?.length) {
      const tableId = nextId("table");
      objects.push({ id: tableId, type: "table", sectionKind: planned.kind, rows: sectionCopy.rows });
      childIds.push(tableId);
    }

    if (sectionCopy?.qa?.length) {
      const qaId = nextId("qa");
      objects.push({ id: qaId, type: "qa", sectionKind: planned.kind, items: sectionCopy.qa });
      childIds.push(qaId);
    }

    objects.push({ id: sectionId, type: "section", kind: planned.kind, order: planned.order, childIds });
  }

  return { objects, sectionOrder };
}
