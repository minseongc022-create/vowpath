import Link from "next/link";
import Image from "next/image";
import { SITE, NAV_LINKS, FOOTER_LINKS } from "@/lib/constants";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-brand-900/30 bg-brand-950 text-brand-100">
      <Container className="py-14">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <p className="text-lg font-semibold text-white">{SITE.name}</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-brand-200">{SITE.tagline}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-brand-400">
              Built for US residential HVAC shops on Jobber
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-brand-200 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-8">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-brand-300 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-2 text-sm text-brand-400 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}
          </p>
          <p>미국 residential HVAC · Jobber 연동 · 야간·주말 콜 AI</p>
        </div>
      </Container>
    </footer>
  );
}
