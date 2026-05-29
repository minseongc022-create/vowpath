import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AppHeader } from "@/components/app/AppHeader";
import { Container } from "@/components/ui/Container";

export default function ForgotPasswordPage() {
  return (
    <div className="hvac-app-shell">
      <AppHeader />
      <Container className="py-12 sm:py-16">
        <ForgotPasswordForm />
      </Container>
    </div>
  );
}
