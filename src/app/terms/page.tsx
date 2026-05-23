import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'

// NOTE for the developer:
//   Starter Terms of Service template. NOT legal advice. Adjust contact info,
//   jurisdiction, and any monetization clauses (subscriptions/IAP) before
//   shipping to app stores. Apple/Google additionally require their own
//   Standard EULA acceptance — link from your store listing.

export const metadata = {
  title: 'Terms of Service — TrainingAR',
  description: 'Rules of using TrainingAR.',
}

const LAST_UPDATED = '2026-05-21'
const CONTACT = 'test3huioblya@gmail.com'
const OPERATOR = 'TrainingAR (independent developer)'
const JURISDICTION_EN = 'Russian Federation'   // ← поменяй на свою юрисдикцию если нужно
const JURISDICTION_RU = 'Российской Федерации'

export default async function TermsPage() {
  const locale = await getLocale()
  const ru = locale === 'ru'

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100">
          <ChevronLeft className="h-4 w-4" />
          {ru ? 'Назад' : 'Back'}
        </Link>

        <article className="prose prose-invert mt-6 max-w-none">
          <h1 className="text-3xl font-extrabold tracking-tight">
            {ru ? 'Правила использования' : 'Terms of Service'}
          </h1>
          <p className="text-xs uppercase tracking-widest text-white/40">
            {ru ? 'Обновлено' : 'Last updated'}: {LAST_UPDATED}
          </p>

          {ru
            ? <TermsRu contact={CONTACT} operator={OPERATOR} jurisdiction={JURISDICTION_RU} />
            : <TermsEn contact={CONTACT} operator={OPERATOR} jurisdiction={JURISDICTION_EN} />}

          <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/40">
            <Link href="/privacy" className="underline hover:text-white/70">
              {ru ? 'Политика конфиденциальности' : 'Privacy Policy'}
            </Link>
          </div>
        </article>
      </div>
    </div>
  )
}

function TermsEn({ contact, operator, jurisdiction }: { contact: string; operator: string; jurisdiction: string }) {
  return (
    <>
      <p className="text-white/70">
        By using <strong>TrainingAR</strong> (the &quot;Service&quot;) you agree to these terms.
        The Service is provided by {operator} (the &quot;Operator&quot;). If you don&apos;t agree, please don&apos;t use it.
      </p>

      <h2>1. The deal in one paragraph</h2>
      <p>
        We give you a place to log your workouts, body data, and personal records — free of charge,
        with no ads. You promise to use it for yourself only, not break it, not abuse it, and to take
        full responsibility for what you do with the suggestions and numbers we show.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old (or the minimum age of digital consent in your country, whichever is higher). If you are between 13 and 18, you confirm you have parental permission to register.
      </p>

      <h2>3. Your account</h2>
      <ul>
        <li>You are responsible for your password. Don&apos;t share your account.</li>
        <li>Provide truthful information. Don&apos;t impersonate.</li>
        <li>One human, one account. No bulk-registration.</li>
        <li>We may suspend or terminate accounts that abuse the service or violate these terms.</li>
      </ul>

      <h2>4. Health & safety — this is critical</h2>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p><strong>The Service is informational, not medical.</strong> The 1RM estimates, RPE-based progression suggestions, strength tiers, achievement badges, plate calculator output, rest-timer durations, and AI insights are <strong>guidance, not prescriptions</strong>. They are based on common formulas and your own inputs.</p>
        <p>Lifting weights carries inherent risk of injury. <strong>You assume that risk.</strong> Consult a qualified medical professional before starting any training program, especially if you have pre-existing conditions, injuries, are pregnant, or are recovering from illness.</p>
        <p>If a suggestion the app makes feels wrong for your body, <strong>ignore it</strong>. The app does not see your form, your fatigue, your sleep, your nutrition, your medication. You do.</p>
      </div>

      <h2>5. Your content</h2>
      <p>
        You own everything you log: workouts, photos, notes, measurements. You grant the Operator the minimal licence needed to store it and show it back to you. We never license it to third parties. We never train AI models on your data.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service to harass, harm, or deceive others.</li>
        <li>Upload illegal content, child sexual abuse material, malware, or content that infringes someone else&apos;s rights.</li>
        <li>Probe, scrape, reverse-engineer, or run automated load against the Service.</li>
        <li>Resell or commercially redistribute the Service.</li>
      </ul>

      <h2>7. AI features</h2>
      <p>
        Some insights are generated by a third-party large language model (Mistral). LLMs hallucinate. Treat their output as a starting point, not gospel. We do not send your raw email or photos to the LLM — only aggregated workout numbers.
      </p>

      <h2>8. Availability and changes</h2>
      <p>
        We try to keep the Service up, but it is provided <strong>&quot;as is&quot;</strong> without warranties. We may change, restrict, or discontinue features at any time. For material changes affecting your data, we&apos;ll give in-app notice.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, the Operator is not liable for any indirect, incidental, special, or consequential damages, including injury, lost progress, lost data, or revenue loss arising from use of the Service. Your sole remedy if you&apos;re unhappy with the Service is to stop using it.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time (see Privacy Policy §7). The Operator may terminate accounts violating these terms with reasonable notice (immediate for egregious abuse).
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of the {jurisdiction}, without regard to conflict-of-law principles.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions or complaints — write to <a href={`mailto:${contact}`} className="underline">{contact}</a>.
      </p>
    </>
  )
}

