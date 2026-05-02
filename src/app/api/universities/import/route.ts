import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { csvToRecords, importUniversitiesFromCsvRecords } from "@/lib/university-csv-import"
import type { Database } from "@/database.types"
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabaseAuth = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const meta = user.user_metadata as { type?: string } | undefined
  if (meta?.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const service = await createSupabaseSecretClient()
  const { data: adminRow } = await service.from("admins").select("id").eq("id", user.id).maybeSingle()

  if (!adminRow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected multipart field \"file\" with a CSV" }, { status: 400 })
  }

  const text = await file.text()
  const records = csvToRecords(text)
  if (records.length === 0) {
    return NextResponse.json({ error: "No data rows found in CSV" }, { status: 400 })
  }

  const summary = await importUniversitiesFromCsvRecords(service, records, {
    defaultYear: new Date().getFullYear(),
  })

  return NextResponse.json(summary)
}
