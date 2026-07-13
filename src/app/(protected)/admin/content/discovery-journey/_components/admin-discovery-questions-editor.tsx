"use client";

import { useState } from "react";
import type {
  AnswerFormat,
  DiscoveryQuestion,
  ScaleId,
} from "@/types/discovery";
import {
  defaultQuestionForAnswerFormat,
  emptyForcedQuestion,
  emptyRatingQuestion,
  emptyScenarioQuestion,
} from "../_lib/admin-discovery-form-factories";
import {
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
  onChange: (questions: DiscoveryQuestion[]) => void;
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
  onChange,
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
                onChange={(next) => updateQuestion(index, next)}
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
  onChange,
}: {
  question: DiscoveryQuestion;
  categories: string[];
  answerFormat: AnswerFormat;
  onChange: (question: DiscoveryQuestion) => void;
}) {
  function changeResponseType(responseType: ResponseType) {
    if (question.response_type === responseType) return;
    const itemId = question.item_id || `q${Date.now()}`;
    const index = Number.parseInt(itemId.replace(/\D/g, ""), 10) || 1;
    const next = createQuestionForType(responseType, index, answerFormat, categories);
    onChange({ ...next, item_id: itemId, text: question.text });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Item ID"
          value={question.item_id}
          onChange={(item_id) => onChange({ ...question, item_id })}
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

      <Field
        label="Question text"
        value={question.text}
        multiline
        rows={3}
        onChange={(text) => onChange({ ...question, text })}
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
            onChange={(optionA) => onChange({ ...question, optionA })}
          />
          <ForcedOptionFields
            label="Option B"
            value={question.optionB}
            categories={categories}
            onChange={(optionB) => onChange({ ...question, optionB })}
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
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Label"
                  value={option.label}
                  onChange={(label) =>
                    onChange({
                      ...question,
                      options: question.options.map((row, i) =>
                        i === optionIndex ? { ...row, label } : row,
                      ),
                    })
                  }
                />
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
  onChange,
}: {
  label: string;
  value: { label: string; category: string };
  categories: string[];
  onChange: (value: { label: string; category: string }) => void;
}) {
  return (
    <div className="space-y-3 rounded-[8px] border border-[#ece9e4] bg-[#faf9f7] p-3">
      <h5 className="text-[12px] font-semibold text-[#4a4a4a]">{label}</h5>
      <Field
        label="Label"
        value={value.label}
        onChange={(nextLabel) => onChange({ ...value, label: nextLabel })}
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
