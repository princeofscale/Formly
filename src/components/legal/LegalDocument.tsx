import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'

export interface LegalSection {
  /** Anchor id — also the number shown beside the heading. */
  id: string
  title: string
  body: ReactNode
}

interface Props {
  eyebrow: string
  title: string
  intro: ReactNode
  sections: LegalSection[]
  meta: { label: string; value: string }[]
  contentsLabel: string
  backLabel: string
  /** The other document, linked at the foot. */
  sibling: { href: string; label: string }
}

/**
 * Shared chrome for the privacy policy and the terms.
 *
 * The two pages used to carry `prose prose-invert`, which does nothing here —
 * the Tailwind typography plugin is not installed — so every heading, list and
 * paragraph rendered at browser defaults. Spacing and rhythm are set here
 * instead, once, for both documents.
 */
export function LegalDocument({
  eyebrow,
  title,
  intro,
  sections,
  meta,
  contentsLabel,
  backLabel,
  sibling,
}: Props) {
  return (
    <div className="min-h-screen bg-[#050510] text-white">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-white/45 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <header className="mt-8 border-b border-white/10 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--tar-brand-2,#FFB627)]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">
            {title}
          </h1>

          <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-3">
            {meta.map((m) => (
              <div key={m.label}>
                <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                  {m.label}
                </dt>
                <dd className="mt-1 text-[13px] font-medium break-words text-white/80">
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="mt-8 space-y-3 text-[15px] leading-relaxed text-white/70">{intro}</div>

        <nav className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
            {contentsLabel}
          </p>
          <ol className="mt-3 space-y-1.5">
            {sections.map((s, i) => (
              <li key={s.id} className="flex gap-3 text-[13px]">
                <span className="w-4 shrink-0 text-right font-mono tabular-nums text-white/30">
                  {i + 1}
                </span>
                <a
                  href={`#${s.id}`}
                  className="text-white/65 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="mt-4">
          {sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-6 border-t border-white/[0.07] py-8 first:border-t-0"
            >
              <h2 className="flex gap-3 text-lg font-bold tracking-tight text-white">
                <span className="w-4 shrink-0 pt-1 text-right font-mono text-xs tabular-nums text-white/30">
                  {i + 1}
                </span>
                {s.title}
              </h2>
              <div className="legal-body mt-3 pl-0 sm:pl-7">{s.body}</div>
            </section>
          ))}
        </article>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40">
          <Link href={sibling.href} className="underline underline-offset-4 hover:text-white/80">
            {sibling.label}
          </Link>
          <span className="font-mono tracking-wider">Formly</span>
        </footer>
      </div>
    </div>
  )
}
