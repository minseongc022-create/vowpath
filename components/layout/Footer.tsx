import Link from "next/link";

import { BrandLogo } from "@/components/brand/BrandLogo";

import { SITE, ROUTES } from "@/lib/constants";

import { getFooterLinks, getNavLinks } from "@/lib/nav-links";

import { siteFooter } from "@/lib/site-content";

import { Container } from "@/components/ui/Container";



export function Footer() {

  const navLinks = getNavLinks();

  const footerLinks = getFooterLinks();

  const tagline = siteFooter?.tagline ?? SITE.tagline;

  const subline =

    siteFooter?.subline ?? "US residential HVAC · optional Jobber sync · after-hours call intake";



  return (

    <footer className="border-t border-white/[0.07] bg-[#0b0e14] text-slate-300">

      <Container className="py-14">

        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">

          <div className="max-w-sm">

            <BrandLogo variant="light" size="sm" showTagline href={ROUTES.home} />

            <p className="mt-3 text-sm leading-relaxed text-slate-400">{tagline}</p>

            {siteFooter?.brandMeaning ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{siteFooter.brandMeaning}</p>
            ) : null}

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-violet-400">

              {subline}

            </p>

          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-2">

            {navLinks.map((link) => (

              <Link

                key={link.href}

                href={link.href}

                className="text-sm text-slate-400 transition hover:text-white"

              >

                {link.label}

              </Link>

            ))}

          </nav>

        </div>

        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.07] pt-8">

          {footerLinks.map((link) => (

            <Link

              key={link.href}

              href={link.href}

              className="text-sm text-slate-500 transition hover:text-violet-300"

            >

              {link.label}

            </Link>

          ))}

        </nav>

        <div className="mt-6 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:justify-between">

          <p>

            © {new Date().getFullYear()} {SITE.name}

          </p>

          <p>{subline}</p>

        </div>

      </Container>

    </footer>

  );

}

