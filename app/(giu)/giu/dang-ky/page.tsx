import { CustomerRegisterForm } from "@/giu/components/CustomerAuthForms";

export default function GiuRegisterPage() {
  return (
    <div className="giu-page">
      <h1 className="giu-section-title mb-5">계정 만들기</h1>
      <CustomerRegisterForm />
    </div>
  );
}
