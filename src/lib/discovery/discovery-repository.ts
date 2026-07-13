import {
  assembleDiscoveryConfig,
  assemblePortableDocument,
  moduleConfigToContentJson,
  moduleConfigToRowInsert,
  normalizeScoringRulesJson,
  portableTestToModuleConfig,
  rowToModuleConfig,
} from "@/lib/discovery/discovery-import-export";
import { validatePortableDiscoveryDocument } from "@/lib/discovery/validateDiscoveryConfig";
import type {
  DiscoveryConfig,
  DiscoveryModuleConfig,
  DiscoveryModuleRow,
  DiscoveryScales,
  DiscoverySettingsRow,
  PortableDiscoveryDocument,
  ScoringRulesConfig,
} from "@/types/discovery";
import { DEFAULT_SCORING_RULES } from "@/types/discovery";
import type { Json } from "@/database.types";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

type ServiceClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

const SETTINGS_ID = "default";

function parseModuleRow(row: Record<string, unknown>): DiscoveryModuleRow {
  return {
    id: String(row.id),
    title: String(row.title),
    number: String(row.number),
    subtitle: row.subtitle != null ? String(row.subtitle) : null,
    description: row.description != null ? String(row.description) : null,
    answer_format: row.answer_format as DiscoveryModuleRow["answer_format"],
    num_items: Number(row.num_items ?? 0),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    content_json: (row.content_json ?? { categories: [], questions: [], profiles: [] }) as DiscoveryModuleRow["content_json"],
    updated_at: String(row.updated_at ?? ""),
    updated_by: row.updated_by != null ? String(row.updated_by) : null,
  };
}

function parseSettingsRow(row: Record<string, unknown>): DiscoverySettingsRow {
  return {
    id: String(row.id),
    scales_json: (row.scales_json ?? {}) as DiscoverySettingsRow["scales_json"],
    combined_profiles_json: (row.combined_profiles_json ??
      []) as DiscoverySettingsRow["combined_profiles_json"],
    scoring_rules_json: normalizeScoringRulesJson(row.scoring_rules_json),
    version: Number(row.version ?? 1),
    updated_at: String(row.updated_at ?? ""),
    updated_by: row.updated_by != null ? String(row.updated_by) : null,
  };
}

export async function fetchDiscoveryModuleRows(
  service: ServiceClient,
  options?: { activeOnly?: boolean },
): Promise<DiscoveryModuleRow[]> {
  let query = service.from("discovery_modules").select("*").order("sort_order", { ascending: true });
  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => parseModuleRow(row as Record<string, unknown>));
}

export async function fetchDiscoveryModuleRow(
  service: ServiceClient,
  moduleId: string,
): Promise<DiscoveryModuleRow | null> {
  const { data, error } = await service
    .from("discovery_modules")
    .select("*")
    .eq("id", moduleId)
    .maybeSingle();
  if (error) throw error;
  return data ? parseModuleRow(data as Record<string, unknown>) : null;
}

export async function fetchDiscoverySettings(service: ServiceClient): Promise<DiscoverySettingsRow> {
  const { data, error } = await service
    .from("discovery_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return {
      id: SETTINGS_ID,
      scales_json: {},
      combined_profiles_json: [],
      scoring_rules_json: DEFAULT_SCORING_RULES,
      version: 1,
      updated_at: new Date().toISOString(),
      updated_by: null,
    };
  }
  return parseSettingsRow(data as Record<string, unknown>);
}

export async function loadDiscoveryConfig(
  service: ServiceClient,
  options?: { activeOnly?: boolean },
): Promise<DiscoveryConfig> {
  const [modules, settings] = await Promise.all([
    fetchDiscoveryModuleRows(service, options),
    fetchDiscoverySettings(service),
  ]);
  return assembleDiscoveryConfig(modules, settings);
}

export async function exportPortableDocument(service: ServiceClient): Promise<PortableDiscoveryDocument> {
  const [modules, settings] = await Promise.all([
    fetchDiscoveryModuleRows(service),
    fetchDiscoverySettings(service),
  ]);
  return assemblePortableDocument(modules.map(rowToModuleConfig), settings);
}

async function bumpSettingsVersion(
  service: ServiceClient,
  updatedBy: string | null,
): Promise<number> {
  const current = await fetchDiscoverySettings(service);
  const nextVersion = current.version + 1;
  const { error } = await service
    .from("discovery_settings")
    .update({
      version: nextVersion,
      updated_by: updatedBy,
    })
    .eq("id", SETTINGS_ID);
  if (error) throw error;
  return nextVersion;
}

export async function saveDiscoveryModule(
  service: ServiceClient,
  module: DiscoveryModuleConfig,
  updatedBy: string | null,
): Promise<void> {
  const row = moduleConfigToRowInsert(module, updatedBy);
  const { error } = await service.from("discovery_modules").upsert({
    ...row,
    content_json: row.content_json as unknown as Json,
  });
  if (error) throw error;
  await bumpSettingsVersion(service, updatedBy);
}

export async function deleteDiscoveryModule(
  service: ServiceClient,
  moduleId: string,
  updatedBy: string | null,
): Promise<void> {
  const { error } = await service.from("discovery_modules").delete().eq("id", moduleId);
  if (error) throw error;
  await bumpSettingsVersion(service, updatedBy);
}

