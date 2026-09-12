/**
 * 권한 화면 문구 — 서버·클라이언트가 함께 쓴다.
 *
 * permissions.ts에서 떼어낸 이유는 그 파일이 "server-only"와 DB를 물고 있어서
 * 클라이언트 컴포넌트가 import하면 빌드가 거절되기 때문이다(실제로 거절당했다).
 * 문구는 순수 데이터니 순수한 곳에 둔다.
 *
 * ★ 여기 적힌 것은 제품의 약속이다
 *
 * "VibeSafe는 main에 직접 push하지 않습니다" 같은 문장은 화면 장식이 아니라
 * 코드가 지켜야 하는 계약이다. 문구와 동작이 어긋나면 그건 버그가 아니라
 * 거짓말이 된다 — tests/unit/vibesafe/permissions.test.mjs가 이를 고정한다.
 */

export type PermissionKey = "diagnose" | "proposePr" | "applyFix" | "rollback";

export const PERMISSION_LABELS: Record<
  PermissionKey,
  { title: string; detail: string; risk: string }
> = {
  diagnose: {
    title: "원인 분석",
    detail: "검사가 실패하면 마지막 정상 시점 이후의 커밋을 읽어 원인 후보를 찾아냅니다.",
    risk: "저장소를 읽기만 합니다. 아무것도 바꾸지 않습니다.",
  },
  proposePr: {
    title: "수정안 PR로 올리기",
    detail: "원인을 찾으면 고친 코드를 새 브랜치에 올리고 Pull Request를 엽니다.",
    risk: "머지는 직접 하셔야 합니다. VibeSafe는 main에 직접 push하지 않습니다.",
  },
  applyFix: {
    title: "확인한 수정 적용하기",
    detail:
      "검증까지 통과한 수정에 대해 [수정 적용하기]를 누르면, VibeSafe가 그 Pull Request 하나를 머지합니다.",
    risk:
      "회원님이 누른 그 한 건만 머지합니다. VibeSafe가 스스로 골라 머지하지 않고, main에 직접 push하는 일은 어떤 권한으로도 없습니다.",
  },
  rollback: {
    title: "배포 되돌리기",
    detail: "핵심 기능이 깨지면 직전 정상 배포로 자동으로 되돌립니다.",
    risk: "되돌릴 수 있는 행동이지만 실제 서비스가 즉시 바뀝니다. 하루 실행 한도가 있습니다.",
  },
};
