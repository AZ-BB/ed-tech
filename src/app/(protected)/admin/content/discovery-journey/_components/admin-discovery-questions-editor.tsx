"use client";

import { useState } from "react";
import type {
  AnswerFormat,
  DiscoveryQuestion,
  ScaleId,
} from "@/types/discovery";
import type { DiscoveryModuleContentAr } from "@/lib/discovery-translatable-fields";
import {
  defaultQuestionForAnswerFormat,
  emptyForcedQuestion,
  emptyRatingQuestion,
  emptyScenarioQuestion,
} from "../_lib/admin-discovery-form-factories";
import {
  getForcedOptionLabelAr,
  getQuestionTextAr,
  getScenarioOptionLabelAr,
  setForcedOptionLabelAr,
  setQuestionTextAr,
  setScenarioOptionLabelAr,
} from "../_lib/admin-discovery-content-ar-helpers";
import {
  BilingualField,
  CategoryField,
  CollapsibleSection,
  Field,
  ItemCard,
  discoverySelectClass,
} from "./admin-discovery-form-primitives";

type AdminDiscoveryQuestionsEditorProps = {
  questions: DiscoveryQuestion[];
  categories: string[];
  answerFormat: AnswerFormat;
  contentAr: DiscoveryModuleContentAr;
  onChange: (questions: DiscoveryQuestion[]) => void;
  onContentArChange: (contentAr: DiscoveryModuleContentAr) => void;
};

type ResponseType = DiscoveryQuestion["response_type"];

const RATING_SCALES: ScaleId[] = ["interest", "frequency", "importance", "preference"];

function questionTitle(question: DiscoveryQuestion): string {
  const preview = question.text.trim() || "(no text)";
  return `${question.item_id} — ${preview.length > 60 ? `${preview.slice(0, 60)}…` : preview}`;
}

function createQuestionForType(
  responseType: ResponseType,
  index: number,
  answerFormat: AnswerFormat,
  categories: string[],
): DiscoveryQuestion {
  const category = categories[0] ?? "";
  switch (responseType) {
    case "rating_1_5":
      return emptyRatingQuestion(
        answerFormat === "frequency"
          ? "frequency"
          : answerFormat === "importance"
            ? "importance"
            : answerFormat === "preference"
              ? "preference"
              : "interest",
        index,
        category,
      );
    case "forced_choice":
      return emptyForcedQuestion(index);
    case "scenario_select":
      return emptyScenarioQuestion(index);
    default:
      return defaultQuestionForAnswerFormat(answerFormat, index, categories);
  }
}

