import Link from "next/link";
import { CHECKOUT_CTA, DEFAULT_PLAN, ROUTES, type PlanId } from "@/lib/constants";
import { getStartedHref } from "@/lib/checkout-urls";
import { StartCheckoutButton } from "@/components/checkout/StartCheckoutButton";

const sizes = {
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const variants = {
  primary: "hvac-btn-primary",
  secondary: "hvac-btn-secondary",
};

type CheckoutButtonProps = {
  children?: React.ReactNode;
  plan?: PlanId;
  size?: "md" | "lg";
  variant?: "primary" | "secondary";
  className?: string;
  fullWidth?: boolean;
  directCheckout?: boolean;
};

export function CheckoutButton({
  children = CHECKOUT_CTA,
  plan = DEFAULT_PLAN,
  size = "md",
  variant = "primary",
  className = "",
  fullWidth = false,
  directCheckout = false,
}: CheckoutButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-xl font-semibold transition ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`;

  if (directCheckout) {
    return (
      <StartCheckoutButton plan={plan} directCheckout className={classes}>
        {children}
      </StartCheckoutButton>
    );
  }

  return (
    <Link href={getStartedHref(plan)} className={classes}>
      {children}
    </Link>
  );
}
