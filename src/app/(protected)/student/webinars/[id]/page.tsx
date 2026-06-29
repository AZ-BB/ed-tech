import { requireStudentSession } from "@/lib/student-ai-usage-log";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { WebinarDetailClient } from "../_components/webinar-detail-client";
import {
  fetchStudentWebinarById,
  getStudentIdForWebinars,
} from "../_lib/fetch-student-webinars";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function parseWebinarId(idRaw: string): number | null {
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: idRaw } = await params;
  const id = parseWebinarId(idRaw);
  if (!id) {
    return { title: "Webinar not found" };
  }

  const webinar = await fetchStudentWebinarById(id, null);
  if (!webinar) {
    return { title: "Webinar not found" };
  }

  return {
    title: webinar.title,
  };
}

export default async function StudentWebinarDetailPage({ params }: PageProps) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const { id: idRaw } = await params;
  const id = parseWebinarId(idRaw);
  if (!id) {
    notFound();
  }

  const studentId = await getStudentIdForWebinars();
  const webinar = await fetchStudentWebinarById(id, studentId);
  if (!webinar) {
    notFound();
  }

  return <WebinarDetailClient initialWebinar={webinar} />;
}
