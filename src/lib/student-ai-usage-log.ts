import type { Database, Json } from "@/database.types";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type AiUsageType = Database["public"]["Enums"]["ai_usage_type"];

export type StudentSessionAuth =
  | { ok: true; studentId: string }
  | { ok: false; status: 401 | 403; message: string };

export async function requireStudentSession(): Promise<StudentSessionAuth> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, status: 401, message: "Unauthorized." };
  }
  const meta = user.user_metadata as { type?: string } | undefined;
  if (meta?.type !== "student") {
    return { ok: false, status: 403, message: "Students only." };
  }
  const secret = await createSupabaseSecretClient();
  const { data: profile } = await secret
    .from("student_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return { ok: false, status: 403, message: "Student profile not found." };
  }
  return { ok: true, studentId: user.id };
}

export function extractOpenAiResponseUsage(result: unknown): {
  total: number;
  input: number;
  output: number;
} {
  if (!result || typeof result !== "object") {
    return { total: 0, input: 0, output: 0 };
  }
  const usage = (result as { usage?: Record<string, unknown> }).usage;
  if (!usage || typeof usage !== "object") {
    return { total: 0, input: 0, output: 0 };
  }
  const totalRaw = usage.total_tokens;
  const inputRaw = usage.input_tokens;
  const outputRaw = usage.output_tokens;
  const input = typeof inputRaw === "number" ? inputRaw : 0;
  const output = typeof outputRaw === "number" ? outputRaw : 0;
  const total =
    typeof totalRaw === "number" && Number.isFinite(totalRaw)
      ? totalRaw
      : input + output;
  return { total: Math.max(0, Math.round(total)), input, output };
}

function estimateCostUsd(usage: { input: number; output: number }): number {
  const per1mIn = Number(process.env.AI_USAGE_USD_PER_1M_INPUT_TOKENS ?? "");
  const per1mOut = Number(process.env.AI_USAGE_USD_PER_1M_OUTPUT_TOKENS ?? "");
  if (!Number.isFinite(per1mIn) && !Number.isFinite(per1mOut)) {
    return 0;
  }
  const inCost = Number.isFinite(per1mIn) ? (usage.input / 1_000_000) * per1mIn : 0;
  const outCost = Number.isFinite(per1mOut) ? (usage.output / 1_000_000) * per1mOut : 0;
  return Math.round((inCost + outCost) * 1_000_000) / 1_000_000;
}

export async function logStudentAiUsageAndActivity(opts: {
  studentId: string;
  type: AiUsageType;
  model: string;
  usage: { total: number; input: number; output: number };
  inputs: Json;
  outputs: Json;
  activityLog: {
    entitiy_type: string;
    entity_id: string;
    action: string;
    message: string;
  };
}): Promise<void> {
  const secret = await createSupabaseSecretClient();
  const cost = estimateCostUsd(opts.usage);

  const { error: usageErr } = await secret.from("ai_usage").insert({
    student_id: opts.studentId,
    type: opts.type,
    model: opts.model,
    tokens: Math.max(0, opts.usage.total),
    cost,
    inputs: opts.inputs,
    outputs: opts.outputs,
  });
  if (usageErr) {
    console.error("[ai_usage] insert failed:", usageErr);
  }

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: opts.activityLog.entitiy_type,
    entity_id: opts.activityLog.entity_id,
    action: opts.activityLog.action,
    message: opts.activityLog.message,
    created_by_type: "student",
    student_id: opts.studentId,
    admin_id: null,
    school_admin_id: null,
  });
  if (logErr) {
    console.error("[acitivity_logs] insert failed:", logErr);
  }
}
