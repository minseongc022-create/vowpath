"use client";

import { useState } from "react";
import { GiuConfirmSheet } from "@/giu/components/GiuConfirmSheet";
import { hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuHref } from "./GiuNavProvider";

type Props = {
  locale: GiuLocale;
};

export function CustomerLogoutLink({ locale }: Props) {
  const { logout } = useGiuAuth();
  const href = useGiuHref();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="pb-1 pt-2 text-center">
        <button
          type="button"
          onClick={() => {
            hapticSelect();
            setOpen(true);
          }}
          className="text-[12px] font-semibold text-giu-muted underline-offset-2 hover:text-giu-ink hover:underline"
        >
          {t(locale, "mLogout")}
        </button>
      </div>

      <GiuConfirmSheet
        open={open}
        title={t(locale, "mLogout")}
        message={t(locale, "mLogoutConfirm")}
        confirmLabel={t(locale, "mLogout")}
        cancelLabel={t(locale, "mCloseNo")}
        onConfirm={() =>
          void logout().then(() => {
            window.location.href = `${href(GIU_ROUTES.auth)}?role=customer`;
          })
        }
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
