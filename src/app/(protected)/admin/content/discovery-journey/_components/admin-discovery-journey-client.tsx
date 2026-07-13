"use client";

import {
  saveAdminDiscoveryModule,
  saveAdminDiscoverySettings,
} from "@/actions/admin-discovery-journey";
import type {
  CombinedProfileConfig,
  DiscoveryConfig,
  DiscoveryModuleConfig,
  DiscoveryScales,
  ScoringRulesConfig,
} from "@/types/discovery";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AdminDiscoveryCombinedProfilesEditor } from "./admin-discovery-combined-profiles-editor";
import {
  Field,
  SaveButton,
  StringListField,
  discoverySelectClass,
} from "./admin-discovery-form-primitives";
import { AdminDiscoveryProfilesEditor } from "./admin-discovery-profiles-editor";
import { AdminDiscoveryQuestionsEditor } from "./admin-discovery-questions-editor";
import { AdminDiscoveryScalesEditor } from "./admin-discovery-scales-editor";
import { AdminDiscoveryScoringEditor } from "./admin-discovery-scoring-editor";

type AdminDiscoveryJourneyClientProps = {
  initialConfig: DiscoveryConfig;
};

type EditorTab = "modules" | "scales" | "combined" | "scoring";

export function AdminDiscoveryJourneyClient({
  initialConfig,
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
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(
    initialConfig.modules[0]?.moduleId ?? null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedModule = useMemo(
    () => modules.find((m) => m.moduleId === selectedModuleId) ?? null,
    [modules, selectedModuleId],
  );

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

  function handleSaveModule() {
    if (!selectedModule) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveAdminDiscoveryModule(selectedModule);
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
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Saved global discovery settings.");
      router.refresh();
    });
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
                <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Title"
                  value={selectedModule.title}
                  onChange={(title) => updateSelectedModule({ title })}
                />
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
                <label className="flex items-center gap-2 pt-6 text-[12px] font-semibold text-[#4a4a4a]">
                  <input
                    type="checkbox"
                    checked={selectedModule.isActive}
                    onChange={(e) => updateSelectedModule({ isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <Field
                label="Subtitle"
                value={selectedModule.subtitle ?? ""}
                onChange={(subtitle) => updateSelectedModule({ subtitle: subtitle || null })}
              />
              <Field
                label="Description"
                value={selectedModule.description ?? ""}
                multiline
                rows={3}
                onChange={(description) =>
                  updateSelectedModule({ description: description || null })
                }
              />

              <StringListField
                label="Categories (one per line)"
                value={selectedModule.categories}
                rows={5}
                onChange={(categories) => updateSelectedModule({ categories })}
              />

              <AdminDiscoveryQuestionsEditor
                questions={selectedModule.questions}
                categories={selectedModule.categories}
                answerFormat={selectedModule.answerFormat}
                onChange={(questions) => updateSelectedModule({ questions })}
              />

              <AdminDiscoveryProfilesEditor
                profiles={selectedModule.profiles}
                categories={selectedModule.categories}
                onChange={(profiles) => updateSelectedModule({ profiles })}
              />
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
          <AdminDiscoveryScalesEditor value={scales} onChange={setScales} />
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
          <AdminDiscoveryCombinedProfilesEditor
            value={combinedProfiles}
            onChange={setCombinedProfiles}
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
        Config version: {initialConfig.version} · {modules.length} module(s)
      </div>
    </div>
  );
}
