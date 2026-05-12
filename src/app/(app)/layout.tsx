import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dumbbell, BarChart2, History, User, BookOpen, Trophy } from 'lucide-react'
import { signOutAction } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('nav')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <Dumbbell className="h-5 w-5" />
          GymLog
        </Link>
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit">{t('signOut')}</Button>
        </form>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>

      <nav className="border-t border-zinc-800 px-1 py-1 flex justify-around md:hidden sticky bottom-0 bg-zinc-950">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-50 py-1 px-1.5">
          <Dumbbell className="h-5 w-5" />
          {t('home')}
        </Link>
        <Link href="/history" className="flex flex-col items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-50 py-1 px-1.5">
          <History className="h-5 w-5" />
          {t('history')}
        </Link>
        <Link href="/records" className="flex flex-col items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-50 py-1 px-1.5">
          <Trophy className="h-5 w-5" />
          {t('records')}
        </Link>
        <Link href="/analytics" className="flex flex-col items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-50 py-1 px-1.5">
          <BarChart2 className="h-5 w-5" />
          {t('analytics')}
        </Link>
        <Link href="/exercise-library" className="flex flex-col items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-50 py-1 px-1.5">
          <BookOpen className="h-5 w-5" />
          {t('library')}
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-50 py-1 px-1.5">
          <User className="h-5 w-5" />
          {t('profile')}
        </Link>
      </nav>
    </div>
  )
}
