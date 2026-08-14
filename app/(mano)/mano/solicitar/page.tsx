import { RequestForm } from "@/mano/components/RequestForm";

export default function SolicitarPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-mano-ink">Solicitar servicio</h1>
      <p className="mt-2 text-sm text-mano-muted">
        Cotiza gratis. Los profesionales de tu colonia te contactan por WhatsApp.
      </p>
      <div className="mt-8">
        <RequestForm />
      </div>
    </div>
  );
}
