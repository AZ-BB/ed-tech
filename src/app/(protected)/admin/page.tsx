import Link from "next/link"

export default function AdminHomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">Admin</h1>
      <p className="mt-2 text-sm text-[#555]">
        Platform administration tools.
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        <li>
          <Link
            href="/admin/universities/import"
            className="font-medium text-[#185FA5] underline underline-offset-2 hover:text-[#134a84]"
          >
            Import universities from CSV
          </Link>
        </li>
      </ul>
    </main>
  )
}
