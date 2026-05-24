'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Dumbbell, Target, Zap } from 'lucide-react'
import { updateProfileAction } from '@/app/(app)/profile/actions'

export function OnboardingModal() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [schedule, setSchedule] = useState<number[]>([])
  const [, startTransition] = useTransition()
  const t = useTranslations('onboarding')

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!localStorage.getItem('gymlog_onboarded')) setVisible(true)
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  function finish() {
    localStorage.setItem('gymlog_onboarded', 'true')
    setVisible(false)
  }

  function handleDataSave() {
    if (weight || height || age) {
      startTransition(async () => {
        const fd = new FormData()
        if (weight) fd.append('weight_kg', weight)
        if (height) fd.append('height_cm', height)
        if (age) fd.append('age', age)
        await updateProfileAction(fd)
      })
    }
    setStep(2)
  }

  function handleScheduleSave() {
    startTransition(async () => {
      const fd = new FormData()
      schedule.forEach((d) => fd.append('training_schedule', String(d)))
      await updateProfileAction(fd)
      finish()
    })
  }

  function toggleDay(day: number) {
    setSchedule((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  if (!visible) return null

  const DAYS = [
    { n: 1, label: 'Пн' },
    { n: 2, label: 'Вт' },
    { n: 3, label: 'Ср' },
    { n: 4, label: 'Чт' },
    { n: 5, label: 'Пт' },
    { n: 6, label: 'Сб' },
    { n: 7, label: 'Вс' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm mx-4 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300"
        style={{
          background: 'rgba(10,10,30,0.85)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '1rem',
        }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'bg-amber-500 w-6'
                  : i < step
                    ? 'bg-amber-500/50 w-2'
                    : 'bg-white/20 w-2'
              }`}
            />
          ))}
        </div>

        {/* Step 0 — Goal */}
        {step === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-center">{t('step1Title')}</h2>
            <div className="space-y-2">
              {(
                [
                  { key: 'mass', icon: Dumbbell },
                  { key: 'lean', icon: Zap },
                  { key: 'strength', icon: Target },
                ] as const
              ).map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    localStorage.setItem('gymlog_goal', key)
                    setStep(1)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/40 text-left"
                >
                  <Icon className="h-5 w-5 text-amber-500 shrink-0" />
                  <span className="font-semibold">{t(`goal.${key}`)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Stats */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-center">{t('step2Title')}</h2>
            <div className="space-y-3">
              {[
                { label: 'Вес (кг)', value: weight, onChange: setWeight, placeholder: '80' },
                { label: 'Рост (см)', value: height, onChange: setHeight, placeholder: '180' },
                { label: 'Возраст', value: age, onChange: setAge, placeholder: '25' },
              ].map(({ label, value, onChange, placeholder }) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">{label}</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 outline-none text-white font-mono"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={finish}
                className="flex-1 h-11 rounded-xl text-zinc-400 hover:text-zinc-200 text-sm transition-colors border border-white/10 hover:border-white/20"
              >
                {t('skip')}
              </button>
              <button
                onClick={handleDataSave}
                className="flex-1 h-11 rounded-xl font-bold text-black text-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Schedule */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-center">{t('step3Title')}</h2>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map(({ n, label }) => (
                <button
                  key={n}
                  onClick={() => toggleDay(n)}
                  className={`h-10 rounded-lg text-xs font-bold transition-all ${
                    schedule.includes(n)
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={finish}
                className="flex-1 h-11 rounded-xl text-zinc-400 hover:text-zinc-200 text-sm transition-colors border border-white/10 hover:border-white/20"
              >
                {t('skip')}
              </button>
              <button
                onClick={handleScheduleSave}
                className="flex-1 h-11 rounded-xl font-bold text-black text-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
              >
                {t('start')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
