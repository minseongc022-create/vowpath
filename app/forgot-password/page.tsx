import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AppHeader } from "@/components/app/AppHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="vow-app-shell">
      <AppHeader />
      <Container className="py-12 sm:py-16">
        <ForgotPasswordForm />
      </Container>
    </div>
  );
}
