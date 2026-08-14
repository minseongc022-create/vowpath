import { ProviderSignupForm } from "@/mano/components/ProviderSignupForm";

export default function ProfesionalSignupPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-mano-ink">Únete como profesional</h1>
      <p className="mt-2 text-sm text-mano-muted">
        Recibe solicitudes de clientes en tu zona. Comisión del 15% solo cuando completas un
        trabajo.
      </p>
      <div className="mt-8">
        <ProviderSignupForm />
      </div>
    </div>
  );
}
