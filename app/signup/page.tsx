import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";
import { AppHeader } from "@/components/app/AppHeader";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="vow-app-shell">
      <AppHeader />
      <Container className="py-12 sm:py-16">
        <Suspense fallback={<div className="text-center text-slate-500">로딩…</div>}>
          <SignupForm />
        </Suspense>
      </Container>
    </div>
  );
}
