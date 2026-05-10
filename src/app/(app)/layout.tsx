import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dumbbell, BarChart2, History, User } from 'lucide-react'
import { signOutAction } from './actions'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <Dumbbell className="h-5 w-5" />
          GymLog
        </Link>
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit">Sign out</Button>
        </form>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>

      <nav className="border-t border-zinc-800 px-4 py-2 flex justify-around md:hidden sticky bottom-0 bg-zinc-950">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-xs text-zinc-400 hover:text-zinc-50 py-1">
          <Dumbbell className="h-5 w-5" />
          Home
        </Link>
        <Link href="/history" className="flex flex-col items-center gap-1 text-xs text-zinc-400 hover:text-zinc-50 py-1">
          <History className="h-5 w-5" />
          History
        </Link>
        <Link href="/analytics" className="flex flex-col items-center gap-1 text-xs text-zinc-400 hover:text-zinc-50 py-1">
          <BarChart2 className="h-5 w-5" />
          Analytics
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-xs text-zinc-400 hover:text-zinc-50 py-1">
          <User className="h-5 w-5" />
          Profile
        </Link>
      </nav>
    </div>
  )
}
