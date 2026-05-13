// src/components/profile/LanguageSelector.tsx
'use client'

interface Props {
  current: string
  label: string
}

export function LanguageSelector({ current, label }: Props) {
  function setLocale(locale: string) {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`
    window.location.reload()
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{label}</p>
      <div className="flex gap-2">
        {(['ru', 'en'] as const).map(loc => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={`px-5 py-2 text-sm font-bold uppercase rounded-sm transition-colors ${
              current === loc
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {loc === 'ru' ? 'РУС' : 'ENG'}
          </button>
        ))}
      </div>
    </div>
  )
}
