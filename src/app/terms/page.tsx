import { getLocale } from 'next-intl/server'
import { LegalDocument, type LegalSection } from '@/components/legal/LegalDocument'
import { LEGAL_CONTACT, LEGAL_LAST_UPDATED, LEGAL_OPERATOR } from '@/lib/legal'

// NOTE for the developer:
//   Terms of service written against what Formly actually does. Not legal
//   advice. Distribution through an app store additionally requires acceptance
//   of the platform's own EULA — link it from the store listing. Any
//   monetisation added later needs a payment, refund and renewal section here.
//
//   AGENTS.md § "Privacy policy and terms of service": a change to what a user
//   may do with the Service, or to what the Operator answers for, belongs in
//   this document in the same change.

export const metadata = {
  title: 'Terms of Service — Formly',
  description: 'The terms on which Formly is provided.',
}

const JURISDICTION_EN = 'Russian Federation'
const JURISDICTION_RU = 'Российской Федерации'

export default async function TermsPage() {
  const locale = await getLocale()
  const ru = locale === 'ru'

  const contact = LEGAL_CONTACT
  const operator = LEGAL_OPERATOR
  const mailto = (
    <a href={`mailto:${contact}`} className="break-all">
      {contact}
    </a>
  )

  const sections = ru
    ? termsRu(mailto, operator, JURISDICTION_RU)
    : termsEn(mailto, operator, JURISDICTION_EN)

  return (
    <LegalDocument
      eyebrow={ru ? 'Правовые документы' : 'Legal'}
      title={ru ? 'Пользовательское соглашение' : 'Terms of Service'}
      backLabel={ru ? 'На главную' : 'Home'}
      contentsLabel={ru ? 'Содержание' : 'Contents'}
      meta={[
        { label: ru ? 'Редакция от' : 'Last updated', value: LEGAL_LAST_UPDATED },
        { label: ru ? 'Оператор' : 'Operator', value: operator },
        { label: ru ? 'Применимое право' : 'Governing law', value: ru ? 'Россия' : 'Russia' },
      ]}
      intro={
        ru ? (
          <>
            <p>
              Настоящее Соглашение регулирует использование сервиса Formly (далее — «Сервис»),
              предоставляемого {operator} (далее — «Оператор»). Соглашение является публичной
              офертой.
            </p>
            <p>
              Регистрация в Сервисе или его использование означает полное и безоговорочное принятие
              условий настоящего Соглашения. Лицо, не согласное с его условиями, обязано прекратить
              использование Сервиса.
            </p>
          </>
        ) : (
          <>
            <p>
              These Terms govern use of the Formly service (the &quot;Service&quot;) provided by{' '}
              {operator} (the &quot;Operator&quot;).
            </p>
            <p>
              Registering for or using the Service constitutes full acceptance of these Terms. A
              person who does not accept them must stop using the Service.
            </p>
          </>
        )
      }
      sections={sections}
      sibling={{
        href: '/privacy',
        label: ru ? 'Политика конфиденциальности →' : 'Privacy Policy →',
      }}
    />
  )
}

