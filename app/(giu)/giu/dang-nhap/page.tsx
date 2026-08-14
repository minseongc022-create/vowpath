import { CustomerLoginForm } from "@/giu/components/CustomerAuthForms";

export default function GiuLoginPage() {
  return (
    <div className="giu-page">
      <h1 className="giu-section-title mb-5">Đăng nhập</h1>
      <CustomerLoginForm />
    </div>
  );
}
