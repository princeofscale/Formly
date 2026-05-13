import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import { Trophy } from 'lucide-react'
import { getAchievements } from '@/lib/db/achievements'
import { ALL_ACHIEVEMENT_CODES } from '@/lib/services/achievements.service'
import { AchievementCard } from '@/components/profile/AchievementCard'

export default async function AchievementsPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('achievements')

  const unlocked = await getAchievements(supabase, user.id)
  const unlockedMap = new Map(unlocked.map(a => [a.code, a.unlocked_at]))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <Trophy className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider">{t('title')}</h1>
          <p className="text-sm text-zinc-500">
            {unlocked.length} / {ALL_ACHIEVEMENT_CODES.length} {t('unlocked')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75">
        {ALL_ACHIEVEMENT_CODES.map(code => (
          <AchievementCard
            key={code}
            code={code}
            unlockedAt={unlockedMap.get(code) ?? null}
          />
        ))}
      </div>
    </div>
  )
}
