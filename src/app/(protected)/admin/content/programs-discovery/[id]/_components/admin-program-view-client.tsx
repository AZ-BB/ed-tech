"use client";

import {
  deleteAdminProgramDiscovery,
  setAdminProgramDiscoveryActive,
} from "@/actions/admin-programs-discovery";
import { ADMIN_PROGRAMS_DISCOVERY_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { stringifyProgramJsonSections } from "../../../_lib/admin-program-form-json";
import type { ProgramsDiscoveryRow } from "@/lib/programs-discovery-types";
import {
  AdminEditProgramDialog,
} from "../../../_components/admin-edit-program-dialog";
import {
  programRowToFormValues,
} from "../../../_components/admin-program-form-fields";
import { AdminProgramJsonSectionsView } from "./admin-program-json-sections-view";

type AdminProgramViewClientProps = {
  program: ProgramsDiscoveryRow;
};

export function AdminProgramViewClient({ program }: AdminProgramViewClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const formValues = programRowToFormValues({
    ...program,
    ...stringifyProgramJsonSections(program),
  });

  function toggleActive() {
    const nextActive = !(program.active ?? true);
    const message = nextActive
      ? `Activate ${program.title}?`
      : `Deactivate ${program.title}? Students will no longer see it.`;

    if (!window.confirm(message)) return;

    setStatusError(null);
    startStatusTransition(async () => {
      const result = await setAdminProgramDiscoveryActive(program.id, nextActive);
      if (!result.ok) {
        setStatusError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete ${program.title}? This cannot be undone.`,
      )
    ) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteAdminProgramDiscovery(program.id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.push(ADMIN_PROGRAMS_DISCOVERY_HOME);
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={ADMIN_PROGRAMS_DISCOVERY_HOME}
              className="text-[12px] font-semibold text-[#2D6A4F] hover:underline"
            >
              ← Back to programs
            </Link>
            <h1 className="mt-2 text-[24px] font-bold text-[#1a1a1a]">
              {program.title}
            </h1>
            <p className="mt-1 text-[13px] text-[#666]">
              {program.category} · <span className="font-mono">{program.slug}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={isStatusPending}
              onClick={toggleActive}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] disabled:opacity-60"
            >
              {program.active ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              disabled={isDeletePending}
              onClick={handleDelete}
              className="rounded-[8px] border border-[#f1c7c7] bg-[#fff5f5] px-4 py-2 text-[12px] font-semibold text-[#b42318] disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </div>

        {statusError ? (
          <p className="text-[13px] text-red-600">{statusError}</p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Overview">
            <Info label="Short description" value={program.short_description} />
            <Info label="Description" value={program.description} />
            <Info label="Salary potential" value={program.salary_potential} />
            <Info label="Demand level" value={program.demand_level} />
            <Info label="Math intensity" value={program.math_intensity} />
            <Info label="AI resilience" value={program.ai_resilience} />
          </SectionCard>
          <SectionCard title="Metadata">
            <Info
              label="Tags"
              value={program.tags?.join(" · ") ?? null}
            />
            <Info
              label="Characteristics"
              value={program.characteristic_ids?.join(" · ") ?? null}
            />
          </SectionCard>
        </div>

        <AdminProgramJsonSectionsView program={program} />
      </div>

      <AdminEditProgramDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        programId={program.id}
        values={formValues}
      />
    </>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-[#ece9e4] bg-white p-5">
      <h2 className="text-[14px] font-bold text-[#1a1a1a]">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-[#4a4a4a]">{value?.trim() || "—"}</div>
    </div>
  );
}
