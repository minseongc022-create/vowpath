import { MerchantLoginForm } from "@/giu/components/MerchantAuthForms";

export default function GiuMerchantLoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-giu-ink">Đăng nhập quán</h1>
      <MerchantLoginForm />
    </div>
  );
}
