import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'

// NOTE for the developer:
//   This is a STARTER privacy policy template tailored to Formly's actual
//   data flow (Supabase auth + DB, Vercel hosting, Mistral AI, Web Push).
//   It is NOT legal advice. Before shipping to app stores or to users in
//   regulated regions (EU, UK, California, Russia), have a lawyer review.
//   You MUST fill in: contact email, your legal name/handle, jurisdiction.

export const metadata = {
  title: 'Privacy Policy — Formly',
  description: 'How Formly handles your personal and health data.',
}

const LAST_UPDATED = '2026-05-21'
const CONTACT = 'test3huioblya@gmail.com'
const OPERATOR = 'Formly (independent developer)' // ← или ФИО

export default async function PrivacyPage() {
  const locale = await getLocale()
  const ru = locale === 'ru'

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          {ru ? 'Назад' : 'Back'}
        </Link>

        <article className="prose prose-invert mt-6 max-w-none">
          <h1 className="text-3xl font-extrabold tracking-tight">
            {ru ? 'Политика конфиденциальности' : 'Privacy Policy'}
          </h1>
          <p className="text-xs uppercase tracking-widest text-white/40">
            {ru ? 'Обновлено' : 'Last updated'}: {LAST_UPDATED}
          </p>

          {ru ? (
            <PrivacyRu contact={CONTACT} operator={OPERATOR} />
          ) : (
            <PrivacyEn contact={CONTACT} operator={OPERATOR} />
          )}

          <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/40">
            <Link href="/terms" className="underline hover:text-white/70">
              {ru ? 'Правила использования' : 'Terms of Service'}
            </Link>
          </div>
        </article>
      </div>
    </div>
  )
}

function PrivacyEn({ contact, operator }: { contact: string; operator: string }) {
  return (
    <>
      <p className="text-white/70">
        This policy explains what data <strong>Formly</strong> collects, why, where it lives, and
        what you can do about it. We try to keep it short and honest. The service is operated by{' '}
        {operator} (the &quot;Operator&quot;).
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong>: email, hashed password (we never see your raw password),
          optional profile info (name, body weight, height, training schedule).
        </li>
        <li>
          <strong>Workout data</strong>: sessions, sets (weight, reps, RPE), exercises, templates,
          notes you write.
        </li>
        <li>
          <strong>Body data you choose to log</strong>: sleep hours, body measurements (waist,
          biceps, etc.), progress photos you upload, mood ratings.
        </li>
        <li>
          <strong>Cardio data</strong>: duration, distance, heart rate if you enter it.
        </li>
        <li>
          <strong>Push subscription</strong>: an opaque endpoint provided by your browser if you
          enable rest-timer or daily-reminder notifications. No phone number, no IMEI.
        </li>
        <li>
          <strong>Technical logs</strong>: request IP and user-agent stored by our hosting provider
          (Vercel) for security and abuse prevention, retained ~30 days.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> collect: location, contacts, calendar, microphone, camera (other
        than the photo you explicitly upload), browsing history, advertising IDs.
      </p>

      <h2>2. Where it&apos;s stored</h2>
      <p>
        Account, workout, and body data lives in <strong>Supabase</strong> (PostgreSQL + Storage),
        hosted in the EU. Progress photos are stored in a private Supabase Storage bucket with
        row-level security — only your own session can read them, served via signed URLs that
        expire. The site itself runs on <strong>Vercel</strong>. Push notifications are sent via{' '}
        <strong>Web Push (VAPID)</strong> directly to your browser&apos;s push service
        (Apple/Google/Mozilla). AI insights are computed by <strong>Mistral AI</strong> — we send
        the minimum context (recent stats) and never your raw email or photos.
      </p>

      <h2>3. Why we collect it</h2>
      <p>
        The legal basis is <em>your contract with us</em> to provide the workout-tracking service
        (GDPR Art. 6(1)(b)), and your <em>explicit consent</em> for optional features (push
        notifications, AI insights). We do not sell your data, ever. We do not show ads.
      </p>

      <h2>4. Your rights</h2>
      <ul>
        <li>
          <strong>Access</strong>: export all your workouts via the in-app CSV export.
        </li>
        <li>
          <strong>Correction</strong>: edit any session, set, or measurement at any time.
        </li>
        <li>
          <strong>Deletion</strong>: delete individual entries in the app, or request full account
          deletion (see §7) — your account and all linked rows in workout_sessions, set_entries,
          sleep_logs, progress_photos, body_measurements, user_goals are cascaded.
        </li>
        <li>
          <strong>Portability</strong>: CSV export covers the structured data; raw photos can be
          downloaded from the gallery.
        </li>
        <li>
          <strong>Withdraw consent</strong>: turn off push notifications in browser settings; turn
          off AI insights in profile settings.
        </li>
      </ul>

      <h2>5. Health & medical disclaimer</h2>
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        Formly is a <strong>logging tool</strong>, not a doctor. The 1RM estimates, RPE-based
        progression suggestions, &quot;strength tier&quot; labels, and AI insights are calculated
        from formulas and your inputs — they are educational, not medical advice. Consult a
        qualified professional before starting any training program, especially if you have
        injuries, are pregnant, or have cardiovascular conditions. Lift at your own risk. The
        Operator is not liable for any injury or loss arising from use of the service.
      </p>

      <h2>6. Children</h2>
      <p>
        The service is not directed at users under 13. If you are between 13 and 18, use it only
        with parental permission. We do not knowingly collect data from users under 13; if you are a
        parent and believe your child has registered, contact us and we will delete the account.
      </p>

      <h2>7. Account deletion</h2>
      <p>
        Email{' '}
        <a href={`mailto:${contact}`} className="underline">
          {contact}
        </a>{' '}
        from the address linked to your account with subject <em>&quot;Delete my account&quot;</em>.
        We will erase your account and all linked data within 14 days. Backups in our hosting
        providers are rotated within 30 days.
      </p>

      <h2>8. Security</h2>
      <p>
        Passwords are hashed by Supabase using industry-standard algorithms (bcrypt/argon2). All
        traffic is HTTPS. Row-level security in PostgreSQL ensures one user cannot read another
        user&apos;s rows. We patch dependencies regularly. No system is perfect — if you spot a
        vulnerability, please disclose responsibly to{' '}
        <a href={`mailto:${contact}`} className="underline">
          {contact}
        </a>
        .
      </p>

      <h2>9. Changes</h2>
      <p>
        If this policy changes materially, we will surface a notice in the app before the changes
        take effect.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions, requests, or complaints — write to{' '}
        <a href={`mailto:${contact}`} className="underline">
          {contact}
        </a>
        .
      </p>
    </>
  )
}

