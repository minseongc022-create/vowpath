import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { AppHeader } from "@/components/app/AppHeader";
import { authPages } from "@/lib/content";
import { Container } from "@/components/ui/Container";

function SignupForm() {
  const p = authPages.signup;
  return (
    <AuthForm
      mode="signup"
      title={p.title}
      subtitle={p.subtitle}
      apiPath="/api/auth/signup"
      defaultRedirect="/settings"
      submitLabel={p.submit}
      footerText={p.hasAccount}
      footerLinkHref="/login"
      footerLinkLabel={p.loginLink}
      fields={[
        {
          name: "shopName",
          label: p.shopLabel,
          type: "text",
          placeholder: p.shopPlaceholder,
          autoComplete: "organization",
        },
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
          hint: p.passwordHint,
          autoComplete: "new-password",
        },
        {
          name: "phone",
          label: p.phoneLabel,
          type: "tel",
          placeholder: p.phonePlaceholder,
          autoComplete: "tel",
          hint: p.phoneHint,
        },
      ]}
    />
  );
}

export default function SignupPage() {
  return (
    <div className="hvac-app-shell">
      <AppHeader />
      <Container className="py-12 sm:py-16">
        <Suspense fallback={<div className="text-center text-slate-500">로딩…</div>}>
          <SignupForm />
        </Suspense>
      </Container>
    </div>
  );
}