function TermsRu({ contact, operator, jurisdiction }: { contact: string; operator: string; jurisdiction: string }) {
  return (
    <>
      <p className="text-white/70">
        Используя <strong>TrainingAR</strong> («Сервис»), ты соглашаешься с этими правилами.
        Сервис предоставляется {operator} («Оператор»). Не согласен — не пользуйся.
      </p>

      <h2>1. Сделка в одном абзаце</h2>
      <p>
        Мы даём тебе место чтобы вести тренировки, замеры и рекорды — бесплатно, без рекламы.
        Ты обещаешь использовать его только для себя, не ломать, не злоупотреблять, и полностью отвечать
        за свои действия с подсказками и цифрами которые мы показываем.
      </p>

      <h2>2. Кто может пользоваться</h2>
      <p>
        Тебе должно быть минимум 13 лет (или возраст цифрового согласия в твоей стране, если он выше). От 13 до 18 — подтверждаешь что есть разрешение родителей.
      </p>

      <h2>3. Твой аккаунт</h2>
      <ul>
        <li>Ты отвечаешь за свой пароль. Не давай его другим.</li>
        <li>Указывай правдивые данные. Не выдавай себя за других.</li>
        <li>Один человек — один аккаунт. Никакой массовой регистрации.</li>
        <li>Мы можем приостановить или удалить аккаунты, нарушающие эти правила.</li>
      </ul>

      <h2>4. Здоровье и безопасность — это критично</h2>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p><strong>Сервис — информационный, не медицинский.</strong> Расчётный 1ПМ, RPE-подсказки прогрессии, тиры силы, ачивки, калькулятор блинов, таймер отдыха и AI-инсайты — это <strong>ориентир, не рецепт</strong>. Они основаны на общих формулах и твоих данных.</p>
        <p>Тренировки с весом имеют риск травм. <strong>Этот риск ты принимаешь на себя.</strong> Проконсультируйся со специалистом перед любой программой, особенно при хронических болезнях, травмах, беременности, восстановлении после болезни.</p>
        <p>Если подсказка кажется тебе неуместной — <strong>игнорируй её</strong>. Приложение не видит твою технику, усталость, сон, питание, лекарства. Ты видишь.</p>
      </div>

      <h2>5. Твой контент</h2>
      <p>
        Всё что ты логируешь — тренировки, фото, заметки, замеры — твоё. Ты даёшь Оператору минимальную лицензию необходимую чтобы хранить и показывать тебе обратно. Третьим лицам мы это никогда не передаём и на твоих данных AI-модели не обучаем.
      </p>

      <h2>6. Допустимое использование</h2>
      <p>Ты соглашаешься НЕ:</p>
      <ul>
        <li>Использовать Сервис чтобы преследовать, вредить, обманывать других.</li>
        <li>Загружать запрещённый контент, материалы сексуального характера с участием детей, вредоносный код, нарушать чужие права.</li>
        <li>Зондировать, скрейпить, реверсить, нагружать Сервис автоматизированными запросами.</li>
        <li>Перепродавать или коммерчески распространять Сервис.</li>
      </ul>

      <h2>7. AI-функции</h2>
      <p>
        Часть инсайтов генерирует сторонняя языковая модель (Mistral). LLM иногда галлюцинируют. Воспринимай их вывод как точку старта, не догму. Мы не отправляем модели твой email или фото — только агрегированные числа.
      </p>

      <h2>8. Доступность и изменения</h2>
      <p>
        Стараемся держать Сервис рабочим, но он предоставляется <strong>«как есть»</strong>, без гарантий. Мы можем менять, ограничивать или отключать функции в любой момент. О существенных изменениях затрагивающих твои данные — предупредим в приложении.
      </p>

      <h2>9. Ограничение ответственности</h2>
      <p>
        В максимальной степени, разрешённой законом, Оператор не несёт ответственности за косвенные, случайные, особые или последующие убытки, включая травмы, потерю прогресса, данных или дохода, возникшие из-за использования Сервиса. Единственное средство защиты если Сервис тебе не нравится — прекратить им пользоваться.
      </p>

      <h2>10. Прекращение</h2>
      <p>
        Ты можешь прекратить пользоваться Сервисом и удалить аккаунт в любой момент (см. §7 Политики конфиденциальности). Оператор может прекратить аккаунты, нарушающие эти правила, с разумным уведомлением (немедленно при серьёзных нарушениях).
      </p>

      <h2>11. Применимое право</h2>
      <p>
        Эти правила регулируются законодательством {jurisdiction}, без учёта норм коллизионного права.
      </p>

      <h2>12. Связь</h2>
      <p>
        Вопросы или жалобы — пиши на <a href={`mailto:${contact}`} className="underline">{contact}</a>.
      </p>
    </>
  )
}
