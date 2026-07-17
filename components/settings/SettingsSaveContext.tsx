"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type SaveTask = () => Promise<boolean>;

type SettingsSaveContextValue = {
  register: (id: string, task: SaveTask) => () => void;
  saveAll: () => Promise<{ ok: boolean; failedId?: string }>;
  saveStep: (id: string) => Promise<{ ok: boolean; failedId?: string }>;
};

const SettingsSaveContext = createContext<SettingsSaveContextValue | null>(null);

export function SettingsSaveProvider({ children }: { children: ReactNode }) {
  const savers = useRef(new Map<string, SaveTask>());

  const register = useCallback((id: string, task: SaveTask) => {
    savers.current.set(id, task);
    return () => {
      savers.current.delete(id);
    };
  }, []);

  const saveAll = useCallback(async () => {
    for (const [id, task] of savers.current) {
      const ok = await task();
      if (!ok) return { ok: false, failedId: id };
    }
    return { ok: true };
  }, []);

  const saveStep = useCallback(async (id: string) => {
    const task = savers.current.get(id);
    if (!task) return { ok: true };
    const ok = await task();
    return ok ? { ok: true } : { ok: false, failedId: id };
  }, []);

  const value = useMemo(() => ({ register, saveAll, saveStep }), [register, saveAll, saveStep]);

  return (
    <SettingsSaveContext.Provider value={value}>{children}</SettingsSaveContext.Provider>
  );
}

export function useSettingsSaveRegistration(
  id: string,
  task: SaveTask,
  enabled = true,
) {
  const ctx = useContext(SettingsSaveContext);
  const taskRef = useRef(task);
  taskRef.current = task;

  const stableTask = useCallback(async () => taskRef.current(), []);

  useEffect(() => {
    if (!ctx || !enabled) return undefined;
    return ctx.register(id, stableTask);
  }, [ctx, enabled, id, stableTask]);
}

export function useSettingsSaveAll() {
  const ctx = useContext(SettingsSaveContext);
  if (!ctx) {
    throw new Error("useSettingsSaveAll must be used within SettingsSaveProvider");
  }
  return ctx.saveAll;
}

export function useSettingsSaveStep() {
  const ctx = useContext(SettingsSaveContext);
  if (!ctx) {
    throw new Error("useSettingsSaveStep must be used within SettingsSaveProvider");
  }
  return ctx.saveStep;
}
