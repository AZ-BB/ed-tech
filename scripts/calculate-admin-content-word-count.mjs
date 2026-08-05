/**
 * Calculates word counts for all admin content types.
 * Run: node scripts/calculate-admin-content-word-count.mjs
 * Options: --verbose (per-row breakdown), --json (write report to content-review/admin-word-counts.json)
 */

import { createServerClient } from "@supabase/ssr";
import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config();

const BATCH_SIZE = 100;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env");
  process.exit(1);
}

const supabase = createServerClient(supabaseUrl, serviceKey, {
  cookies: { getAll: () => [], setAll: () => {} },
});

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const writeJson = args.includes("--json");

function wordCount(text) {
  const t = String(text ?? "").trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

function countWordsInStrings(values) {
  return values.reduce((sum, v) => sum + wordCount(v), 0);
}

function collectJsonStrings(value, out = []) {
  if (value == null) return out;
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJsonStrings(item, out);
    return out;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value)) collectJsonStrings(v, out);
  }
  return out;
}

function countJsonText(json) {
  return countWordsInStrings(collectJsonStrings(json));
}

function documentsToArray(doc) {
  if (doc == null) return [];
  if (Array.isArray(doc)) return doc.filter((x) => typeof x === "string");
  if (typeof doc === "object" && doc !== null && "items" in doc) {
    const items = doc.items;
    if (Array.isArray(items)) return items.filter((x) => typeof x === "string");
  }
  return [];
}

async function fetchAll(table, select = "*", orderCol = "id") {
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderCol, { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
  return all;
}

function rowLabel(row, ...keys) {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 60);
  }
  return row.id ?? row.slug ?? row.event_id ?? "unknown";
}

function summarizeRows(contentType, rows) {
  const rowCounts = rows.map((r) => r.wordCount);
  const total = rowCounts.reduce((a, b) => a + b, 0);
  const count = rowCounts.length;
  const average = count === 0 ? 0 : Math.round(total / count);
  return { contentType, count, totalWords: total, averageWords: average, rows };
}

// --- Per content type extractors ---

function countUniversityRow(row) {
  const docs = documentsToArray(row.documents);
  const majorText = (row.university_majors ?? []).flatMap((um) => {
    const parts = [um.majors?.name ?? ""];
    for (const p of um.university_major_programs ?? []) {
      if (p.programs?.name) parts.push(p.programs.name);
    }
    return parts;
  });
  return countWordsInStrings([
    row.name,
    row.description,
    row.sat_policy,
    row.method,
    row.intakes,
    row.tuition_display,
    row.living_display,
    row.address,
    row.countries?.name,
    row.city,
    row.state,
    row.is_scholarship_available ? "Scholarships available" : "",
    ...docs,
    ...majorText,
  ]);
}

function countScholarshipRow(row) {
  const docs = documentsToArray(row.documents);
  const fields =
    Array.isArray(row.fields) ? row.fields.filter((x) => typeof x === "string") : [];
  return countWordsInStrings([
    row.name,
    row.description,
    row.target_students,
    row.level,
    row.coverage,
    row.competition,
    row.tuition,
    row.travel,
    row.living_stipend,
    row.other_benefits,
    row.city,
    row.academic_eligibility,
    row.sat_policy,
    row.deadline,
    row.intakes,
    row.method,
    row.other,
    row.tooltip,
    ...fields,
    ...docs,
  ]) + countJsonText(row.discovery_payload);
}

function countInternshipRow(row) {
  return countWordsInStrings([
    row.name,
    row.summary,
    row.provider,
    row.field,
    row.location_label,
    row.duration,
    row.eligibility,
    row.how_to_apply,
    ...(row.what_youll_do ?? []),
    ...(row.what_youll_gain ?? []),
  ]);
}

function countProgramDiscoveryRow(row) {
  const topLevel = countWordsInStrings([
    row.title,
    row.short_description,
    row.description,
    row.category,
    row.salary_potential,
    row.demand_level,
    row.math_intensity,
    row.ai_resilience,
    ...(Array.isArray(row.tags) ? row.tags : []),
    ...(Array.isArray(row.characteristic_ids) ? row.characteristic_ids : []),
  ]);
  const nested = countJsonText([
    row.career_paths,
    row.core_skills,
    row.study_plan,
    row.day_in_life,
    row.salary_regions,
    row.career_examples,
    row.employers,
    row.videos,
  ]);
  return topLevel + nested;
}

