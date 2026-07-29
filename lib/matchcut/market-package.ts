import JSZip from "jszip";
import {
  exportImagesForMarkets,
  type ExportImageInput,
  type ExportedFile,
} from "../sourcing-detail/market-export";
import type { MarketPlatform } from "./constants";

function uploadGuide(platform: MarketPlatform): string {
  return `# 매칭컷 — 마켓 업로드 가이드

생성일: ${new Date().toISOString()}

## 폴더 구조
- coupang/  — 쿠팡 윙 업로드용 JPEG
- smartstore/ — 네이버 스마트스토어 업로드용 JPEG
- README.md — 이 파일

## 쿠팡 윙
1. 쿠팡 윙 → 상품 등록/수정
2. 대표이미지: coupang/*_main_*.jpg (1000×1000)
3. 상세이미지: coupang/*_detail_*.jpg (780×780)
4. 상세설명 HTML이 있으면 상세HTML 영역에 붙여넣기 (detail.html)

## 스마트스토어
1. 스마트스토어 센터 → 상품 등록
2. 대표이미지: smartstore/*_main_*.jpg (1000×1000)
3. 추가이미지: smartstore/*_detail_*.jpg
4. 상세설명: detail.html 내용 붙여넣기 또는 이미지 순서대로 업로드

## 참고
- 직접 API 자동 업로드는 셀러 API 키·승인 후 연동 가능합니다.
- 현재 ZIP은 규격에 맞춰 바로 올리는 패키지입니다.
- 플랫폼: ${platform}
`;
}

export async function buildMarketUploadZip(params: {
  platform: MarketPlatform;
  images: ExportImageInput[];
  detailHtml?: string;
}): Promise<{ base64: string; filename: string; files: ExportedFile[] }> {
  const files = await exportImagesForMarkets({
    platform: params.platform,
    images: params.images,
  });

  const zip = new JSZip();
  zip.file("README.md", uploadGuide(params.platform));
  if (params.detailHtml) {
    zip.file("detail.html", params.detailHtml);
  }

  for (const f of files) {
    const folder = f.platform;
    zip.folder(folder)?.file(f.filename.replace(`${folder}_`, ""), Buffer.from(f.base64, "base64"));
  }

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return {
    base64: Buffer.from(buf).toString("base64"),
    filename: `matchcut-upload-${params.platform}.zip`,
    files,
  };
}
