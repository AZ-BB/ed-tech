import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminTranslationHistoryPageFilters } from "./parse-admin-translation-history-search-params";

/** Cap of raw API-call rows loaded before grouping (first-version in-memory group). */
const FETCH_ROW_CAP = 3000;

export type AdminTranslationHistoryCall = {
  id: string;
  createdAt: string;
  entityType: string | null;
  entityId: string | null;
  fieldKey: string | null;
  totalTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string | null;
  httpStatus: number | null;
  workflowStatus: string | null;
  errorMessage: string | null;
};

export type AdminTranslationHistoryGroup = {
  /** request_id when present; otherwise the single call row id */
  groupKey: string;
  requestId: string | null;
  startedAt: string;
  callCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  model: string | null;
  requestedBy: string | null;
  requestedByName: string | null;
  errorCount: number;
  okCount: number;
  calls: AdminTranslationHistoryCall[];
};

type TranslationResponseRow = {
  id: string;
  created_at: string;
  request_id: string | null;
  model: string | null;
  total_tokens: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  entity_type: string | null;
  entity_id: string | null;
  field_key: string | null;
  http_status: number | null;
  workflow_status: string | null;
  error_message: string | null;
  requested_by: string | null;
};

function personName(
  first: string | null | undefined,
  last: string | null | undefined,
): string | null {
  const name = [first, last].map((s) => s?.trim()).filter(Boolean).join(" ");
  return name || null;
}

function isErrorCall(row: TranslationResponseRow): boolean {
  return Boolean(row.error_message?.trim());
}

function groupKeyForRow(row: TranslationResponseRow): string {
  const requestId = row.request_id?.trim();
  return requestId || row.id;
}

function buildGroups(rows: TranslationResponseRow[]): AdminTranslationHistoryGroup[] {
  const map = new Map<string, TranslationResponseRow[]>();

  for (const row of rows) {
    const key = groupKeyForRow(row);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }

  const groups: AdminTranslationHistoryGroup[] = [];

  for (const [groupKey, calls] of map) {
    calls.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const requestId = calls.find((c) => c.request_id?.trim())?.request_id?.trim() || null;
    const startedAt = calls[0]?.created_at ?? new Date(0).toISOString();
    const totalTokens = calls.reduce((sum, c) => sum + (c.total_tokens ?? 0), 0);
    const inputTokens = calls.reduce((sum, c) => sum + (c.input_tokens ?? 0), 0);
    const outputTokens = calls.reduce((sum, c) => sum + (c.output_tokens ?? 0), 0);
    const model =
      calls.map((c) => c.model?.trim()).find((m) => Boolean(m)) || null;
    const requestedBy =
      calls.map((c) => c.requested_by).find((id) => Boolean(id)) || null;
    const errorCount = calls.filter(isErrorCall).length;
    const okCount = calls.length - errorCount;

    groups.push({
      groupKey,
      requestId,
      startedAt,
      callCount: calls.length,
      totalTokens,
      inputTokens,
      outputTokens,
      model,
      requestedBy,
      requestedByName: null,
      errorCount,
      okCount,
      calls: calls.map((c) => ({
        id: c.id,
        createdAt: c.created_at,
        entityType: c.entity_type,
        entityId: c.entity_id,
        fieldKey: c.field_key,
        totalTokens: c.total_tokens,
        inputTokens: c.input_tokens,
        outputTokens: c.output_tokens,
        model: c.model,
        httpStatus: c.http_status,
        workflowStatus: c.workflow_status,
        errorMessage: c.error_message,
      })),
    });
  }

  groups.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  return groups;
}

function groupMatchesQuery(group: AdminTranslationHistoryGroup, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;

  if (group.requestId?.toLowerCase().includes(needle)) return true;
  if (group.groupKey.toLowerCase().includes(needle)) return true;
  if (group.model?.toLowerCase().includes(needle)) return true;
  if (group.requestedBy?.toLowerCase().includes(needle)) return true;
  if (group.requestedByName?.toLowerCase().includes(needle)) return true;

  return group.calls.some((call) => {
    const haystack = [
      call.entityType,
      call.entityId,
      call.fieldKey,
      call.model,
      call.workflowStatus,
      call.errorMessage,
      call.httpStatus != null ? String(call.httpStatus) : null,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export async function fetchAdminTranslationHistoryPage(
  filters: AdminTranslationHistoryPageFilters,
): Promise<{
  groups: AdminTranslationHistoryGroup[];
  totalGroups: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}> {
  const { q, page, limit } = filters;
  const client = await createSupabaseSecretClient();
  const trimmed = q.trim();

  const [pageResult, totals] = await Promise.all([
    client
      .from("translation_responses")
      .select(
        `
      id,
      created_at,
      request_id,
      model,
      total_tokens,
      input_tokens,
      output_tokens,
      entity_type,
      entity_id,
      field_key,
      http_status,
      workflow_status,
      error_message,
      requested_by
    `,
      )
      .order("created_at", { ascending: false })
      .limit(FETCH_ROW_CAP),
    fetchTranslationTokenTotals(client),
  ]);

  const { data, error } = pageResult;

  if (error) {
    console.error("[fetchAdminTranslationHistoryPage] translation_responses", error);
    return {
      groups: [],
      totalGroups: 0,
      totalInputTokens: totals.totalInputTokens,
      totalOutputTokens: totals.totalOutputTokens,
    };
  }

  let groups = buildGroups((data ?? []) as TranslationResponseRow[]);

  const requesterIds = [
    ...new Set(groups.map((g) => g.requestedBy).filter((id): id is string => Boolean(id))),
  ];

  if (requesterIds.length > 0) {
    const { data: admins, error: adminError } = await client
      .from("admins")
      .select("id, first_name, last_name")
      .in("id", requesterIds);

    if (adminError) {
      console.error("[fetchAdminTranslationHistoryPage] admins", adminError);
    } else {
      const nameById = new Map<string, string>();
      for (const admin of admins ?? []) {
        const name = personName(admin.first_name, admin.last_name);
        if (name) nameById.set(admin.id, name);
      }
      groups = groups.map((g) => ({
        ...g,
        requestedByName: g.requestedBy ? (nameById.get(g.requestedBy) ?? null) : null,
      }));
    }
  }

  if (trimmed) {
    groups = groups.filter((g) => groupMatchesQuery(g, trimmed));
  }

  const totalGroups = groups.length;
  const offset = (Math.max(1, page) - 1) * limit;
  const pageGroups = groups.slice(offset, offset + limit);

  return {
    groups: pageGroups,
    totalGroups,
    totalInputTokens: totals.totalInputTokens,
    totalOutputTokens: totals.totalOutputTokens,
  };
}

async function fetchTranslationTokenTotals(
  client: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
): Promise<{ totalInputTokens: number; totalOutputTokens: number }> {
  const pageSize = 1000;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from("translation_responses")
      .select("input_tokens, output_tokens")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("[fetchTranslationTokenTotals]", error);
      return { totalInputTokens: 0, totalOutputTokens: 0 };
    }

    const batch = data ?? [];
    for (const row of batch) {
      totalInputTokens += row.input_tokens ?? 0;
      totalOutputTokens += row.output_tokens ?? 0;
    }

    if (batch.length < pageSize) break;
  }

  return { totalInputTokens, totalOutputTokens };
}
