import Link from "next/link";
import { CHECKOUT_CTA, ROUTES, type PlanId } from "@/lib/constants";
import { IS_BETA } from "@/lib/beta";
import { checkoutApiHref, getStartedHref } from "@/lib/checkout-urls";

type CheckoutButtonProps = {
  children?: React.ReactNode;
  plan?: PlanId;
  size?: "md" | "lg";
  variant?: "primary" | "secondary";
  className?: string;
  fullWidth?: boolean;
  directCheckout?: boolean;
};

const sizes = {
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const variants = {
  primary: "hvac-btn-primary",
  secondary: "hvac-btn-secondary",
};

export function CheckoutButton({
  children = CHECKOUT_CTA,
  plan = "unlimited",
  size = "md",
  variant = "primary",
  className = "",
  fullWidth = false,
  directCheckout = false,
}: CheckoutButtonProps) {
  const href = IS_BETA
    ? ROUTES.signup
    : directCheckout
      ? checkoutApiHref(plan)
      : getStartedHref(plan);

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {children}
    </Link>
  );
}
