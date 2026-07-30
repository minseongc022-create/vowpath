import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform, isSupportedListingUrl } from "../../lib/sourcing-detail/platforms.ts";
import {
  extractImageUrlsFromHtml,
  extractSkuOptionsFromHtml,
  dedupeImages,
  toListingImages,
  parse1688OfferData,
  to1688MobileUrl,
} from "../../lib/sourcing-detail/extract-images.ts";
import { MARKET_SPECS } from "../../lib/matchcut/constants.ts";
import { buildDetailPageHtml } from "../../lib/sourcing-detail/detail-layout.ts";
import { countSuccessfulAngles } from "../../lib/sourcing-detail/angle-utils.ts";
import { identityLockPrompt } from "../../lib/sourcing-detail/product-identity.ts";

describe("matchcut constants", () => {
  it("defines coupang and smartstore specs", () => {
    assert.ok(MARKET_SPECS.coupang.length >= 2);
    assert.equal(MARKET_SPECS.coupang[0].width, 1000);
    assert.equal(MARKET_SPECS.smartstore[0].width, 1000);
  });
});

describe("sourcing-detail platforms", () => {
  it("detects 1688", () => {
    assert.equal(detectPlatform("https://detail.1688.com/offer/123.html"), "1688");
  });

  it("detects taobao and tmall", () => {
    assert.equal(detectPlatform("https://item.taobao.com/item.htm?id=1"), "taobao");
    assert.equal(detectPlatform("https://detail.tmall.com/item.htm"), "taobao");
  });

  it("rejects unknown hosts", () => {
    assert.equal(isSupportedListingUrl("https://example.com"), false);
    assert.equal(isSupportedListingUrl("https://detail.1688.com/x"), true);
  });
});

describe("1688 scraper", () => {
  const html = `
    "subject":"测试商品标题"
    "imageList":["https://cbu01.alicdn.com/img/ibank/O1CN_test.jpg","https://cbu01.alicdn.com/img/ibank/O1CN_test2.jpg"]
    "skuMap":{"123456":{"specAttrs":"颜色:黑色","skuPic":"https://img.alicdn.com/sku/black.jpg"}}
    "name":"颜色","value":"黑色","imageUrl":"https://img.alicdn.com/prop/black.jpg"
  `;

  it("parses 1688 title and gallery", () => {
    const parsed = parse1688OfferData(html);
    assert.equal(parsed.title, "测试商品标题");
    assert.ok(parsed.images.length >= 2);
  });

  it("parses 1688 sku options", () => {
    const parsed = parse1688OfferData(html);
    assert.ok(parsed.skuOptions.length >= 1);
  });

  it("builds mobile url from desktop 1688 link", () => {
    const mobile = to1688MobileUrl("https://detail.1688.com/offer/99887766.html");
    assert.equal(mobile, "https://m.1688.com/offer/99887766.html");
  });
});

describe("sourcing-detail extract-images", () => {
  const sampleHtml = `
    <html><head><title>테스트 상품</title></head>
    <body>
      <img src="https://cbu01.alicdn.com/img/ibank/O1CN01_test_!!123-0-cib.jpg" />
      <script>
        var skuMap = {"skuId":"99","prop":"블랙","pic":"https://img.alicdn.com/imgextra/i1/111.jpg_sum.jpg"};
      </script>
    </body></html>
  `;

  it("extracts alicdn image urls", () => {
    const urls = extractImageUrlsFromHtml(sampleHtml);
    assert.ok(urls.length >= 1);
    assert.ok(urls.some((u) => u.includes("alicdn.com")));
  });

  it("dedupes images", () => {
    const imgs = dedupeImages(toListingImages(extractImageUrlsFromHtml(sampleHtml)));
    assert.equal(new Set(imgs.map((i) => i.url)).size, imgs.length);
  });

  it("extracts sku options when present", () => {
    const skus = extractSkuOptionsFromHtml(sampleHtml);
    assert.ok(skus.length >= 0);
  });
});

describe("detail-layout", () => {
  it("builds HTML with copy and insights", () => {
    const html = buildDetailPageHtml({
      listing: {
        platform: "1688",
        url: "https://detail.1688.com/offer/1.html",
        title: "테스트",
        images: [],
        skuOptions: [],
        rawImageCount: 0,
      },
      match: {
        bestMatch: { imageUrl: "https://example.com/a.jpg", score: 90, reason: "ok" },
        candidates: [],
        referenceDescription: "블랙 가방",
      },
      angles: [{ angle: "front", prompt: "p", imageBase64: "abc" }],
      analysis: {
        category: "fashion",
        searchQuery: "크로스백",
        productNameKo: "데일리 크로스백",
        keyFeatures: ["가죽"],
        targetAudience: "20대",
        sellingPoints: ["가벼움"],
        detailStyle: "premium",
      },
      copy: {
        headline: "데일리 크로스백",
        subheadline: "가볍고 튼튼",
        hookParagraph: "매일 들기 좋습니다.",
        featureBullets: ["가벼운 무게"],
        specTable: [{ label: "소재", value: "PU" }],
        trustBadges: ["빠른배송"],
        faq: [{ q: "세탁?", a: "물걸레" }],
        ctaLine: "지금 만나보세요",
        seoKeywords: ["크로스백"],
      },
      insights: {
        searchQuery: "크로스백",
        source: "ai_category",
        topProducts: [],
        commonStrengths: ["가성비"],
        recommendedAppeals: ["프리미엄 소재"],
        suggestedSections: ["소재"],
        copyTone: "신뢰",
      },
    });
    assert.ok(html.includes("데일리 크로스백"));
    assert.ok(html.includes("시장 인사이트"));
    assert.ok(html.includes("data:image/png;base64,abc"));
  });
});

describe("vision-generate helpers", () => {
  it("counts exportable angles including needsFix", () => {
    assert.equal(
      countSuccessfulAngles([
        { angle: "a", prompt: "p", imageBase64: "x" },
        { angle: "b", prompt: "p", error: "fail" },
        { angle: "c", prompt: "p", imageUrl: "https://x.com/1.png" },
        { angle: "d", prompt: "p", imageBase64: "y", needsFix: true, error: "FIDELITY_NEEDS_FIX" },
      ]),
      3,
    );
  });
});

describe("product-identity", () => {
  it("builds lock prompt with must-preserve details", () => {
    const lock = identityLockPrompt({
      lockPromptEn: "matte black bottle with white logo",
      summaryKo: "블랙 보틀",
      color: "matte black",
      shape: "cylinder",
      material: "steel",
      logosText: ["ACME"],
      patterns: [],
      hardware: ["silver cap"],
      internalDetails: ["double wall"],
      mustPreserve: ["white ACME logo", "silver screw cap"],
    });
    assert.ok(lock.includes("matte black bottle"));
    assert.ok(lock.includes("NON-NEGOTIABLE"));
    assert.ok(lock.includes("white ACME logo"));
  });
});