export type DiscoverySettingsUpdate = {
  scales_json?: DiscoveryScales;
  combined_profiles_json?: DiscoverySettingsRow["combined_profiles_json"];
  scoring_rules_json?: ScoringRulesConfig;
};

export async function saveDiscoverySettings(
  service: ServiceClient,
  partial: DiscoverySettingsUpdate,
  updatedBy: string | null,
): Promise<DiscoverySettingsRow> {
  const current = await fetchDiscoverySettings(service);
  const nextVersion = current.version + 1;
  const payload = {
    scales_json: (partial.scales_json ?? current.scales_json) as unknown as Json,
    combined_profiles_json: (partial.combined_profiles_json ??
      current.combined_profiles_json) as unknown as Json,
    scoring_rules_json: (partial.scoring_rules_json ?? current.scoring_rules_json) as unknown as Json,
    version: nextVersion,
    updated_by: updatedBy,
  };
  const { data, error } = await service
    .from("discovery_settings")
    .update(payload)
    .eq("id", SETTINGS_ID)
    .select("*")
    .single();
  if (error) throw error;
  return parseSettingsRow(data as Record<string, unknown>);
}

export async function replaceAllFromImport(
  service: ServiceClient,
  document: PortableDiscoveryDocument,
  updatedBy: string | null,
): Promise<DiscoverySettingsRow> {
  const validated = validatePortableDiscoveryDocument(document);
  if (!validated.ok) {
    throw new Error(validated.errors.map((e) => `${e.path}: ${e.message}`).join("; "));
  }

  const doc = validated.document;
  const moduleIds = doc.tests.map((t) => t.module_id);

  const { data: existing, error: existingError } = await service
    .from("discovery_modules")
    .select("id");
  if (existingError) throw existingError;

  const toDelete = (existing ?? [])
    .map((r) => String((r as { id: string }).id))
    .filter((id) => !moduleIds.includes(id));

  if (toDelete.length > 0) {
    const { error: deleteError } = await service.from("discovery_modules").delete().in("id", toDelete);
    if (deleteError) throw deleteError;
  }

  const rows = doc.tests.map((test, index) => {
    const module = portableTestToModuleConfig(test, index, true);
    return {
      ...moduleConfigToRowInsert(module, updatedBy),
      content_json: moduleConfigToContentJson(module) as unknown as Json,
    };
  });

  if (rows.length > 0) {
    const { error: upsertError } = await service.from("discovery_modules").upsert(rows);
    if (upsertError) throw upsertError;
  }

  const current = await fetchDiscoverySettings(service);
  const nextVersion = current.version + 1;
  const { data, error } = await service
    .from("discovery_settings")
    .update({
      scales_json: doc.scales as unknown as Json,
      combined_profiles_json: doc.combined_profiles as unknown as Json,
      scoring_rules_json: doc.scoring_rules as unknown as Json,
      version: nextVersion,
      updated_by: updatedBy,
    })
    .eq("id", SETTINGS_ID)
    .select("*")
    .single();
  if (error) throw error;
  return parseSettingsRow(data as Record<string, unknown>);
}

export async function fetchStudentAttempts(
  service: ServiceClient,
  studentId: string,
): Promise<Array<{ module_id: string; result_json: Json; answers_json: Json }>> {
  const { data, error } = await service
    .from("student_discovery_attempts")
    .select("module_id, result_json, answers_json")
    .eq("student_id", studentId);
  if (error) throw error;
  return (data ?? []) as Array<{ module_id: string; result_json: Json; answers_json: Json }>;
}

export async function upsertStudentAttempt(
  service: ServiceClient,
  input: {
    studentId: string;
    moduleId: string;
    answersJson: Json;
    resultJson: Json;
    configVersion: number;
    completedAt: string;
  },
): Promise<void> {
  const { error } = await service.from("student_discovery_attempts").upsert(
    {
      student_id: input.studentId,
      module_id: input.moduleId,
      answers_json: input.answersJson,
      result_json: input.resultJson,
      config_version: input.configVersion,
      completed_at: input.completedAt,
    },
    { onConflict: "student_id,module_id" },
  );
  if (error) throw error;
}

export async function upsertStudentDiscoveryProfile(
  service: ServiceClient,
  input: {
    studentId: string;
    completedModules: string[];
    combinedProfileJson: Json;
    configVersion: number;
  },
): Promise<void> {
  const { error } = await service.from("student_discovery_profiles").upsert({
    student_id: input.studentId,
    completed_modules: input.completedModules,
    combined_profile_json: input.combinedProfileJson,
    config_version: input.configVersion,
  });
  if (error) throw error;
}

export async function fetchStudentDiscoveryProfile(
  service: ServiceClient,
  studentId: string,
): Promise<{
  completed_modules: string[];
  combined_profile_json: Json;
  config_version: number;
} | null> {
  const { data, error } = await service
    .from("student_discovery_profiles")
    .select("completed_modules, combined_profile_json, config_version")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data as {
    completed_modules: string[];
    combined_profile_json: Json;
    config_version: number;
  } | null;
}

export async function fetchStudentAttempt(
  service: ServiceClient,
  studentId: string,
  moduleId: string,
): Promise<{ answers_json: Json; result_json: Json } | null> {
  const { data, error } = await service
    .from("student_discovery_attempts")
    .select("answers_json, result_json")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (error) throw error;
  return data as { answers_json: Json; result_json: Json } | null;
}
