/** 방패 안의 체크 — "확인됨"을 글자 없이 말하는 가장 짧은 그림. */
export function VibesafeMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="vs-wordmark-mark" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5 4.5 5.6v6.1c0 4.6 3.1 8.8 7.5 10.1 4.4-1.3 7.5-5.5 7.5-10.1V5.6L12 2.5Z"
        fill="var(--vs-primary)"
      />
      <path d="m8.4 12.1 2.6 2.6 4.6-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
