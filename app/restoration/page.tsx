import { redirect } from "next/navigation";

/**
 * /restoration is an alias for the main marketing page.
 * Restoration is the default vertical — all marketing copy at / targets it.
 */
export default function RestorationPage() {
  redirect("/");
}
