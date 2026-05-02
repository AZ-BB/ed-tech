import Link from "next/link"

import { UniversityCsvImportForm } from "./_components/university-csv-import-form"

export default function AdminUniversityImportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/admin"
        className="text-sm font-medium text-[#185FA5] underline underline-offset-2 hover:text-[#134a84]"
      >
        ← Admin home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#1a1a1a]">
        Import universities
      </h1>
      <p className="mt-2 text-sm text-[#555]">
        Upload a CSV file. Each row upserts a university (matched by{" "}
        <code className="rounded bg-black/5 px-1">name</code> and{" "}
        <code className="rounded bg-black/5 px-1">country_code</code>
        ), ensures countries exist, then links majors and programs from{" "}
        <code className="rounded bg-black/5 px-1">prog1_name</code>…
        <code className="rounded bg-black/5 px-1">prog4_name</code> and comma-separated{" "}
        <code className="rounded bg-black/5 px-1">prog*_items</code>.
      </p>
      <div className="mt-8">
        <UniversityCsvImportForm />
      </div>
    </main>
  )
}
