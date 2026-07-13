import type { ModuleAnswer, ModuleResult, StudentDiscoveryProfileResponse } from "@/types/discovery";
import type { DiscoveryQuestion, DiscoveryScales } from "@/types/discovery";

export type DiscoveryModuleListItem = {
  id: string;
  title: string;
  number: string;
  subtitle: string | null;
  description: string | null;
  answerFormat: string;
  numItems: number;
  sortOrder: number;
  categories: string[];
  questions: DiscoveryQuestion[];
  completed: boolean;
};

export type DiscoveryModulesResponse = {
  scales: DiscoveryScales;
  modules: DiscoveryModuleListItem[];
  version: number;
};

export async function fetchDiscoveryModules(): Promise<DiscoveryModulesResponse> {
  const res = await fetch("/api/discovery/modules", { cache: "no-store" });
  const data = (await res.json()) as DiscoveryModulesResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to load modules.");
  return data;
}

export async function fetchDiscoveryProfile(): Promise<StudentDiscoveryProfileResponse> {
  const res = await fetch("/api/discovery/profile", { cache: "no-store" });
  const data = (await res.json()) as StudentDiscoveryProfileResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to load profile.");
  return data;
}

export async function fetchModuleResult(moduleId: string): Promise<{
  answers: ModuleAnswer[];
  result: ModuleResult;
} | null> {
  const res = await fetch(`/api/discovery/modules/${moduleId}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const data = (await res.json()) as {
    answers?: ModuleAnswer[];
    result?: ModuleResult;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Failed to load module result.");
  if (!data.result) return null;
  return {
    answers: Array.isArray(data.answers) ? data.answers : [],
    result: data.result,
  };
}

export async function submitModuleAnswers(
  moduleId: string,
  answers: ModuleAnswer[],
): Promise<ModuleResult> {
  const res = await fetch(`/api/discovery/modules/${moduleId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  const data = (await res.json()) as ModuleResult & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Submission failed.");
  return data;
}
