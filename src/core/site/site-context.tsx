"use client";

import { createContext, useContext, useMemo } from "react";
import { resolveModules, type ModuleDef } from "@/core/module-registry";
import { DEFAULT_SITE } from "./defaults";
import type { ModuleKey, SiteContent } from "./schema";

const SiteContext = createContext<SiteContent>(DEFAULT_SITE);

/** Hands the admin-managed site content (read on the server) to client components. */
export function SiteProvider({ value, children }: { value: SiteContent; children: React.ReactNode }) {
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);

export function useModules(): ModuleDef[] {
  const { modules } = useSite();
  return useMemo(() => resolveModules(modules), [modules]);
}

export function useModule(key: ModuleKey): ModuleDef {
  const modules = useModules();
  return modules.find((m) => m.key === key)!;
}