export function AdminDiscoveryQuestionsEditor({
  questions,
  categories,
  answerFormat,
  contentAr,
  onChange,
  onContentArChange,
}: AdminDiscoveryQuestionsEditorProps) {
  const [open, setOpen] = useState(true);

  function updateQuestion(index: number, next: DiscoveryQuestion) {
    onChange(questions.map((question, i) => (i === index ? next : question)));
  }

  function addQuestion() {
    const next = defaultQuestionForAnswerFormat(
      answerFormat,
      questions.length + 1,
      categories,
    );
    onChange([...questions, next]);
    setOpen(true);
  }

  return (
    <CollapsibleSection
      title="Questions"
      count={questions.length}
      open={open}
      onToggle={() => setOpen((current) => !current)}
      onAdd={addQuestion}
      addLabel="+ Add question"
    >
      {questions.length === 0 ? (
        <p className="text-[12px] text-[#a0a0a0]">No questions yet.</p>
      ) : (
        <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {questions.map((question, index) => (
            <ItemCard
              key={`${question.item_id}-${index}`}
              index={index}
              title={questionTitle(question)}
              onRemove={() => onChange(questions.filter((_, i) => i !== index))}
            >
              <QuestionFields
                question={question}
                categories={categories}
                answerFormat={answerFormat}
                contentAr={contentAr}
                onChange={(next) => updateQuestion(index, next)}
                onContentArChange={onContentArChange}
              />
            </ItemCard>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

function QuestionFields({
  question,
  categories,
  answerFormat,
  contentAr,
  onChange,
  onContentArChange,
}: {
  question: DiscoveryQuestion;
  categories: string[];
  answerFormat: AnswerFormat;
  contentAr: DiscoveryModuleContentAr;
  onChange: (question: DiscoveryQuestion) => void;
  onContentArChange: (contentAr: DiscoveryModuleContentAr) => void;
}) {
  const itemId = question.item_id;

  function changeResponseType(responseType: ResponseType) {
    if (question.response_type === responseType) return;
    const stableItemId = question.item_id || `q${Date.now()}`;
    const index = Number.parseInt(stableItemId.replace(/\D/g, ""), 10) || 1;
    const next = createQuestionForType(responseType, index, answerFormat, categories);
    onChange({ ...next, item_id: stableItemId, text: question.text });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Item ID"
          value={question.item_id}
          onChange={(nextItemId) => onChange({ ...question, item_id: nextItemId })}
        />
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-[#4a4a4a]">
            Response type
          </label>
          <select
            className={discoverySelectClass}
            value={question.response_type}
            onChange={(event) => changeResponseType(event.target.value as ResponseType)}
          >
            <option value="rating_1_5">rating_1_5</option>
            <option value="forced_choice">forced_choice</option>
            <option value="scenario_select">scenario_select</option>
          </select>
        </div>
      </div>

      <BilingualField
        label="Question text"
        enValue={question.text}
        arValue={getQuestionTextAr(contentAr, itemId)}
        multiline
        rows={3}
        onEnChange={(text) => onChange({ ...question, text })}
        onArChange={(text) => onContentArChange(setQuestionTextAr(contentAr, itemId, text))}
      />

      {question.response_type === "rating_1_5" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#4a4a4a]">Scale</label>
            <select
              className={discoverySelectClass}
              value={question.scale}
              onChange={(event) =>
                onChange({ ...question, scale: event.target.value as ScaleId })
              }
            >
              {RATING_SCALES.map((scale) => (
                <option key={scale} value={scale}>
                  {scale}
                </option>
              ))}
            </select>
          </div>
          <CategoryField
            label="Category"
            value={question.category}
            categories={categories}
            onChange={(category) => onChange({ ...question, category })}
          />
        </div>
      ) : null}

      {question.response_type === "forced_choice" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ForcedOptionFields
            label="Option A"
            value={question.optionA}
            categories={categories}
            arLabel={getForcedOptionLabelAr(contentAr, itemId, "optionA")}
            onChange={(optionA) => onChange({ ...question, optionA })}
            onArLabelChange={(label) =>
              onContentArChange(setForcedOptionLabelAr(contentAr, itemId, "optionA", label))
            }
          />
          <ForcedOptionFields
            label="Option B"
            value={question.optionB}
            categories={categories}
            arLabel={getForcedOptionLabelAr(contentAr, itemId, "optionB")}
            onChange={(optionB) => onChange({ ...question, optionB })}
            onArLabelChange={(label) =>
              onContentArChange(setForcedOptionLabelAr(contentAr, itemId, "optionB", label))
            }
          />
        </div>
      ) : null}

      {question.response_type === "scenario_select" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-[12px] font-semibold text-[#4a4a4a]">Scenario options</h5>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...question,
                  options: [...question.options, { label: "", category: "" }],
                })
              }
              className="text-[12px] font-semibold text-[#2D6A4F] hover:text-[#1B4332]"
            >
              + Add option
            </button>
          </div>
          {question.options.map((option, optionIndex) => (
            <div
              key={`scenario-${optionIndex}`}
              className="rounded-[8px] border border-[#ece9e4] bg-[#faf9f7] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold text-[#666]">
                  Option {optionIndex + 1}
                </span>
                <button
                  type="button"
                  disabled={question.options.length <= 2}
                  onClick={() =>
                    onChange({
                      ...question,
                      options: question.options.filter((_, i) => i !== optionIndex),
                    })
                  }
                  className="rounded-[6px] border border-[#fecaca] px-2.5 py-1 text-[11px] font-semibold text-[#b91c1c] disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
              <BilingualField
                label="Label"
                enValue={option.label}
                arValue={getScenarioOptionLabelAr(contentAr, itemId, optionIndex)}
                onEnChange={(label) =>
                  onChange({
                    ...question,
                    options: question.options.map((row, i) =>
                      i === optionIndex ? { ...row, label } : row,
                    ),
                  })
                }
                onArChange={(label) =>
                  onContentArChange(
                    setScenarioOptionLabelAr(contentAr, itemId, optionIndex, label),
                  )
                }
              />
              <div className="mt-3">
                <CategoryField
                  label="Category"
                  value={option.category}
                  categories={categories}
                  onChange={(category) =>
                    onChange({
                      ...question,
                      options: question.options.map((row, i) =>
                        i === optionIndex ? { ...row, category } : row,
                      ),
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ForcedOptionFields({
  label,
  value,
  categories,
  arLabel,
  onChange,
  onArLabelChange,
}: {
  label: string;
  value: { label: string; category: string };
  categories: string[];
  arLabel: string;
  onChange: (value: { label: string; category: string }) => void;
  onArLabelChange: (label: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-[8px] border border-[#ece9e4] bg-[#faf9f7] p-3">
      <h5 className="text-[12px] font-semibold text-[#4a4a4a]">{label}</h5>
      <BilingualField
        label="Label"
        enValue={value.label}
        arValue={arLabel}
        onEnChange={(nextLabel) => onChange({ ...value, label: nextLabel })}
        onArChange={onArLabelChange}
      />
      <CategoryField
        label="Category"
        value={value.category}
        categories={categories}
        onChange={(category) => onChange({ ...value, category })}
      />
    </div>
  );
}
