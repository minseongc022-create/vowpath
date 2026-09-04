"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DAJEONG_THEMES,
  DAJEONG_THEME_STORAGE_KEY,
  DEFAULT_DAJEONG_THEME,
  isDajeongThemeId,
  type DajeongThemeId,
} from "../lib/theme";
import { CheckIcon, PaletteIcon } from "./DajeongIcons";

type ThemeContextValue = {
  theme: DajeongThemeId;
  /** 미리보기까지 즉시 반영한다(저장은 하지 않음). */
  previewTheme: (id: DajeongThemeId) => void;
  /** 고른 색을 저장하고 확정한다. */
  applyTheme: (id: DajeongThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function paint(id: DajeongThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.djTheme = id;
}

function readStoredTheme(): DajeongThemeId {
  try {
    const stored = window.localStorage.getItem(DAJEONG_THEME_STORAGE_KEY);
    return isDajeongThemeId(stored) ? stored : DEFAULT_DAJEONG_THEME;
  } catch {
    return DEFAULT_DAJEONG_THEME;
  }
}

export function DajeongThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<DajeongThemeId>(DEFAULT_DAJEONG_THEME);

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    paint(stored);
  }, []);

  const previewTheme = useCallback((id: DajeongThemeId) => {
    setTheme(id);
    paint(id);
  }, []);

  const applyTheme = useCallback((id: DajeongThemeId) => {
    setTheme(id);
    paint(id);
    try {
      window.localStorage.setItem(DAJEONG_THEME_STORAGE_KEY, id);
    } catch {
      // 저장이 막힌 브라우저(시크릿 모드 등)에서도 이번 세션 색은 그대로 보여준다.
    }
  }, []);

  const value = useMemo(() => ({ theme, previewTheme, applyTheme }), [theme, previewTheme, applyTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useDajeongTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context) return context;
  // Provider 밖에서도 버튼이 죽지 않도록 — 문서에 직접 칠하는 최소 동작으로 대체한다.
  return {
    theme: DEFAULT_DAJEONG_THEME,
    previewTheme: paint,
    applyTheme: paint,
  };
}

/** 헤더/사이드바에 놓는 팔레트 버튼 + 모달 한 벌. */
export function ThemePicker({ className }: { className?: string }) {
  const { theme, previewTheme, applyTheme } = useDajeongTheme();
  const [open, setOpen] = useState(false);
  const [savedTheme, setSavedTheme] = useState<DajeongThemeId>(theme);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        previewTheme(savedTheme);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, savedTheme, previewTheme]);

  function openPicker() {
    setSavedTheme(theme);
    setOpen(true);
  }

  function cancel() {
    previewTheme(savedTheme);
    setOpen(false);
  }

  function confirm() {
    applyTheme(theme);
    setOpen(false);
  }

  return (
    <>
      <button type="button" className={`dj-theme-button ${className ?? ""}`} onClick={openPicker} aria-label="테마 색상 선택">
        <PaletteIcon size={19} />
      </button>
      {open ? (
        <div
          className="dj-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="테마 색상 선택"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancel();
          }}
        >
          <div className="dj-theme-modal">
            <button type="button" className="dj-theme-modal-close" onClick={cancel} aria-label="닫기">×</button>
            <div className="dj-theme-modal-head">
              <span><PaletteIcon size={25} /></span>
              <div>
                <strong>테마 색상 선택</strong>
                <p>하루위드를 더 너다운 색으로 꾸며봐.</p>
              </div>
            </div>

            <div className="dj-theme-grid">
              {DAJEONG_THEMES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="dj-theme-card"
                  aria-pressed={theme === option.id}
                  onClick={() => previewTheme(option.id)}
                >
                  <span className="dj-theme-swatch" style={{ background: option.swatch }}>
                    {theme === option.id ? <i><CheckIcon size={14} /></i> : null}
                  </span>
                  <span className="dj-theme-name"><b style={{ background: option.dot }} />{option.name}</span>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>

            <div className="dj-theme-actions">
              <button type="button" className="dj-btn dj-btn-secondary" onClick={cancel}>취소</button>
              <button type="button" className="dj-btn dj-btn-primary" onClick={confirm}>적용하기</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
