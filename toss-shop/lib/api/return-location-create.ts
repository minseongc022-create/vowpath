/**
 * 교환·반품지 등록 — 사장님 손을 완전히 뗀다
 *
 * ★ 앞선 판단이 틀렸다
 *
 * 전에 이 프로젝트는 "토스는 반품지 등록 API를 안 준다"고 결론 내리고, 그
 * 전제 위에 우회로를 잔뜩 쌓았다 — 셀러 주소 강제 폴백, 대기 주소 목록,
 * 사장님이 셀러센터에 직접 넣고 「등록했어」라고 말하면 다시 읽는 동기화까지.
 *
 * 그 결론은 실측에 근거하긴 했다. 다만 **틀린 경로를 찔렀다**:
 * `.../exchange-refund-location/v2`에 POST를 보내고 405를 받았고, 거기서
 * "등록은 불가능"이라고 단정했다. 실제 등록 경로는 **`/v2`가 없는 쪽**이다.
 *
 *   POST /api/v3/shopping-fep/merchants/group-delivery/exchange-refund-location
 *   PUT  /api/v3/shopping-fep/merchants/group-delivery/exchange-refund-location
 *   GET  /api/v3/shopping-fep/merchants/group-delivery/exchange-refund-location/v2
 *
 * 조회만 `/v2`이고 쓰기는 아니었다. 405는 "그 경로에 그 메서드가 없다"는
 * 뜻이었지 "그런 기능이 없다"는 뜻이 아니었는데, 그걸 후자로 읽었다.
 * 한 번의 음성 결과를 기능 부재의 증거로 삼은 것이 실수였다.
 *
 * 이제 공급처 주소를 자비스가 직접 등록한다. 사장님이 셀러센터에 들어갈 일이
 * 없어진다.
 *
 * ★ isMain은 절대 true로 보내지 않는다
 *
 * 문서에 명시돼 있다 — true로 설정하면 **기존 대표 반품지가 자동으로
 * 해제된다**. 공급처 주소를 등록하면서 무심코 true를 넣으면 사장님이 지정해둔
 * 대표 반품지가 조용히 바뀌고, 그러면 매핑이 안 걸린 상품의 반품이 엉뚱한
 * 곳으로 간다. 대표 지정은 사람이 할 일이다.
 */

import { tossApiPost } from "./client";
import type { TossApiConfig } from "./config";

export const RETURN_LOCATION_CREATE_VERSION = "1.0";

const CREATE_PATH = "/api/v3/shopping-fep/merchants/group-delivery/exchange-refund-location";

export type CreateReturnLocationInput = {
  zipCode: string;
  address: string;
  detailAddress: string;
};

export type CreateReturnLocationResult =
  | { ok: true; id: number }
  | { ok: false; reason: string };

/**
 * 공급처 반품지를 등록한다.
 *
 * 주소가 비어 있으면 아예 보내지 않는다. 빈 주소로 반품지가 만들어지면
 * 반품이 어디로도 못 가고, 그건 고객 클레임과 페널티로 돌아온다.
 */
export async function createReturnLocation(
  merchantId: string,
  config: TossApiConfig,
  input: CreateReturnLocationInput,
): Promise<CreateReturnLocationResult> {
  const address = input.address?.trim();
  if (!address) return { ok: false, reason: "주소가 비어 있습니다" };

  const zipCode = input.zipCode?.trim() ?? "";
  if (!zipCode) return { ok: false, reason: "우편번호가 없습니다" };

  try {
    const res = await tossApiPost<{ id: number }>(merchantId, config, CREATE_PATH, {
      zipCode,
      address,
      // 상세주소는 필수 필드라 빈 문자열이라도 보내야 한다
      detailAddress: input.detailAddress?.trim() ?? "",
      // 대표 반품지를 건드리지 않는다 — 위 주석 참고
      isMain: false,
    });

    if (res.resultType === "SUCCESS" && typeof res.success?.id === "number") {
      return { ok: true, id: res.success.id };
    }
    return { ok: false, reason: res.error?.reason ?? res.error?.errorCode ?? "등록 실패" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "RETURN_LOCATION_CREATE_FAIL" };
  }
}