function termsRu(mailto: React.ReactNode, operator: string, jurisdiction: string): LegalSection[] {
  return [
    {
      id: 'subject',
      title: 'Предмет Соглашения',
      body: (
        <>
          <p>
            Оператор предоставляет пользователю право безвозмездного использования Сервиса в личных
            некоммерческих целях: ведения журнала тренировок, учёта показателей тела, анализа
            прогресса и получения формируемых автоматически рекомендаций.
          </p>
          <p>
            Сервис предоставляется без взимания платы и без размещения рекламы. Оператор не
            принимает на себя обязательств по достижению пользователем каких-либо тренировочных
            результатов.
          </p>
        </>
      ),
    },
    {
      id: 'eligibility',
      title: 'Требования к пользователю',
      body: (
        <p>
          Пользователем может быть лицо, достигшее 13 лет либо возраста цифрового согласия,
          установленного законодательством страны его проживания, если он выше. Лицо в возрасте от
          13 до 18 лет подтверждает наличие согласия родителей или иных законных представителей на
          регистрацию и использование Сервиса.
        </p>
      ),
    },
    {
      id: 'account',
      title: 'Учётная запись',
      body: (
        <ul>
          <li>
            Пользователь самостоятельно обеспечивает сохранность пароля и несёт ответственность за
            все действия, совершённые с использованием его учётной записи.
          </li>
          <li>
            Пользователь обязуется предоставлять достоверные сведения и не выдавать себя за иное
            лицо.
          </li>
          <li>
            Допускается создание одной учётной записи на одно физическое лицо. Массовая регистрация
            запрещена.
          </li>
          <li>
            Оператор вправе приостановить или прекратить доступ к учётной записи при нарушении
            настоящего Соглашения.
          </li>
        </ul>
      ),
    },
    {
      id: 'health',
      title: 'Здоровье и безопасность',
      body: (
        <div className="legal-callout">
          <p>
            <strong>Сервис носит информационный характер и не является медицинским.</strong>{' '}
            Расчётный одноповторный максимум, рекомендации по прогрессии, силовые нормативы,
            результаты калькулятора блинов, интервалы отдыха и материалы, формируемые системой
            искусственного интеллекта, представляют собой ориентиры, а не назначения, и вычисляются
            по общедоступным формулам на основании данных, внесённых пользователем.
          </p>
          <p>
            Занятия с отягощениями сопряжены с риском травмы. Пользователь принимает этот риск на
            себя. Перед началом тренировочной программы необходима консультация квалифицированного
            специалиста, в особенности при наличии заболеваний, травм, беременности или в период
            восстановления после болезни.
          </p>
          <p>
            Сервис не располагает сведениями о технике выполнения упражнений, утомлении, качестве
            сна, питании и принимаемых препаратах. Рекомендация, противоречащая самочувствию
            пользователя, подлежит игнорированию.
          </p>
        </div>
      ),
    },
    {
      id: 'content',
      title: 'Содержимое пользователя',
      body: (
        <p>
          Все данные, вносимые пользователем — тренировки, фотографии, заметки, измерения, —
          остаются его собственностью. Пользователь предоставляет Оператору неисключительную
          безвозмездную лицензию в объёме, минимально необходимом для хранения таких данных и
          отображения их пользователю и тем лицам, которым он сам открыл доступ. Оператор не
          передаёт эти данные третьим лицам для их собственных целей и не использует их для обучения
          моделей искусственного интеллекта.
        </p>
      ),
    },
    {
      id: 'conduct',
      title: 'Допустимое использование',
      body: (
        <>
          <p>Пользователю запрещается:</p>
          <ul>
            <li>
              использовать Сервис для преследования, причинения вреда или введения в заблуждение
              других лиц, в том числе через ленту активности, комментарии и личные сообщения;
            </li>
            <li>
              размещать противоправные материалы, материалы, содержащие сцены сексуального насилия
              над детьми, вредоносное программное обеспечение, а также материалы, нарушающие права
              третьих лиц;
            </li>
            <li>
              осуществлять сканирование, автоматизированный сбор данных, обратную разработку и
              нагрузочное тестирование Сервиса без письменного разрешения Оператора;
            </li>
            <li>перепродавать Сервис или использовать его в коммерческих целях.</li>
          </ul>
          <p>
            Сообщения о нарушениях со стороны других пользователей направляются на {mailto}. В
            Сервисе доступна функция блокировки, прекращающая взаимодействие с выбранным
            пользователем в обе стороны.
          </p>
        </>
      ),
    },
    {
      id: 'social',
      title: 'Социальные функции и публикация данных',
      body: (
        <>
          <ul>
            <li>
              Добавление друга по коду делает видимыми ему сведения о завершённых тренировках,
              недельном объёме, рекордах и сериях. Публикация отключается переключателем «Делиться
              активностью» в профиле.
            </li>
            <li>
              Ссылка на тренировку, созданная пользователем, открывает снимок карточки тренировки
              любому лицу, располагающему ссылкой, без авторизации. Ответственность за
              распространение ссылки несёт создавший её пользователь; ссылка может быть отозвана в
              любой момент.
            </li>
            <li>
              Оператор не модерирует переписку между пользователями в постоянном режиме и
              рассматривает обращения по мере поступления.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'ai',
      title: 'Функции искусственного интеллекта',
      body: (
        <p>
          Отдельные материалы Сервиса — разборы тренировок, рекомендации, программы, названия
          тренировок и ответы тренера — формируются сторонней большой языковой моделью (Mistral AI).
          Такие модели допускают фактические ошибки, в связи с чем полученные материалы следует
          рассматривать как предположение, подлежащее самостоятельной проверке. Модели передаются
          только обезличенные сводные показатели тренировок; адрес электронной почты, фотографии и
          личные сообщения не передаются. Количество обращений к функциям искусственного интеллекта
          ограничено суточной квотой.
        </p>
      ),
    },
    {
      id: 'availability',
      title: 'Доступность Сервиса и его изменение',
      body: (
        <p>
          Сервис предоставляется на условиях «как есть» (as is) без гарантий бесперебойной работы,
          отсутствия ошибок и пригодности для конкретных целей. Оператор вправе изменять,
          ограничивать или прекращать отдельные функции. При существенных изменениях, затрагивающих
          данные пользователя, уведомление размещается в интерфейсе Сервиса. Пользователю
          рекомендуется сохранять резервную копию данных средствами выгрузки в формате CSV.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'Ограничение ответственности',
      body: (
        <p>
          В максимальной степени, допускаемой применимым правом, Оператор не несёт ответственности
          за косвенные, случайные, специальные или последующие убытки, включая вред здоровью, утрату
          прогресса, утрату данных и упущенную выгоду, возникшие в связи с использованием Сервиса.
          Единственным средством правовой защиты пользователя, не удовлетворённого Сервисом,
          является прекращение его использования. Настоящий раздел не ограничивает ответственность,
          которая не может быть ограничена по закону.
        </p>
      ),
    },
    {
      id: 'termination',
      title: 'Прекращение использования',
      body: (
        <p>
          Пользователь вправе в любой момент прекратить использование Сервиса и удалить учётную
          запись в порядке, установленном разделом 7 Политики конфиденциальности. Оператор вправе
          прекратить доступ при нарушении настоящего Соглашения с предварительным уведомлением, а
          при грубых нарушениях — незамедлительно.
        </p>
      ),
    },
    {
      id: 'law',
      title: 'Применимое право и изменение Соглашения',
      body: (
        <p>
          К настоящему Соглашению применяется право {jurisdiction} без учёта коллизионных норм.
          Оператор вправе вносить в Соглашение изменения; при существенных изменениях уведомление
          размещается в интерфейсе Сервиса до вступления их в силу. Продолжение использования
          Сервиса после вступления изменений в силу означает согласие с ними. Дата редакции указана
          в начале документа.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Контактные данные',
      body: (
        <p>
          Вопросы и обращения по настоящему Соглашению направляются Оператору ({operator}) по адресу
          электронной почты {mailto}.
        </p>
      ),
    },
  ]
}

function termsEn(mailto: React.ReactNode, operator: string, jurisdiction: string): LegalSection[] {
  return [
    {
      id: 'subject',
      title: 'Subject of these Terms',
      body: (
        <>
          <p>
            The Operator grants the user a right to use the Service free of charge for personal,
            non-commercial purposes: keeping a training log, recording body metrics, analysing
            progress and receiving automatically generated recommendations.
          </p>
          <p>
            The Service carries no charge and no advertising. The Operator gives no undertaking that
            any particular training result will be achieved.
          </p>
        </>
      ),
    },
    {
      id: 'eligibility',
      title: 'Eligibility',
      body: (
        <p>
          A user must be at least 13 years old, or the age of digital consent in their country of
          residence if that is higher. A user aged between 13 and 18 confirms that a parent or legal
          guardian has consented to their registration and use of the Service.
        </p>
      ),
    },
    {
      id: 'account',
      title: 'Accounts',
      body: (
        <ul>
          <li>
            The user is responsible for keeping their password secure and for all activity carried
            out through their account.
          </li>
          <li>
            The user undertakes to provide truthful information and not to impersonate anyone.
          </li>
          <li>One account per person. Bulk registration is prohibited.</li>
          <li>The Operator may suspend or terminate an account that breaches these Terms.</li>
        </ul>
      ),
    },
    {
      id: 'health',
      title: 'Health and safety',
      body: (
        <div className="legal-callout">
          <p>
            <strong>The Service is informational and is not medical.</strong> Estimated
            one-repetition maxima, progression suggestions, strength standards, plate calculator
            output, rest intervals and material generated by the artificial intelligence features
            are guidance, not prescriptions; they are computed from published formulas and the
            user&apos;s own entries.
          </p>
          <p>
            Resistance training carries an inherent risk of injury, which the user assumes. Consult
            a qualified professional before beginning a training program, particularly in the
            presence of a medical condition, injury or pregnancy, or while recovering from illness.
          </p>
          <p>
            The Service has no knowledge of the user&apos;s technique, fatigue, sleep, nutrition or
            medication. A suggestion that conflicts with how the user feels should be disregarded.
          </p>
        </div>
      ),
    },
    {
      id: 'content',
      title: 'User content',
      body: (
        <p>
          Everything the user records — workouts, photographs, notes, measurements — remains theirs.
          The user grants the Operator a non-exclusive, royalty-free licence limited to what is
          needed to store that content and display it back to the user and to anyone the user has
          granted access. The Operator does not license this content to third parties for their own
          purposes and does not use it to train artificial intelligence models.
        </p>
      ),
    },
    {
      id: 'conduct',
      title: 'Acceptable use',
      body: (
        <>
          <p>The user must not:</p>
          <ul>
            <li>
              use the Service to harass, harm or deceive others, including through the activity
              feed, comments and direct messages;
            </li>
            <li>
              upload unlawful content, child sexual abuse material, malware, or content that
              infringes the rights of others;
            </li>
            <li>
              probe, scrape, reverse-engineer or run automated load against the Service without the
              Operator&apos;s written permission;
            </li>
            <li>resell the Service or use it for commercial purposes.</li>
          </ul>
          <p>
            Reports of abuse by other users may be sent to {mailto}. The Service also provides a
            block function, which ends interaction with the chosen user in both directions.
          </p>
        </>
      ),
    },
    {
      id: 'social',
      title: 'Social features and publication',
      body: (
        <ul>
          <li>
            Adding a friend by code makes finished workouts, weekly volume, records and streaks
            visible to that friend. Publication is switched off with the &quot;Share activity&quot;
            toggle in the profile.
          </li>
          <li>
            A workout link created by the user opens a snapshot of the workout card to anyone
            holding the link, without authentication. Responsibility for distributing the link rests
            with the user who created it; the link may be revoked at any time.
          </li>
          <li>
            The Operator does not continuously moderate conversations between users and acts on
            reports as they are received.
          </li>
        </ul>
      ),
    },
    {
      id: 'ai',
      title: 'Artificial intelligence features',
      body: (
        <p>
          Certain material — session debriefs, recommendations, programs, session titles and coach
          replies — is generated by a third-party large language model (Mistral AI). Such models
          produce factual errors, so their output should be treated as a suggestion to be verified
          rather than as fact. Only pseudonymised aggregate training figures are transmitted; email
          addresses, photographs and direct messages are not. Use of the artificial intelligence
          features is subject to a daily quota.
        </p>
      ),
    },
    {
      id: 'availability',
      title: 'Availability and changes',
      body: (
        <p>
          The Service is provided <strong>&quot;as is&quot;</strong>, without warranty of
          uninterrupted operation, freedom from defects or fitness for a particular purpose. The
          Operator may change, restrict or discontinue features. Material changes affecting user
          data are announced in the interface of the Service. Users are advised to keep their own
          copy of their data through the CSV export.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'Limitation of liability',
      body: (
        <p>
          To the maximum extent permitted by applicable law, the Operator is not liable for
          indirect, incidental, special or consequential damages, including personal injury, lost
          progress, lost data or lost revenue arising from use of the Service. The user&apos;s sole
          remedy if dissatisfied with the Service is to stop using it. Nothing in this section
          limits liability that cannot be limited by law.
        </p>
      ),
    },
    {
      id: 'termination',
      title: 'Termination',
      body: (
        <p>
          The user may stop using the Service and delete their account at any time, as described in
          section 7 of the Privacy Policy. The Operator may terminate access for breach of these
          Terms on reasonable notice, and immediately in cases of serious abuse.
        </p>
      ),
    },
    {
      id: 'law',
      title: 'Governing law and amendments',
      body: (
        <p>
          These Terms are governed by the laws of the {jurisdiction}, without regard to
          conflict-of-law principles. The Operator may amend these Terms; material amendments are
          announced in the interface of the Service before they take effect, and continued use after
          that point constitutes acceptance. The date of the current revision is shown at the head
          of this document.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      body: (
        <p>
          Questions about these Terms should be addressed to the Operator ({operator}) at {mailto}.
        </p>
      ),
    },
  ]
}
