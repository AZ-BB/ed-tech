/**
 * Estimates Agrid translation token usage for admin content entities.
 * Run: node scripts/estimate-translation-tokens.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(join(process.cwd(), file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m && !process.env[m[1].trim()]) {
          process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
        }
      }
      return;
    } catch {
      /* try next */
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

function charCount(v) {
  if (v == null) return 0;
  if (typeof v === "string") return v.trim().length;
  if (typeof v === "number" || typeof v === "boolean") return 0;
  if (Array.isArray(v)) return v.reduce((s, x) => s + charCount(x), 0);
  if (typeof v === "object") return Object.values(v).reduce((s, x) => s + charCount(x), 0);
  return 0;
}

/** Rough EN→AR estimate: ~1 token per 4 chars input + overhead per API call */
function estimateTokensFromChars(chars, apiCalls = 1) {
  const inputTokens = Math.ceil(chars / 4);
  const outputTokens = Math.ceil((chars * 1.3) / 4); // Arabic often longer
  const perCallOverhead = 150; // workflow prompt overhead estimate
  return inputTokens + outputTokens + perCallOverhead * apiCalls;
}

function docsFromJson(doc) {
  if (doc == null) return [];
  if (Array.isArray(doc)) return doc.filter((x) => typeof x === "string" && x.trim());
  if (typeof doc === "object" && doc !== null && "items" in doc) {
    const items = doc.items;
    if (Array.isArray(items)) return items.filter((x) => typeof x === "string" && x.trim());
  }
  return [];
}

function collectJsonStrings(obj, out = []) {
  if (obj == null) return out;
  if (typeof obj === "string" && obj.trim()) {
    out.push(obj.trim());
    return out;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) collectJsonStrings(item, out);
    return out;
  }
  if (typeof obj === "object") {
    for (const v of Object.values(obj)) collectJsonStrings(v, out);
  }
  return out;
}

async function fetchAll(table, select, pageSize = 1000) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function analyzeUniversities() {
  const rows = await fetchAll(
    "universities",
    "id, name, city, description, tuition_display, tuition_per_year, living_display, estimated_living_cost_per_year, sat_policy, method, intakes, documents, is_scholarship_available",
  );

  let totalChars = 0;
  let apiCalls = 0;

  for (const u of rows) {
    const fields = [
      u.name,
      u.description,
      u.city,
      u.tuition_display,
      u.living_display,
      u.sat_policy,
      u.method,
    ].filter(Boolean);

    for (const f of fields) {
      if (f?.trim()) {
        totalChars += f.trim().length;
        apiCalls += 1;
      }
    }

    const docs = docsFromJson(u.documents);
    for (const d of docs) {
      totalChars += d.length;
      apiCalls += 1;
    }

    if (u.is_scholarship_available) {
      const note =
        "Scholarships may be available to qualified students. Check the university website for the latest details.";
      totalChars += note.length;
      apiCalls += 1;
    }
  }

  // majors/programs linked to universities without name_ar
  const { data: majorLinks } = await supabase.from("university_majors").select(`
    majors ( id, name, name_ar ),
    university_major_programs ( programs ( id, name, name_ar ) )
  `);

  const majorSet = new Set();
  const programSet = new Set();
  for (const row of majorLinks ?? []) {
    const major = row.majors;
    if (major?.name?.trim() && !major.name_ar?.trim() && !majorSet.has(major.id)) {
      majorSet.add(major.id);
      totalChars += major.name.trim().length;
      apiCalls += 1;
    }
    for (const link of row.university_major_programs ?? []) {
      const program = link.programs;
      if (program?.name?.trim() && !program.name_ar?.trim() && !programSet.has(program.id)) {
        programSet.add(program.id);
        totalChars += program.name.trim().length;
        apiCalls += 1;
      }
    }
  }

  // Actual tokens from translation_responses for universities
  const { data: trRows } = await supabase
    .from("translation_responses")
    .select("total_tokens, source_text, entity_type")
    .in("entity_type", ["university", "major", "program"]);

  const actualTokens = (trRows ?? []).reduce((s, r) => s + (r.total_tokens ?? 0), 0);
  const actualCalls = (trRows ?? []).filter((r) => r.total_tokens != null).length;
  const avgTokensPerCall =
    actualCalls > 0 ? Math.round(actualTokens / actualCalls) : null;

  return {
    count: rows.length,
    totalChars,
    apiCalls,
    estimatedTokens: estimateTokensFromChars(totalChars, apiCalls),
    actualLoggedTokens: actualTokens,
    actualLoggedCalls: actualCalls,
    avgTokensPerCall,
    majorsWithoutAr: majorSet.size,
    programsWithoutAr: programSet.size,
  };
}

