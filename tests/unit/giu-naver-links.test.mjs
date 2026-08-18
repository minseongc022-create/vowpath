import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  naverMapsAndroidIntentUrl,
  naverMapsDirectionsUrl,
  naverMapsOpenHref,
} from "../../giu/lib/links.ts";

describe("giu naver links", () => {
  const address = "인천 연수구 센트럴로 1";
  const dest = { lat: 37.3866, lng: 126.6392 };

  it("prefers street address in directions URL", () => {
    const url = naverMapsDirectionsUrl({ address, destination: dest, placeName: "테스트" });
    assert.match(url, /^https:\/\/map\.naver\.com\/p\/directions\//);
    assert.ok(url.includes(encodeURIComponent(address)));
    assert.ok(!url.includes("126.6392"));
  });

  it("uses Android intent with web fallback", () => {
    const web = naverMapsDirectionsUrl({ address, destination: dest });
    const intent = naverMapsOpenHref({
      address,
      destination: dest,
      placeName: "테스트",
      userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36",
    });
    assert.match(intent, /^intent:\/\/route\/car\?/);
    assert.ok(intent.includes("browser_fallback_url="));
    assert.ok(intent.includes(encodeURIComponent(web)));
  });

  it("uses https on iOS", () => {
    const url = naverMapsOpenHref({
      address,
      destination: dest,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    assert.match(url, /^https:\/\/map\.naver\.com\/p\/directions\//);
  });

  it("builds android intent helper", () => {
    const web = "https://map.naver.com/p/directions/-/test/-/car";
    const intent = naverMapsAndroidIntentUrl({
      lat: dest.lat,
      lng: dest.lng,
      name: "가게",
      webFallback: web,
    });
    assert.match(intent, /^intent:\/\/route\/car\?/);
    assert.ok(intent.includes(`dlat=${dest.lat}`));
    assert.ok(intent.includes(`dlng=${dest.lng}`));
  });
});
