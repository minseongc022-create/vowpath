import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { AppHeader } from "@/components/app/AppHeader";
import { authPages } from "@/lib/content";
import { ROUTES } from "@/lib/constants";
import { Container } from "@/components/ui/Container";

function LoginForm() {
  const p = authPages.login;
  return (
    <AuthForm
      mode="login"
      title={p.title}
      subtitle={p.subtitle}
      apiPath="/api/auth/login"
      defaultRedirect="/dashboard"
      submitLabel={p.submit}
      footerText={p.noAccount}
      footerLinkHref="/signup"
      footerLinkLabel={p.signupLink}
      forgotPasswordHref={ROUTES.forgotPassword}
      forgotPasswordLabel={p.forgotLink}
      enablePhoneLogin
      loginCopy={{
        methodLegend: p.methodLegend,
        methodEmail: p.methodEmail,
        methodPhone: p.methodPhone,
        phoneLabel: p.phoneLabel,
        phonePlaceholder: p.phonePlaceholder,
      }}
      formCopy={authPages.form}
      fields={[
        {
          name: "email",
          label: p.emailLabel,
          type: "email",
          autoComplete: "email",
        },
        {
          name: "password",
          label: p.passwordLabel,
          type: "password",
          autoComplete: "current-password",
        },
      ]}
    />
  );
}

export default function LoginPage() {
  return (
    <div className="vow-app-shell">
      <AppHeader />
      <Container className="py-12 sm:py-16">
        <Suspense fallback={<div className="text-center text-slate-500">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </Container>
    </div>
  );
}