async function analyzeScholarships() {
  const rows = await fetchAll(
    "scholarships",
    "name, description, target_students, level, fields, coverage, competition, tuition, travel, living_stipend, other_benefits, city, academic_eligibility, sat_policy, documents, deadline, method, tooltip, other, discovery_payload",
  );

  let totalChars = 0;
  let apiCalls = 0;

  const scalarFields = [
    "name",
    "description",
    "target_students",
    "level",
    "fields",
    "coverage",
    "competition",
    "tuition",
    "travel",
    "living_stipend",
    "other_benefits",
    "city",
    "academic_eligibility",
    "sat_policy",
    "documents",
    "deadline",
    "method",
    "tooltip",
    "other",
  ];

  for (const s of rows) {
    for (const key of scalarFields) {
      const v = s[key];
      if (typeof v === "string" && v.trim()) {
        totalChars += v.trim().length;
        apiCalls += 1;
      }
    }
    if (s.discovery_payload) {
      const strings = collectJsonStrings(s.discovery_payload);
      for (const str of strings) {
        totalChars += str.length;
        apiCalls += 1;
      }
    }
  }

  return {
    count: rows.length,
    totalChars,
    apiCalls,
    estimatedTokens: estimateTokensFromChars(totalChars, apiCalls),
  };
}

async function analyzeInternships() {
  const rows = await fetchAll(
    "internships",
    "name, provider, location_label, field, pay_label, duration, summary, what_youll_do, what_youll_gain, eligibility, how_to_apply",
  );

  let totalChars = 0;
  let apiCalls = 0;

  for (const i of rows) {
    for (const key of [
      "name",
      "provider",
      "location_label",
      "field",
      "pay_label",
      "duration",
      "summary",
      "eligibility",
      "how_to_apply",
    ]) {
      const v = i[key];
      if (typeof v === "string" && v.trim()) {
        totalChars += v.trim().length;
        apiCalls += 1;
      }
    }
    for (const arrKey of ["what_youll_do", "what_youll_gain"]) {
      for (const line of i[arrKey] ?? []) {
        if (typeof line === "string" && line.trim()) {
          totalChars += line.trim().length;
          apiCalls += 1;
        }
      }
    }
  }

  return {
    count: rows.length,
    totalChars,
    apiCalls,
    estimatedTokens: estimateTokensFromChars(totalChars, apiCalls),
  };
}

async function analyzeProgramsDiscovery() {
  const rows = await fetchAll(
    "programs_discovery",
    "title, short_description, description, tags, career_paths, core_skills, study_plan, day_in_life, salary_regions, career_examples, employers, videos",
  );

  let totalChars = 0;
  let apiCalls = 0;

  for (const p of rows) {
    for (const key of ["title", "short_description", "description"]) {
      const v = p[key];
      if (typeof v === "string" && v.trim()) {
        totalChars += v.trim().length;
        apiCalls += 1;
      }
    }
    for (const tag of p.tags ?? []) {
      if (typeof tag === "string" && tag.trim()) {
        totalChars += tag.trim().length;
        apiCalls += 1;
      }
    }
    for (const sectionKey of [
      "career_paths",
      "core_skills",
      "study_plan",
      "day_in_life",
      "salary_regions",
      "career_examples",
      "employers",
      "videos",
    ]) {
      const strings = collectJsonStrings(p[sectionKey]);
      for (const str of strings) {
        totalChars += str.length;
        apiCalls += 1;
      }
    }
  }

  return {
    count: rows.length,
    totalChars,
    apiCalls,
    estimatedTokens: estimateTokensFromChars(totalChars, apiCalls),
  };
}