function PrivacyRu({ contact, operator }: { contact: string; operator: string }) {
  return (
    <>
      <p className="text-white/70">
        Эта политика описывает какие данные собирает <strong>Formly</strong>, зачем, где они
        хранятся и что ты можешь с ними сделать. Мы стараемся писать коротко и честно. Сервис
        эксплуатируется {operator} (далее «Оператор»).
      </p>

      <h2>1. Какие данные собираем</h2>
      <ul>
        <li>
          <strong>Учётные</strong>: email, хешированный пароль (исходный пароль мы не видим),
          опциональные поля профиля (имя, вес тела, рост, расписание).
        </li>
        <li>
          <strong>Тренировочные</strong>: сессии, подходы (вес, повторы, RPE), упражнения, шаблоны,
          заметки.
        </li>
        <li>
          <strong>Тело</strong> (по твоему выбору): часы сна, замеры (талия, бицепс и т.п.), фото
          прогресса, настроение.
        </li>
        <li>
          <strong>Кардио</strong>: продолжительность, дистанция, пульс — если ты вбил.
        </li>
        <li>
          <strong>Подписка на push</strong>: непрозрачный endpoint от твоего браузера, если ты
          включил уведомления таймера отдыха или ежедневные напоминания. Никаких телефонов и IMEI.
        </li>
        <li>
          <strong>Технические логи</strong>: IP запроса и user-agent хранятся хостингом (Vercel) для
          безопасности ~30 дней.
        </li>
      </ul>
      <p>
        Мы <strong>не</strong> собираем: геолокацию, контакты, календарь, микрофон, камеру (кроме
        фото которые ты сам загрузил), историю браузера, рекламные ID.
      </p>

      <h2>2. Где данные лежат</h2>
      <p>
        Учётные, тренировочные и телесные данные хранятся в <strong>Supabase</strong> (PostgreSQL +
        Storage), хостинг в ЕС. Фото прогресса — в приватном Storage-бакете Supabase с row-level
        security: их видишь только ты, выдаются через signed URL с истечением. Сайт работает на{' '}
        <strong>Vercel</strong>. Push-уведомления идут через <strong>Web Push (VAPID)</strong>{' '}
        напрямую в push-сервис твоего браузера (Apple/Google/Mozilla). AI-инсайты считает{' '}
        <strong>Mistral AI</strong> — мы отправляем минимум контекста (сводные стат-ки), без email и
        фото.
      </p>

      <h2>3. Зачем собираем</h2>
      <p>
        Правовая основа — <em>исполнение договора</em> между тобой и сервисом для предоставления
        функционала трекинга (GDPR ст. 6(1)(b)) и твоё <em>явное согласие</em> на опциональные
        функции (push, AI). Мы не продаём данные, никогда. Рекламы у нас нет.
      </p>

      <h2>4. Твои права</h2>
      <ul>
        <li>
          <strong>Доступ</strong>: экспортируй все тренировки в CSV из приложения.
        </li>
        <li>
          <strong>Исправление</strong>: редактируй любые сессии, сеты, замеры в любой момент.
        </li>
        <li>
          <strong>Удаление</strong>: удали отдельные записи в приложении или попроси полное удаление
          аккаунта (см. §7) — все связанные строки в workout_sessions, set_entries, sleep_logs,
          progress_photos, body_measurements, user_goals каскадно удаляются.
        </li>
        <li>
          <strong>Перенос</strong>: CSV-экспорт покрывает структурированные данные; фото можно
          скачать из галереи.
        </li>
        <li>
          <strong>Отзыв согласия</strong>: отключи push в настройках браузера; отключи AI-инсайты в
          настройках профиля.
        </li>
      </ul>

      <h2>5. Медицинский дисклеймер</h2>
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        Formly — это <strong>инструмент учёта</strong>, не врач. Расчётный 1ПМ, RPE-подсказки
        прогрессии, «тиры силы» и AI-инсайты считаются по формулам и твоим данным — это обучающая
        информация, не медицинский совет. Перед началом любой тренировочной программы посоветуйся со
        специалистом, особенно если есть травмы, беременность или проблемы с сердцем. Тренируешься
        на свой риск. Оператор не несёт ответственности за травмы или ущерб от использования
        сервиса.
      </p>

      <h2>6. Дети</h2>
      <p>
        Сервис не предназначен для пользователей младше 13 лет. Если тебе от 13 до 18 — используй
        только с разрешения родителей. Мы сознательно не собираем данные от детей до 13. Если ты
        родитель и думаешь что ребёнок зарегистрировался — напиши нам, удалим аккаунт.
      </p>

      <h2>7. Удаление аккаунта</h2>
      <p>
        Напиши на{' '}
        <a href={`mailto:${contact}`} className="underline">
          {contact}
        </a>{' '}
        с адреса, привязанного к аккаунту, тема: <em>«Удалить мой аккаунт»</em>. Удалим аккаунт и
        связанные данные в течение 14 дней. Бэкапы у хостинга ротируются за 30 дней.
      </p>

      <h2>8. Безопасность</h2>
      <p>
        Пароли хешируются Supabase индустриальными алгоритмами (bcrypt/argon2). Весь трафик HTTPS.
        Row-level security в PostgreSQL гарантирует что один пользователь не прочтёт строки другого.
        Зависимости патчим регулярно. Идеальных систем нет — нашёл уязвимость, ответственно раскрой
        её на{' '}
        <a href={`mailto:${contact}`} className="underline">
          {contact}
        </a>
        .
      </p>

      <h2>9. Изменения</h2>
      <p>
        Если эта политика существенно изменится — покажем уведомление в приложении до вступления
        изменений в силу.
      </p>

      <h2>10. Связь</h2>
      <p>
        Вопросы, запросы, жалобы — пиши на{' '}
        <a href={`mailto:${contact}`} className="underline">
          {contact}
        </a>
        .
      </p>
    </>
  )
}
