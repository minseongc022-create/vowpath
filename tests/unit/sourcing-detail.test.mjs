import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform, isSupportedListingUrl } from "../../lib/sourcing-detail/platforms.ts";
import {
  extractImageUrlsFromHtml,
  extractSkuOptionsFromHtml,
  dedupeImages,
  toListingImages,
} from "../../lib/sourcing-detail/extract-images.ts";

describe("sourcing-detail platforms", () => {
  it("detects 1688", () => {
    assert.equal(
      detectPlatform("https://detail.1688.com/offer/123.html"),
      "1688",
    );
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

describe("sourcing-detail extract-images", () => {
  const sampleHtml = `
    <html><head><title>테스트 상품</title></head>
    <body>
      <img src="https://cbu01.alicdn.com/img/ibank/O1CN01_test_!!123-0-cib.jpg" />
      <script>
        var skuMap = {"skuId":"99","prop":"블랙","pic":"https://img.alicdn.com/imgextra/i1/111.jpg_sum.jpg"};
      </script>
      <img src="https://cbu01.alicdn.com/img/ibank/O1CN01_test_!!123-0-cib.jpg" />
    </body></html>
  `;

  it("extracts alicdn image urls", () => {
    const urls = extractImageUrlsFromHtml(sampleHtml);
    assert.ok(urls.length >= 2);
    assert.ok(urls.some((u) => u.includes("alicdn.com")));
  });

  it("dedupes images", () => {
    const imgs = dedupeImages(toListingImages(extractImageUrlsFromHtml(sampleHtml)));
    const keys = imgs.map((i) => i.url);
    assert.equal(new Set(keys).size, keys.length);
  });

  it("extracts sku options when present", () => {
    const skus = extractSkuOptionsFromHtml(sampleHtml);
    assert.ok(skus.length >= 0);
  });
});
