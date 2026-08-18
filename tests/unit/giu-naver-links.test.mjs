import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  naverMapsAndroidIntentUrl,
  naverMapsAppDirectionsUrl,
  naverMapsOpenHref,
  naverMapsSearchUrl,
  naverMercatorCoords,
} from "../../giu/lib/links.ts";

describe("giu naver links", () => {
  const address = "인천 연수구 센트럴로 1";
  const dest = { lat: 37.3866, lng: 126.6392 };

  it("builds search URL for web fallback", () => {
    const url = naverMapsSearchUrl(address);
    assert.match(url, /^https:\/\/map\.naver\.com\/p\/search\//);
    assert.ok(url.includes(encodeURIComponent(address)));
  });

  it("uses iOS nmap app link with destination coords", () => {
    const url = naverMapsOpenHref({
      address,
      destination: dest,
      placeName: "테스트",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    assert.match(url, /^nmap:\/\/route\/car\?/);
    assert.ok(url.includes(`dlat=${dest.lat}`));
    assert.ok(url.includes(`dlng=${dest.lng}`));
    assert.ok(url.includes("appname=giucuu"));
  });

  it("uses Android intent with search fallback (not broken directions URL)", () => {
    const search = naverMapsSearchUrl(address);
    const intent = naverMapsOpenHref({
      address,
      destination: dest,
      placeName: "테스트",
      userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36",
    });
    assert.match(intent, /^intent:\/\/route\/car\?/);
    assert.ok(intent.includes("browser_fallback_url="));
    assert.ok(intent.includes(encodeURIComponent(search)));
    assert.ok(!intent.includes("/directions/"));
  });

  it("uses search on desktop web", () => {
    const url = naverMapsOpenHref({
      address,
      destination: dest,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    assert.equal(url, naverMapsSearchUrl(address));
  });

  it("builds nmap helper", () => {
    const url = naverMapsAppDirectionsUrl({ lat: dest.lat, lng: dest.lng, name: "가게" });
    assert.match(url, /^nmap:\/\/route\/car\?/);
    assert.ok(url.includes("dname="));
  });

  it("converts WGS84 to mercator for legacy paths", () => {
    const { x, y } = naverMercatorCoords(37.56661, 126.978388);
    assert.ok(Math.abs(x - 14135169.5) < 100);
    assert.ok(Math.abs(y - 4518382) < 100);
  });

  it("builds android intent helper", () => {
    const search = naverMapsSearchUrl(address);
    const intent = naverMapsAndroidIntentUrl({
      lat: dest.lat,
      lng: dest.lng,
      name: "가게",
      webFallback: search,
    });
    assert.match(intent, /^intent:\/\/route\/car\?/);
    assert.ok(intent.includes(`dlat=${dest.lat}`));
  });
});
