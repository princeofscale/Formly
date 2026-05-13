'use client'

interface Props {
  current: string
}

export function LocaleSwitcher({ current }: Props) {
  function setLocale(locale: string) {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`
    window.location.reload()
  }

  return (
    <div className="flex gap-1 rounded-sm overflow-hidden border border-zinc-700">
      {(['ru', 'en'] as const).map(loc => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
            current === loc
              ? 'bg-amber-500 text-black'
              : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {loc}
        </button>
      ))}
    </div>
  )
}
