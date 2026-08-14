# TOPIK UI locale

**Development (Korean UI):** default `ko` — all menus and labels in Korean.

**Production (Vietnamese learners):** set env or change `locale.ts`:

```bash
NEXT_PUBLIC_TOPIK_LOCALE=vi
```

Or edit `topik/lib/i18n/locale.ts`:

```ts
export const TOPIK_UI_LOCALE = "vi";
```

- Vietnamese strings: `vi-strings.ts` (preserve for launch)
- Korean strings: `ko-strings.ts`
- Content data uses `l(vi, ko)` from `locale-text.ts`
