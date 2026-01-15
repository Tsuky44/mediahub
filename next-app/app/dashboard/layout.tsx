import { Navbar } from '@/components/Navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen text-gray-100">
      <Navbar />
      <main className="mx-auto w-full px-2 py-8 sm:px-4 lg:px-6">
        {children}
      </main>
    </div>
  )
}
