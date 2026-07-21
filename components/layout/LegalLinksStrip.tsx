import { SITE, ROUTES } from "@/lib/constants";

/** Server-rendered legal links — crawlers often miss client-only footers. */
export function LegalLinksStrip() {
  const links = [
    { label: "Terms of Service", href: `${SITE.url}${ROUTES.terms}` },
    { label: "Privacy Policy", href: `${SITE.url}${ROUTES.privacy}` },
    { label: "Refund Policy", href: `${SITE.url}${ROUTES.refund}` },
  ] as const;

  return (
    <nav
      aria-label="Legal"
      className="border-t border-brand-200/80 bg-brand-50 px-4 py-3 text-center"
    >
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-xs font-medium text-stone-700 underline underline-offset-2 hover:text-brand-800"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
