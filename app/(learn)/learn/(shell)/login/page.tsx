import { SocialLoginButtons } from "@/learn/components/auth/SocialLoginButtons";
import Link from "next/link";

export const metadata = {
  title: "로그인",
};

export default function LearnLoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-md flex-col justify-center px-4 py-12 learn-animate-in">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-learn-primary text-xl font-bold text-white">
          E
        </span>
        <h1 className="text-2xl font-bold text-learn-ink">EFFIROAD 시작하기</h1>
        <p className="mt-2 text-sm text-learn-ink-muted">
          한 번의 로그인으로 모든 기기에서 동일한 학습 경험
        </p>
      </div>

      <SocialLoginButtons callbackUrl="/learn/courses" />

      <p className="mt-8 text-center text-xs leading-relaxed text-learn-ink-subtle">
        계속 진행하면{" "}
        <Link href="#" className="underline underline-offset-2">
          이용약관
        </Link>
        {" "}및{" "}
        <Link href="#" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
        에 동의하는 것으로 간주됩니다.
      </p>

      <Link
        href="/learn/courses/ai-fundamentals/lessons/intro"
        className="mt-6 text-center text-sm font-medium text-learn-primary"
      >
        로그인 없이 체험하기 →
      </Link>
    </main>
  );
}
