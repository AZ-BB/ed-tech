"use client";

import {
  saveAdminDiscoveryModule,
  saveAdminDiscoverySettings,
} from "@/actions/admin-discovery-journey";
import {
  translateAdminDiscoveryModule,
  translateAdminDiscoverySettings,
} from "@/actions/admin-discovery-journey-translation";
import {
  buildTranslatableDiscoveryModuleFields,
  buildTranslatableDiscoverySettingsFields,
  getDiscoveryModuleTranslationStatus,
  getDiscoverySettingsTranslationStatus,
  parseDiscoveryContentArMeta,
  parseDiscoveryModuleContentAr,
  parseDiscoverySettingsContentAr,
  type DiscoveryModuleContentAr,
  type DiscoverySettingsContentAr,
} from "@/lib/discovery-translatable-fields";
import type {
  CombinedProfileConfig,
  DiscoveryConfig,
  DiscoveryModuleConfig,
  DiscoveryScales,
  ScoringRulesConfig,
} from "@/types/discovery";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  emptyModuleContentAr,
  getModuleScalarAr,
  setModuleCategoriesAr,
  setModuleScalarAr,
  translationStatusClass,
  translationStatusLabel,
} from "../_lib/admin-discovery-content-ar-helpers";
import { AdminDiscoveryCombinedProfilesEditor } from "./admin-discovery-combined-profiles-editor";
import {
  BilingualField,
  BilingualStringListField,
  Field,
  SaveButton,
  discoverySelectClass,
} from "./admin-discovery-form-primitives";
import { AdminDiscoveryProfilesEditor } from "./admin-discovery-profiles-editor";
import { AdminDiscoveryQuestionsEditor } from "./admin-discovery-questions-editor";
import { AdminDiscoveryScalesEditor } from "./admin-discovery-scales-editor";
import { AdminDiscoveryScoringEditor } from "./admin-discovery-scoring-editor";

type AdminDiscoveryJourneyClientProps = {
  initialConfig: DiscoveryConfig;
  initialModulesContentAr: Record<string, DiscoveryModuleContentAr>;
  initialSettingsContentAr: DiscoverySettingsContentAr;
  initialSettingsRow: {
    scales_json: unknown;
    combined_profiles_json: unknown;
    content_ar: unknown;
    content_ar_meta: unknown;
  };
  initialModuleRows: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    content_json: unknown;
    content_ar: unknown;
    content_ar_meta: unknown;
  }>;
};

type EditorTab = "modules" | "scales" | "combined" | "scoring";

