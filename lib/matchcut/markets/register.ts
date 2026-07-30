import type { ListingDraft, ListingInput, RegisterResult } from "./types";

function buildDraft(channel: ListingDraft["channel"], input: ListingInput): ListingDraft {
  return {
    channel,
    title: input.title,
    salePrice: input.salePrice,
    detailHtml: input.detailHtml,
    imageCount: input.imagesBase64.length,
    payload: {
      productName: input.title,
      salePrice: input.salePrice,
      brand: input.brand ?? "자체브랜드",
      manufacturer: input.manufacturer ?? "해외매입",
      stockQuantity: input.stock ?? 100,
      categoryHint: input.categoryHint ?? "",
      contents: input.detailHtml.slice(0, 5000),
      images: input.imagesBase64.map((_, i) => ({ order: i, role: i === 0 ? "REPRESENTATION" : "DETAIL" })),
      notes: "MatchCut draft — API 키 연결 시 동일 페이로드로 자동 등록됩니다.",
    },
  };
}

/** Coupang Wing — HMAC signed product create (best-effort when keys present) */
export async function registerCoupang(input: ListingInput): Promise<RegisterResult> {
  const accessKey =
    input.credentials?.accessKey?.trim() || process.env.COUPANG_ACCESS_KEY?.trim();
  const secretKey =
    input.credentials?.secretKey?.trim() || process.env.COUPANG_SECRET_KEY?.trim();
  const vendorId =
    input.credentials?.vendorId?.trim() || process.env.COUPANG_VENDOR_ID?.trim();

  const draft = buildDraft("coupang", input);

  if (!accessKey || !secretKey || !vendorId) {
    return {
      channel: "coupang",
      status: "draft_only",
      message: "쿠팡 API 키가 없어 등록 드래프트를 생성했습니다. 환경변수 또는 키를 연결하면 자동 등록됩니다.",
      draft,
    };
  }

  try {
    // Coupang product create is multi-step; we submit a seller product draft endpoint when available.
    // Keep payload ready; if remote rejects, still return draft.
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`;
    const datetime = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const method = "POST";
    const message = datetime + method + path.replace(/\/v2/, "") + "";
    const crypto = await import("crypto");
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(message)
      .digest("hex");

    const body = {
      sellerProductName: input.title.slice(0, 100),
      displayCategoryCode: Number(process.env.COUPANG_DEFAULT_CATEGORY || 0) || undefined,
      vendorId,
      saleStartedAt: new Date().toISOString().slice(0, 19),
      saleEndedAt: "2099-12-31T23:59:59",
      brand: input.brand ?? "자체브랜드",
      manufacture: input.manufacturer ?? "해외",
      deliveryMethod: "SEQUENCIAL",
      deliveryCompanyCode: "KDEXP",
      deliveryChargeType: "FREE",
      deliveryCharge: 0,
      freeShipOverAmount: 0,
      deliveryChargeOnReturn: 2500,
      remoteAreaDeliverable: "N",
      unionDeliveryType: "UNION_DELIVERY",
      returnCenterCode: process.env.COUPANG_RETURN_CENTER || "",
      returnChargeName: "판매자",
      companyContactNumber: process.env.COUPANG_CONTACT || "01000000000",
      returnZipCode: process.env.COUPANG_RETURN_ZIP || "06236",
      returnAddress: process.env.COUPANG_RETURN_ADDR || "서울",
      returnAddressDetail: "",
      returnCharge: 2500,
      outboundShippingPlaceCode: process.env.COUPANG_OUTBOUND || "",
      vendorUserId: process.env.COUPANG_VENDOR_USER || vendorId,
      requested: false,
      items: [
        {
          itemName: input.title.slice(0, 100),
          originalPrice: input.salePrice,
          salePrice: input.salePrice,
          maximumBuyCount: input.stock ?? 100,
          maximumBuyForPerson: 0,
          outboundShippingTimeDay: 3,
          maximumBuyForPersonPeriod: 1,
          unitCount: 1,
          adultOnly: "EVERYONE",
          taxType: "TAX",
          parallelImported: "NOT_PARALLEL_IMPORTED",
          overseasPurchased: "OVERSEAS_PURCHASED",
          pccNeeded: "false",
          externalVendorSku: `MC-${Date.now()}`,
          barcode: "",
          emptyBarcode: true,
          emptyBarcodeReason: "상품확인불가",
          modelNo: "MATCHCUT",
          extraProperties: {},
          certifications: [{ certificationType: "NOT_REQUIRED", certificationCode: "" }],
          searchTags: [],
          images: input.imagesBase64.slice(0, 5).map((b64, i) => ({
            imageOrder: i,
            imageType: i === 0 ? "REPRESENTATION" : "DETAIL",
            vendorPath: `data:image/jpeg;base64,${b64.slice(0, 40)}…`,
          })),
          contents: [
            {
              contentsType: "HTML",
              contentDetails: [{ content: input.detailHtml.slice(0, 20000), detailType: "TEXT" }],
            },
          ],
          offerCondition: "NEW",
        },
      ],
      requiredDocuments: [{ templateName: "기타인증서류", documentPath: "" }],
      extraInfoMessage: "",
      manufactureCountry: "중국",
    };

    draft.payload = body as unknown as Record<string, unknown>;

    const res = await fetch(`https://api-gateway.coupang.com${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        channel: "coupang",
        status: "draft_only",
        message: `쿠팡 API 응답 ${res.status} — 드래프트로 저장했습니다. (${text.slice(0, 180)})`,
        draft,
      };
    }

    let externalId: string | undefined;
    try {
      const json = JSON.parse(text) as { data?: { sellerProductId?: string | number } };
      externalId = json.data?.sellerProductId != null ? String(json.data.sellerProductId) : undefined;
    } catch {
      /* ignore */
    }

    return {
      channel: "coupang",
      status: "submitted",
      externalId,
      message: "쿠팡에 상품 등록 요청을 보냈습니다.",
      draft,
    };
  } catch (e) {
    return {
      channel: "coupang",
      status: "draft_only",
      message: e instanceof Error ? e.message : "쿠팡 등록 실패 — 드래프트만 생성",
      draft,
    };
  }
}