function countUniversityProgramRow(row) {
  const pd = row.programs_discovery;
  return countWordsInStrings([
    row.short_description,
    row.program_school_note,
    row.ranking_note,
    row.tuition_note,
    pd?.title,
    pd?.description,
    row.universities?.name,
  ]);
}

function countDiscoveryModuleRow(row) {
  const base = countWordsInStrings([row.title, row.subtitle, row.description]);
  return base + countJsonText(row.content_json);
}

function countDiscoverySettingsRow(row) {
  return countJsonText(row.scales_json) + countJsonText(row.combined_profiles_json);
}

function countAnnouncementRow(row) {
  return countWordsInStrings([row.title, row.content]);
}

function countNewsRow(row) {
  return wordCount(row.text);
}

function countWebinarRow(row) {
  const agenda = Array.isArray(row.agenda) ? row.agenda : [];
  const tags = Array.isArray(row.tags) ? row.tags : [];
  return countWordsInStrings([
    row.title,
    row.description,
    row.host_name,
    row.host_title,
    row.host_bio,
    ...agenda,
    ...tags,
  ]);
}

function countEventRow(row) {
  return countWordsInStrings([
    row.event_name,
    row.short_description,
    row.full_overview,
    row.why_attend,
    row.prep_steps,
    row.topics_covered,
    row.target_audience,
    row.organizer,
    row.venue,
    row.city,
    row.country,
    row.cost,
    row.universities_attending,
  ]);
}

function countStudentStoryRow(row) {
  return countWordsInStrings([
    row.title,
    row.description,
    row.byline_meta_override,
    row.duration_label,
    row.student_story_topics?.name,
  ]);
}

