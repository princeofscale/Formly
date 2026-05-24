'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CloudOff, CloudUpload } from 'lucide-react'
import { getQueuedSets, removeQueuedSet, type QueuedSetRecord } from '@/lib/utils/offline-queue'

async function flushOne(record: QueuedSetRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/sets/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record.payload),
    })
    if (!res.ok) return false
    await removeQueuedSet(record.id)
    return true
  } catch {
    return false
  }
}

async function drainQueue(): Promise<number> {
  const queued = await getQueuedSets()
  if (queued.length === 0) return 0
  let drained = 0
  for (const record of queued) {
    const ok = await flushOne(record)
    if (ok) drained++
    else break
  }
  return drained
}

export function OfflineSyncWatcher() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()
  const t = useTranslations('offline')

  useEffect(() => {
    async function refresh() {
      try {
        const queued = await getQueuedSets()
        setPendingCount(queued.length)
      } catch {
        // IDB unavailable (private mode in old Safari etc.) — silently ignore
      }
    }

    async function tryDrain() {
      if (!navigator.onLine) {
        await refresh()
        return
      }
      setSyncing(true)
      try {
        const drained = await drainQueue()
        const remaining = await getQueuedSets()
        setPendingCount(remaining.length)
        if (drained > 0 && remaining.length === 0) {
          router.refresh()
        }
      } catch {
        // network or IDB error — leave queue intact, retry next online event
      } finally {
        setSyncing(false)
      }
    }

    void tryDrain()

    const onOnline = () => {
      setIsOnline(true)
      void tryDrain()
    }
    const onOffline = () => {
      setIsOnline(false)
      void refresh()
    }
    const onQueued = () => void refresh()

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('trainingar:set-queued', onQueued)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('trainingar:set-queued', onQueued)
    }
  }, [router])

  if (pendingCount === 0 && isOnline) return null

  return (
    <div className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-900/95 px-3 py-1.5 text-xs shadow-lg ring-1 ring-white/10 backdrop-blur">
      {syncing ? (
        <>
          <CloudUpload className="h-3.5 w-3.5 animate-pulse text-amber-300" />
          <span className="font-bold text-amber-300">{t('syncing', { n: pendingCount })}</span>
        </>
      ) : !isOnline ? (
        <>
          <CloudOff className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-300">{t('offline', { n: pendingCount })}</span>
        </>
      ) : (
        <>
          <CloudUpload className="h-3.5 w-3.5 text-amber-300" />
          <span className="text-amber-300">{t('pending', { n: pendingCount })}</span>
        </>
      )}
    </div>
  )
}
