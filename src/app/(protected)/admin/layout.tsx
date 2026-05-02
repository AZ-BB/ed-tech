export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f3f0] text-[#1a1a1a] antialiased">
      {children}
    </div>
  )
}
