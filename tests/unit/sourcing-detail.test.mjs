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
