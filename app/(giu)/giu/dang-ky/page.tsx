import { CustomerRegisterForm } from "@/giu/components/CustomerAuthForms";

export default function GiuRegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-giu-ink">Tạo tài khoản Giu</h1>
      <CustomerRegisterForm />
    </div>
  );
}