export async function registerSmartStore(input: ListingInput): Promise<RegisterResult> {
  const clientId =
    input.credentials?.clientId?.trim() || process.env.NAVER_COMMERCE_CLIENT_ID?.trim();
  const clientSecret =
    input.credentials?.clientSecret?.trim() || process.env.NAVER_COMMERCE_CLIENT_SECRET?.trim();

  const draft = buildDraft("smartstore", input);
  draft.payload = {
    originProduct: {
      statusType: "WAIT",
      saleType: "NEW",
      leafCategoryId: process.env.NAVER_DEFAULT_CATEGORY || "",
      name: input.title.slice(0, 100),
      salePrice: input.salePrice,
      stockQuantity: input.stock ?? 100,
      deliveryInfo: { deliveryType: "DELIVERY", deliveryAttributeType: "NORMAL", deliveryFee: { deliveryFeeType: "FREE" } },
      detailContent: input.detailHtml.slice(0, 50000),
      images: {
        representativeImage: { url: "UPLOAD_REQUIRED" },
        optionalImages: [],
      },
    },
    smartstoreChannelProduct: {
      channelProductName: input.title.slice(0, 100),
      storeKeepExclusiveProduct: false,
    },
  };

  if (!clientId || !clientSecret) {
    return {
      channel: "smartstore",
      status: "draft_only",
      message: "네이버 커머스 API 키가 없어 등록 드래프트를 생성했습니다.",
      draft,
    };
  }

  try {
    // OAuth token
    const tokenRes = await fetch("https://api.commerce.naver.com/external/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        type: "SELF",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!tokenRes.ok) {
      return {
        channel: "smartstore",
        status: "draft_only",
        message: `네이버 토큰 실패 ${tokenRes.status} — 드래프트만 생성`,
        draft,
      };
    }
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const token = tokenData.access_token;
    if (!token) {
      return {
        channel: "smartstore",
        status: "draft_only",
        message: "네이버 액세스 토큰 없음 — 드래프트만 생성",
        draft,
      };
    }

    const res = await fetch("https://api.commerce.naver.com/external/v2/products", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draft.payload),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        channel: "smartstore",
        status: "draft_only",
        message: `스마트스토어 API ${res.status} — 드래프트 저장 (${text.slice(0, 160)})`,
        draft,
      };
    }
    let externalId: string | undefined;
    try {
      const json = JSON.parse(text) as { originProductNo?: number };
      externalId = json.originProductNo != null ? String(json.originProductNo) : undefined;
    } catch {
      /* ignore */
    }
    return {
      channel: "smartstore",
      status: "submitted",
      externalId,
      message: "스마트스토어에 상품 등록을 요청했습니다.",
      draft,
    };
  } catch (e) {
    return {
      channel: "smartstore",
      status: "draft_only",
      message: e instanceof Error ? e.message : "스마트스토어 등록 실패",
      draft,
    };
  }
}

export async function registerGeneric(
  channel: "elevenst" | "gmarket" | "auction",
  input: ListingInput,
): Promise<RegisterResult> {
  const draft = buildDraft(channel, input);
  const keyEnv =
    channel === "elevenst" ? process.env.ELEVENST_API_KEY : process.env.GMARKET_API_KEY;
  if (!keyEnv?.trim()) {
    return {
      channel,
      status: "draft_only",
      message: `${channel} API 키 없음 — 등록용 드래프트 JSON을 만들었습니다.`,
      draft,
    };
  }
  // Most open-market seller APIs need seller-specific endpoints; return prepared draft + live flag
  return {
    channel,
    status: "draft_only",
    message: `${channel} 키는 확인됐으나 상품 스키마 매핑이 셀러별로 달라 드래프트로 제공합니다. 지원팀에 연동 확장을 요청하세요.`,
    draft,
  };
}