async function analyzeEvents() {
  const rows = await fetchAll(
    "university_events",
    "event_name, event_type, recommended_tag, short_description, full_overview, topics_covered, target_audience, why_attend, prep_steps, city, venue, organizer, universities_attending, cost",
  );

  let totalChars = 0;
  let apiCalls = 0;

  const fields = [
    "event_name",
    "event_type",
    "recommended_tag",
    "short_description",
    "full_overview",
    "topics_covered",
    "target_audience",
    "why_attend",
    "prep_steps",
    "city",
    "venue",
    "organizer",
    "universities_attending",
    "cost",
  ];

  for (const e of rows) {
    for (const key of fields) {
      const v = e[key];
      if (typeof v === "string" && v.trim()) {
        totalChars += v.trim().length;
        apiCalls += 1;
      }
    }
  }

  return {
    count: rows.length,
    totalChars,
    apiCalls,
    estimatedTokens: estimateTokensFromChars(totalChars, apiCalls),
  };
}

async function main() {
  const [unis, scholarships, internships, programs, events] = await Promise.all([
    analyzeUniversities(),
    analyzeScholarships(),
    analyzeInternships(),
    analyzeProgramsDiscovery(),
    analyzeEvents(),
  ]);

  const sections = {
    universities: unis,
    scholarships,
    internships,
    programs_discovery: programs,
    events,
  };

  let grandChars = 0;
  let grandCalls = 0;
  let grandEstimate = 0;

  console.log("\n=== Admin Content Translation Token Estimate ===\n");
  console.log(
    "Entity".padEnd(22),
    "Records".padStart(8),
    "API Calls".padStart(10),
    "Chars".padStart(10),
    "Est. Tokens".padStart(12),
  );
  console.log("-".repeat(64));

  for (const [name, data] of Object.entries(sections)) {
    grandChars += data.totalChars;
    grandCalls += data.apiCalls;
    grandEstimate += data.estimatedTokens;
    console.log(
      name.padEnd(22),
      String(data.count).padStart(8),
      String(data.apiCalls).padStart(10),
      String(data.totalChars).padStart(10),
      String(data.estimatedTokens).padStart(12),
    );
  }

  console.log("-".repeat(64));
  console.log(
    "TOTAL".padEnd(22),
    "".padStart(8),
    String(grandCalls).padStart(10),
    String(grandChars).padStart(10),
    String(grandEstimate).padStart(12),
  );

  if (unis.actualLoggedTokens > 0) {
    console.log("\n--- Universities: actual Agrid usage (from translation_responses) ---");
    console.log(`Logged API calls: ${unis.actualLoggedCalls}`);
    console.log(`Logged total tokens: ${unis.actualLoggedTokens.toLocaleString()}`);
    console.log(`Avg tokens per call: ${unis.avgTokensPerCall}`);
    const projectedFromActual =
      unis.avgTokensPerCall != null ? unis.avgTokensPerCall * unis.apiCalls : null;
    if (projectedFromActual != null) {
      console.log(
        `Projected for all ${unis.count} universities (avg × calls): ${projectedFromActual.toLocaleString()} tokens`,
      );
    }
  }

  console.log("\nNotes:");
  console.log("- Universities already have translation; other entities do not.");
  console.log("- Estimates assume 1 Agrid API call per text field (same as university flow).");
  console.log("- intakes/city/country for universities use rule-based lookup (no API tokens).");
  console.log("- Est. tokens = input + output + ~150 overhead per API call.\n");

  console.log(JSON.stringify({ sections, totals: { grandChars, grandCalls, grandEstimate } }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
