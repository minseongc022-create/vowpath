import { redirect } from "next/navigation";

/** Quote/chase is part of the main landing — no separate marketing page. */
export default function QuoteLandingPage() {
  redirect("/#product-stack");
}
