import { ROUTES, SITE } from "./constants";

import { siteFooter, siteNav } from "./site-content";



export function getNavLinks() {

  return [

    { label: siteNav.product, href: "/#missed-call-flow" },

    { label: siteNav.about, href: "/#about" },

    { label: siteNav.scheduling, href: "/#scheduling" },

    { label: siteNav.howItWorks, href: "/#how-it-works" },

    { label: siteNav.pricing, href: "/#pricing" },

    { label: siteNav.getStarted, href: ROUTES.getStarted },

  ];

}



export function getFooterLinks() {

  return [

    { label: siteFooter.privacy, href: ROUTES.privacy },

    { label: siteFooter.terms, href: ROUTES.terms },

    { label: siteFooter.contact, href: `mailto:${SITE.contactEmail}` },

  ];

}