export function AdminDiscoveryJourneyClient({
  initialConfig,
  initialModulesContentAr,
  initialSettingsContentAr,
  initialSettingsRow,
  initialModuleRows,
}: AdminDiscoveryJourneyClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<EditorTab>("modules");
  const [modules, setModules] = useState<DiscoveryModuleConfig[]>(initialConfig.modules);
  const [scales, setScales] = useState<DiscoveryScales>(initialConfig.scales);
  const [combinedProfiles, setCombinedProfiles] = useState<CombinedProfileConfig[]>(
    initialConfig.combinedProfiles,
  );
  const [scoringRules, setScoringRules] = useState<ScoringRulesConfig>(
    initialConfig.scoringRules,
  );
  const [modulesContentAr, setModulesContentAr] = useState<
    Record<string, DiscoveryModuleContentAr>
  >(initialModulesContentAr);
  const [settingsContentAr, setSettingsContentAr] = useState<DiscoverySettingsContentAr>(
    initialSettingsContentAr,
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(
    initialConfig.modules[0]?.moduleId ?? null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTranslatingModule, setIsTranslatingModule] = useState(false);
  const [isTranslatingSettings, setIsTranslatingSettings] = useState(false);

  const selectedModule = useMemo(
    () => modules.find((m) => m.moduleId === selectedModuleId) ?? null,
    [modules, selectedModuleId],
  );

  const selectedModuleContentAr = useMemo(
    () =>
      selectedModuleId
        ? (modulesContentAr[selectedModuleId] ?? emptyModuleContentAr())
        : emptyModuleContentAr(),
    [modulesContentAr, selectedModuleId],
  );

  const selectedModuleRow = useMemo(
    () => initialModuleRows.find((row) => row.id === selectedModuleId) ?? null,
    [initialModuleRows, selectedModuleId],
  );

  const selectedModuleTranslationStatus = useMemo(() => {
    if (!selectedModule || !selectedModuleRow) return "not_translated" as const;
    return getDiscoveryModuleTranslationStatus(
      {
        id: selectedModuleRow.id,
        title: selectedModule.title,
        subtitle: selectedModule.subtitle,
        description: selectedModule.description,
        content_json: selectedModuleRow.content_json as never,
      },
      parseDiscoveryModuleContentAr(selectedModuleRow.content_ar as never),
      parseDiscoveryContentArMeta(selectedModuleRow.content_ar_meta as never),
    );
  }, [selectedModule, selectedModuleRow]);

  const settingsTranslationStatus = useMemo(() => {
    return getDiscoverySettingsTranslationStatus(
      {
        scales_json: initialSettingsRow.scales_json as never,
        combined_profiles_json: initialSettingsRow.combined_profiles_json as never,
      },
      parseDiscoverySettingsContentAr(initialSettingsRow.content_ar as never),
      parseDiscoveryContentArMeta(initialSettingsRow.content_ar_meta as never),
    );
  }, [initialSettingsRow]);

  function updateSelectedModule(patch: Partial<DiscoveryModuleConfig>) {
    if (!selectedModuleId) return;
    setModules((prev) =>
      prev.map((m) =>
        m.moduleId === selectedModuleId
          ? {
              ...m,
              ...patch,
              numItems: patch.questions ? patch.questions.length : m.questions.length,
            }
          : m,
      ),
    );
  }

  function updateSelectedModuleContentAr(contentAr: DiscoveryModuleContentAr) {
    if (!selectedModuleId) return;
    setModulesContentAr((prev) => ({ ...prev, [selectedModuleId]: contentAr }));
  }

  function handleSaveModule() {
    if (!selectedModule || !selectedModuleId) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveAdminDiscoveryModule(
        selectedModule,
        modulesContentAr[selectedModuleId] ?? emptyModuleContentAr(),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Saved module "${selectedModule.title}".`);
      router.refresh();
    });
  }

  function handleSaveSettings() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveAdminDiscoverySettings({
        scales_json: scales,
        combined_profiles_json: combinedProfiles,
        scoring_rules_json: scoringRules,
        content_ar: settingsContentAr,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Saved global discovery settings.");
      router.refresh();
    });
  }

  async function handleTranslateModule() {
    if (!selectedModuleId) return;
    setError(null);
    setMessage(null);
    setIsTranslatingModule(true);
    try {
      const result = await translateAdminDiscoveryModule(selectedModuleId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        `Translated ${result.translatedCount} field(s) for "${selectedModule?.title ?? selectedModuleId}".`,
      );
      router.refresh();
    } finally {
      setIsTranslatingModule(false);
    }
  }

  async function handleTranslateSettings() {
    setError(null);
    setMessage(null);
    setIsTranslatingSettings(true);
    try {
      const result = await translateAdminDiscoverySettings();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Translated ${result.translatedCount} settings field(s).`);
      router.refresh();
    } finally {
      setIsTranslatingSettings(false);
    }
  }

  const tabButton = (id: EditorTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-[8px] px-3 py-2 text-[12px] font-semibold ${
        tab === id
          ? "bg-[#2D6A4F] text-white"
          : "border border-[#e0deda] bg-white text-[#4a4a4a]"
      }`}
    >
      {label}
    </button>
  );

  const settingsFieldCount = buildTranslatableDiscoverySettingsFields({
    scales_json: scales as never,
    combined_profiles_json: combinedProfiles as never,
  }).length;

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-[8px] border border-[#b7e4c7] bg-[#d8f3dc] px-4 py-3 text-[13px] text-[#1B4332]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabButton("modules", "Modules")}
        {tabButton("scales", "Scales")}
        {tabButton("combined", "Combined profiles")}
        {tabButton("scoring", "Scoring rules")}
      </div>

      {tab === "modules" ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-[12px] border border-[#e0deda] bg-white p-4">
            <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Modules</h3>
            <ul className="mt-3 space-y-2">
              {modules.map((module) => (
                <li key={module.moduleId}>
                  <button
                    type="button"
                    onClick={() => setSelectedModuleId(module.moduleId)}
                    className={`w-full rounded-[8px] px-3 py-2 text-left text-[13px] ${
                      selectedModuleId === module.moduleId
                        ? "bg-[#E8F5EE] text-[#1B4332]"
                        : "hover:bg-[#f7f7f5]"
                    }`}
                  >
                    <div className="font-semibold">
                      {module.number}. {module.title}
                    </div>
                    <div className="text-[11px] text-[#666]">
                      {module.answerFormat} · {module.questions.length} questions
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selectedModule ? (
            <div className="flex max-h-[calc(100vh-240px)] min-h-[480px] flex-col overflow-hidden rounded-[12px] border border-[#e0deda] bg-white">
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`rounded-[6px] border px-2.5 py-1 text-[11px] font-semibold ${translationStatusClass(selectedModuleTranslationStatus)}`}
                  >
                    Arabic: {translationStatusLabel(selectedModuleTranslationStatus)}
                  </span>
                  <button
                    type="button"
                    disabled={isTranslatingModule}
                    onClick={() => void handleTranslateModule()}
                    className="rounded-[8px] border border-[#2D6A4F] px-3 py-1.5 text-[12px] font-semibold text-[#2D6A4F] disabled:opacity-60"
                  >
                    {isTranslatingModule ? "Translating…" : "Translate to Arabic"}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Number"
                    value={selectedModule.number}
                    onChange={(number) => updateSelectedModule({ number })}
                  />
                  <div>
                    <label className="mb-1 block text-[12px] font-semibold text-[#4a4a4a]">
                      Answer format
                    </label>
                    <select
                      className={discoverySelectClass}
                      value={selectedModule.answerFormat}
                      onChange={(e) =>
                        updateSelectedModule({
                          answerFormat: e.target.value as DiscoveryModuleConfig["answerFormat"],
                        })
                      }
                    >
                      <option value="interest">interest</option>
                      <option value="frequency">frequency</option>
                      <option value="importance">importance</option>
                      <option value="preference">preference</option>
                      <option value="forced">forced</option>
                      <option value="scenario">scenario</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 pt-6 text-[12px] font-semibold text-[#4a4a4a] md:col-span-2">
                    <input
                      type="checkbox"
                      checked={selectedModule.isActive}
                      onChange={(e) => updateSelectedModule({ isActive: e.target.checked })}
                    />
                    Active
                  </label>
                </div>

                <BilingualField
                  label="Title"
                  enValue={selectedModule.title}
                  arValue={getModuleScalarAr(selectedModuleContentAr, "title")}
                  onEnChange={(title) => updateSelectedModule({ title })}
                  onArChange={(title) =>
                    updateSelectedModuleContentAr(
                      setModuleScalarAr(selectedModuleContentAr, "title", title),
                    )
                  }
                />

                <BilingualField
                  label="Subtitle"
                  enValue={selectedModule.subtitle ?? ""}
                  arValue={getModuleScalarAr(selectedModuleContentAr, "subtitle")}
                  onEnChange={(subtitle) =>
                    updateSelectedModule({ subtitle: subtitle || null })
                  }
                  onArChange={(subtitle) =>
                    updateSelectedModuleContentAr(
                      setModuleScalarAr(selectedModuleContentAr, "subtitle", subtitle),
                    )
                  }
                />

                <BilingualField
                  label="Description"
                  enValue={selectedModule.description ?? ""}
                  arValue={getModuleScalarAr(selectedModuleContentAr, "description")}
                  multiline
                  rows={3}
                  onEnChange={(description) =>
                    updateSelectedModule({ description: description || null })
                  }
                  onArChange={(description) =>
                    updateSelectedModuleContentAr(
                      setModuleScalarAr(selectedModuleContentAr, "description", description),
                    )
                  }
                />

                <BilingualStringListField
                  label="Categories"
                  enValue={selectedModule.categories}
                  arValue={selectedModuleContentAr.categories ?? []}
                  rows={5}
                  onEnChange={(categories) => updateSelectedModule({ categories })}
                  onArChange={(categories) =>
                    updateSelectedModuleContentAr(
                      setModuleCategoriesAr(selectedModuleContentAr, categories),
                    )
                  }
                />

                <AdminDiscoveryQuestionsEditor
                  questions={selectedModule.questions}
                  categories={selectedModule.categories}
                  answerFormat={selectedModule.answerFormat}
                  contentAr={selectedModuleContentAr}
                  onChange={(questions) => updateSelectedModule({ questions })}
                  onContentArChange={updateSelectedModuleContentAr}
                />

                <AdminDiscoveryProfilesEditor
                  profiles={selectedModule.profiles}
                  categories={selectedModule.categories}
                  contentAr={selectedModuleContentAr}
                  onChange={(profiles) => updateSelectedModule({ profiles })}
                  onContentArChange={updateSelectedModuleContentAr}
                />

                <p className="text-[11px] text-[#a0a0a0]">
                  {buildTranslatableDiscoveryModuleFields({
                    id: selectedModule.moduleId,
                    title: selectedModule.title,
                    subtitle: selectedModule.subtitle,
                    description: selectedModule.description,
                    content_json: {
                      categories: selectedModule.categories,
                      questions: selectedModule.questions,
                      profiles: selectedModule.profiles,
                    } as never,
                  }).length}{" "}
                  translatable fields in this module
                </p>
              </div>

              <div className="shrink-0 border-t border-[#e0deda] bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
                <SaveButton
                  label="Save module"
                  disabled={isPending}
                  onClick={handleSaveModule}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-[12px] border border-dashed border-[#e0deda] bg-white p-8 text-[13px] text-[#666]">
              No modules yet. Import JSON to get started.
            </div>
          )}
        </div>
      ) : null}

      {tab === "scales" ? (
        <div className="rounded-[12px] border border-[#e0deda] bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span
              className={`rounded-[6px] border px-2.5 py-1 text-[11px] font-semibold ${translationStatusClass(settingsTranslationStatus)}`}
            >
              Arabic: {translationStatusLabel(settingsTranslationStatus)}
            </span>
            <button
              type="button"
              disabled={isTranslatingSettings}
              onClick={() => void handleTranslateSettings()}
              className="rounded-[8px] border border-[#2D6A4F] px-3 py-1.5 text-[12px] font-semibold text-[#2D6A4F] disabled:opacity-60"
            >
              {isTranslatingSettings ? "Translating…" : "Translate settings to Arabic"}
            </button>
          </div>
          <AdminDiscoveryScalesEditor
            value={scales}
            contentAr={settingsContentAr}
            onChange={setScales}
            onContentArChange={setSettingsContentAr}
          />
          <div className="mt-4">
            <SaveButton
              label="Save settings"
              disabled={isPending}
              onClick={handleSaveSettings}
            />
          </div>
        </div>
      ) : null}

      {tab === "combined" ? (
        <div className="rounded-[12px] border border-[#e0deda] bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span
              className={`rounded-[6px] border px-2.5 py-1 text-[11px] font-semibold ${translationStatusClass(settingsTranslationStatus)}`}
            >
              Arabic: {translationStatusLabel(settingsTranslationStatus)}
            </span>
            <button
              type="button"
              disabled={isTranslatingSettings}
              onClick={() => void handleTranslateSettings()}
              className="rounded-[8px] border border-[#2D6A4F] px-3 py-1.5 text-[12px] font-semibold text-[#2D6A4F] disabled:opacity-60"
            >
              {isTranslatingSettings ? "Translating…" : "Translate settings to Arabic"}
            </button>
          </div>
          <AdminDiscoveryCombinedProfilesEditor
            value={combinedProfiles}
            contentAr={settingsContentAr}
            onChange={setCombinedProfiles}
            onContentArChange={setSettingsContentAr}
          />
          <div className="mt-4">
            <SaveButton
              label="Save settings"
              disabled={isPending}
              onClick={handleSaveSettings}
            />
          </div>
        </div>
      ) : null}

      {tab === "scoring" ? (
        <div className="rounded-[12px] border border-[#e0deda] bg-white p-4">
          <AdminDiscoveryScoringEditor value={scoringRules} onChange={setScoringRules} />
          <div className="mt-4">
            <SaveButton
              label="Save settings"
              disabled={isPending}
              onClick={handleSaveSettings}
            />
          </div>
        </div>
      ) : null}

      <div className="text-[12px] text-[#666]">
        Config version: {initialConfig.version} · {modules.length} module(s) ·{" "}
        {settingsFieldCount} translatable settings fields
      </div>
    </div>
  );
}