async function main() {
  const results = [];

  // Universities
  {
    const rows = await fetchAll(
      "universities",
      `name, description, sat_policy, method, intakes, tuition_display, living_display, address, city, state,
       is_scholarship_available, documents, countries ( name ),
       university_majors ( majors ( name ), university_major_programs ( programs ( name ) ) )`,
      "name",
    );
    const counted = rows.map((row) => ({
      label: rowLabel(row, "name"),
      wordCount: countUniversityRow(row),
    }));
    results.push(summarizeRows("universities", counted));
  }

  // Scholarships
  {
    const rows = await fetchAll(
      "scholarships",
      `name, description, target_students, level, fields, coverage, competition, tuition, travel,
       living_stipend, other_benefits, city, academic_eligibility, sat_policy, deadline, intakes,
       method, other, tooltip, documents, discovery_payload`,
      "name",
    );
    const counted = rows.map((row) => ({
      label: rowLabel(row, "name"),
      wordCount: countScholarshipRow(row),
    }));
    results.push(summarizeRows("scholarships", counted));
  }

  // Internships
  {
    const rows = await fetchAll("internships", "*", "name");
    const counted = rows.map((row) => ({
      label: rowLabel(row, "name"),
      wordCount: countInternshipRow(row),
    }));
    results.push(summarizeRows("internships", counted));
  }

  // Programs Discovery
  {
    const rows = await fetchAll("programs_discovery", "*", "title");
    const counted = rows.map((row) => ({
      label: rowLabel(row, "title", "slug"),
      wordCount: countProgramDiscoveryRow(row),
    }));
    results.push(summarizeRows("programs-discovery", counted));
  }

  // University Programs
  {
    const rows = await fetchAll(
      "university_programs",
      `short_description, program_school_note, ranking_note, tuition_note,
       programs_discovery ( title, description ), universities ( name )`,
      "id",
    );
    const counted = rows.map((row) => ({
      label: rowLabel(row.programs_discovery ?? row, "title") + (row.universities?.name ? ` @ ${row.universities.name}` : ""),
      wordCount: countUniversityProgramRow(row),
    }));
    results.push(summarizeRows("university-programs", counted));
  }

  // Discovery Journey (modules + settings as one type)
  {
    const modules = await fetchAll("discovery_modules", "*", "sort_order");
    const moduleRows = modules.map((row) => ({
      label: `Module: ${rowLabel(row, "title")}`,
      wordCount: countDiscoveryModuleRow(row),
    }));
    const settingsRows = await fetchAll("discovery_settings", "*", "id");
    const settingsCounted = settingsRows.map((row) => ({
      label: "Discovery settings",
      wordCount: countDiscoverySettingsRow(row),
    }));
    results.push(summarizeRows("discovery-journey", [...moduleRows, ...settingsCounted]));
  }

  // Announcements
  {
    const rows = await fetchAll("announcements", "id, title, content", "created_at");
    const counted = rows.map((row) => ({
      label: rowLabel(row, "title"),
      wordCount: countAnnouncementRow(row),
    }));
    results.push(summarizeRows("announcements", counted));
  }

  // News
  {
    const rows = await fetchAll("news_items", "id, text, tag", "created_at");
    const counted = rows.map((row) => ({
      label: (row.text ?? "").trim().slice(0, 50) || row.id,
      wordCount: countNewsRow(row),
    }));
    results.push(summarizeRows("news", counted));
  }

  // Webinars
  {
    const rows = await fetchAll(
      "webinars",
      "id, title, description, host_name, host_title, host_bio, agenda, tags",
      "title",
    );
    const counted = rows.map((row) => ({
      label: rowLabel(row, "title"),
      wordCount: countWebinarRow(row),
    }));
    results.push(summarizeRows("webinars", counted));
  }

  // Events
  {
    const rows = await fetchAll("university_events", "*", "event_name");
    const counted = rows.map((row) => ({
      label: rowLabel(row, "event_name"),
      wordCount: countEventRow(row),
    }));
    results.push(summarizeRows("events", counted));
  }

  // Student Stories
  {
    const rows = await fetchAll(
      "student_stories",
      `id, title, description, byline_meta_override, duration_label, student_story_topics ( name )`,
      "title",
    );
    const counted = rows.map((row) => ({
      label: rowLabel(row, "title"),
      wordCount: countStudentStoryRow(row),
    }));
    results.push(summarizeRows("student-stories", counted));
  }

  const grandTotal = results.reduce((sum, r) => sum + r.totalWords, 0);
  const totalRows = results.reduce((sum, r) => sum + r.count, 0);
  const overallAverage = totalRows === 0 ? 0 : Math.round(grandTotal / totalRows);

  console.log("\n=== Admin Content Word Count Report ===\n");
  console.log(
    `${"Content Type".padEnd(22)} ${"Rows".padStart(6)} ${"Total Words".padStart(12)} ${"Avg/Row".padStart(10)}`,
  );
  console.log("-".repeat(52));

  for (const r of results) {
    console.log(
      `${r.contentType.padEnd(22)} ${String(r.count).padStart(6)} ${String(r.totalWords).padStart(12)} ${String(r.averageWords).padStart(10)}`,
    );
  }

  console.log("-".repeat(52));
  console.log(
    `${"TOTAL".padEnd(22)} ${String(totalRows).padStart(6)} ${String(grandTotal).padStart(12)} ${String(overallAverage).padStart(10)}`,
  );
  console.log(`\nApproximate total word count across all admin content: ~${grandTotal.toLocaleString()} words\n`);

  if (verbose) {
    console.log("\n--- Per-row breakdown ---\n");
    for (const r of results) {
      console.log(`\n## ${r.contentType} (${r.count} rows, avg ${r.averageWords} words)\n`);
      const sorted = [...r.rows].sort((a, b) => b.wordCount - a.wordCount);
      for (const row of sorted) {
        console.log(`  ${String(row.wordCount).padStart(6)}  ${row.label}`);
      }
    }
  }

  if (writeJson) {
    const outDir = join(process.cwd(), "content-review");
    mkdirSync(outDir, { recursive: true });
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalRows,
        grandTotalWords: grandTotal,
        overallAverageWords: overallAverage,
      },
      byContentType: results.map(({ contentType, count, totalWords, averageWords, rows }) => ({
        contentType,
        count,
        totalWords,
        averageWords,
        rows: rows.map(({ label, wordCount: wc }) => ({ label, wordCount: wc })),
      })),
    };
    const outPath = join(outDir, "admin-word-counts.json");
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
