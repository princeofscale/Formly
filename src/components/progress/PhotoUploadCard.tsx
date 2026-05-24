'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Camera, Upload, Loader2, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerProgressPhotoAction } from '@/app/(app)/progress/photos/actions'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic'

export function PhotoUploadCard() {
  const t = useTranslations('progress.photos')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [weight, setWeight] = useState('')
  const [caption, setCaption] = useState('')
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'saving' | 'done' | 'error'>(
    'idle',
  )
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    if (picked.size > MAX_BYTES) {
      setError(t('errorTooBig'))
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(picked)
    setPreviewUrl(URL.createObjectURL(picked))
    setError(null)
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setWeight('')
    setCaption('')
    setProgress('idle')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!file) return
    setError(null)
    setProgress('uploading')
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `${user.id}/${filename}`

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      setProgress('saving')
      const weightVal = weight ? parseFloat(weight) : null
      startTransition(async () => {
        try {
          await registerProgressPhotoAction({
            storagePath: path,
            takenAt: new Date().toISOString(),
            weightKg: weightVal && Number.isFinite(weightVal) ? weightVal : null,
            caption: caption.trim() || null,
          })
          setProgress('done')
          router.refresh()
          setTimeout(reset, 1500)
        } catch (e) {
          setProgress('error')
          setError(e instanceof Error ? e.message : 'Failed to save')
        }
      })
    } catch (e) {
      setProgress('error')
      setError(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  return (
    <div
      className="rounded-[20px] p-5"
      style={{
        background: '#15151C',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255, 59, 71, 0.12)' }}
        >
          <Camera className="h-4 w-4" style={{ color: '#FF6E76' }} />
        </div>
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: '#FF6E76' }}
          >
            {t('addLabel')}
          </p>
          <p className="text-sm font-bold text-white">{t('addTitle')}</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        onChange={handlePick}
        className="hidden"
      />

      {!file && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-32 rounded-[14px] flex flex-col items-center justify-center gap-2 transition-colors"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          <Upload className="h-6 w-6" />
          <span className="text-xs font-bold uppercase tracking-widest">{t('pickFile')}</span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {t('maxSize')}
          </span>
        </button>
      )}

      {file && previewUrl && (
        <div className="space-y-3">
          <div
            className="relative rounded-[14px] overflow-hidden"
            style={{ aspectRatio: '3 / 4', maxHeight: 320 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
            {progress === 'idle' && (
              <button
                type="button"
                onClick={reset}
                className="absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center bg-black/60 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={t('weightPlaceholder')}
              className="h-10 px-3 rounded-[8px] text-sm bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 80))}
              placeholder={t('captionPlaceholder')}
              className="h-10 px-3 rounded-[8px] text-sm bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-600"
            />
          </div>

          {error && (
            <p className="text-[11px]" style={{ color: '#FF6E76' }}>
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={progress === 'uploading' || progress === 'saving'}
              className="flex-1 h-10 rounded-[8px] text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: '#FF3B47' }}
            >
              {progress === 'uploading' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('uploading')}
                </>
              )}
              {progress === 'saving' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('saving')}
                </>
              )}
              {progress === 'done' && (
                <>
                  <Check className="h-4 w-4" /> {t('saved')}
                </>
              )}
              {(progress === 'idle' || progress === 'error') && <>{t('save')}</>}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={progress === 'uploading' || progress === 'saving'}
              className="h-10 px-4 rounded-[8px] text-sm transition-colors disabled:opacity-40"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
