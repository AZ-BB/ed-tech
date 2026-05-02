"use client"

import { useState } from "react"

import type { ImportSummary } from "@/lib/university-csv-import"

export function UniversityCsvImportForm() {
  const [status, setStatus] = useState<"idle" | "uploading">("idle")
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setResult(null)

    const form = e.currentTarget
    const input = form.elements.namedItem("file") as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) {
      setError("Choose a CSV file first.")
      return
    }

    setStatus("uploading")
    try {
      const body = new FormData()
      body.set("file", file)

      const res = await fetch("/api/universities/import", {
        method: "POST",
        body,
      })

      const json = (await res.json()) as ImportSummary & { error?: string }

      if (!res.ok) {
        setError(json?.error ?? res.statusText)
        return
      }

      if ("error" in json && json.error) {
        setError(json.error)
        return
      }

      setResult(json as ImportSummary)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setStatus("idle")
      form.reset()
    }
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="csv" className="block text-sm font-medium text-[#1a1a1a]">
            University CSV
          </label>
          <input
            id="csv"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="mt-2 block w-full text-sm text-[#333] file:mr-3 file:rounded-md file:border-0 file:bg-[#185FA5] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#134a84]"
          />
        </div>
        <button
          type="submit"
          disabled={status === "uploading"}
          className="rounded-md bg-[#185FA5] px-4 py-2 text-sm font-medium text-white hover:bg-[#134a84] disabled:opacity-60"
        >
          {status === "uploading" ? "Importing…" : "Import CSV"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-md bg-[#f4f3f0] p-4 text-sm text-[#333]">
          <p>
            Processed rows: <strong>{result.processed}</strong>
          </p>
          <p>
            Universities inserted or updated: <strong>{result.universitiesUpserted}</strong>
          </p>
          {result.errors.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer font-medium text-red-800">
                {result.errors.length} row(s) failed
              </summary>
              <ul className="mt-2 max-h-48 list-inside list-disc overflow-y-auto text-xs">
                {result.errors.map((e) => (
                  <li key={`${e.rowNumber}-${e.message}`}>
                    Row {e.rowNumber}: {e.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
