import { getLocale } from 'next-intl/server'
import { LegalDocument, type LegalSection } from '@/components/legal/LegalDocument'
import { LEGAL_CONTACT, LEGAL_LAST_UPDATED, LEGAL_OPERATOR } from '@/lib/legal'

// NOTE for the developer:
//   This policy is written against Formly's actual data flow (Supabase auth,
//   database and storage; Vercel hosting; the CheapVibeCode AI gateway; Web
//   Push). It is not
//   legal advice. Before distribution through an app store, or to users in a
//   regulated region, have it reviewed by a lawyer.
//
//   AGENTS.md § "Privacy policy and terms of service": any change that touches
//   what data is collected, where it goes, or who can see it must be reflected
//   here in the same change.

export const metadata = {
  title: 'Privacy Policy — Formly',
  description: 'How Formly handles your personal and health data.',
}

export default async function PrivacyPage() {
  const locale = await getLocale()
  const ru = locale === 'ru'

  const contact = LEGAL_CONTACT
  const operator = LEGAL_OPERATOR
  const mailto = (
    <a href={`mailto:${contact}`} className="break-all">
      {contact}
    </a>
  )

  const sections: LegalSection[] = ru ? privacyRu(mailto, operator) : privacyEn(mailto, operator)

  return (
    <LegalDocument
      eyebrow={ru ? 'Правовые документы' : 'Legal'}
      title={ru ? 'Политика конфиденциальности' : 'Privacy Policy'}
      backLabel={ru ? 'На главную' : 'Home'}
      contentsLabel={ru ? 'Содержание' : 'Contents'}
      meta={[
        { label: ru ? 'Редакция от' : 'Last updated', value: LEGAL_LAST_UPDATED },
        { label: ru ? 'Оператор' : 'Operator', value: operator },
        { label: ru ? 'Контакт' : 'Contact', value: contact },
      ]}
      intro={
        ru ? (
          <>
            <p>
              Настоящая Политика конфиденциальности определяет порядок обработки персональных данных
              и данных о состоянии здоровья пользователей сервиса Formly (далее — «Сервис»).
              Оператором обработки выступает {operator} (далее — «Оператор»).
            </p>
            <p>
              Используя Сервис, пользователь подтверждает, что ознакомлен с настоящей Политикой.
              Термины, не определённые в тексте, применяются в значении, установленном применимым
              законодательством о защите персональных данных.
            </p>
          </>
        ) : (
          <>
            <p>
              This Privacy Policy sets out how personal data and health-related data of users of the
              Formly service (the &quot;Service&quot;) are processed. Processing is carried out by{' '}
              {operator} (the &quot;Operator&quot;).
            </p>
            <p>
              By using the Service the user confirms that they have read this Policy. Terms not
              defined here carry the meaning given to them by applicable data protection law.
            </p>
          </>
        )
      }
      sections={sections}
      sibling={{
        href: '/terms',
        label: ru ? 'Пользовательское соглашение →' : 'Terms of Service →',
      }}
    />
  )
}

function privacyRu(mailto: React.ReactNode, operator: string): LegalSection[] {
  return [
    {
      id: 'data',
      title: 'Категории обрабатываемых данных',
      body: (
        <>
          <p>Оператор обрабатывает следующие категории данных:</p>
          <ul>
            <li>
              <strong>Учётные данные</strong> — адрес электронной почты и хеш пароля. Пароль в
              открытом виде Оператору недоступен.
            </li>
            <li>
              <strong>Данные профиля</strong> — отображаемое имя, масса тела, рост, возраст, дата
              начала тренировок, расписание, место тренировок, часовой пояс, язык интерфейса.
            </li>
            <li>
              <strong>Тренировочные данные</strong> — сессии, подходы (вес, повторения, RPE, признак
              разминочного подхода), упражнения, шаблоны, программы, заметки к тренировке и к
              отдельным упражнениям, оценка самочувствия.
            </li>
            <li>
              <strong>Данные о теле</strong> — вносимые пользователем по собственному усмотрению
              масса и рост, обхваты, а также загружаемые фотографии прогресса.
            </li>
            <li>
              <strong>Данные кардио-тренировок</strong> — продолжительность, дистанция, пульс и
              расход энергии, если они внесены пользователем.
            </li>
            <li>
              <strong>Социальные данные</strong> — код друга, список друзей и заявок, реакции и
              комментарии к событиям ленты активности, личные сообщения между друзьями, факт
              блокировки пользователя.
            </li>
            <li>
              <strong>Данные подписки на уведомления</strong> — непрозрачный адрес (endpoint),
              выдаваемый браузером при включении push-уведомлений, и связанные с ним ключи. Номер
              телефона и идентификаторы устройства не обрабатываются.
            </li>
            <li>
              <strong>Технические журналы</strong> — IP-адрес и user-agent запроса, сохраняемые
              хостинг-провайдером в целях безопасности и противодействия злоупотреблениям, а также
              отчёты об ошибках интерфейса с удалёнными параметрами запроса и замаскированными
              токенами.
            </li>
          </ul>
          <p>
            Оператор <strong>не обрабатывает</strong>: данные геолокации, списки контактов,
            календарь, записи микрофона и камеры (за исключением фотографий, загружаемых
            пользователем самостоятельно), историю просмотров и рекламные идентификаторы.
          </p>
        </>
      ),
    },
    {
      id: 'purposes',
      title: 'Цели и правовые основания обработки',
      body: (
        <>
          <div className="legal-scroll">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Цель</th>
                  <th>Основание</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Предоставление функций учёта тренировок и анализа прогресса</td>
                  <td>Исполнение договора (ст. 6(1)(b) GDPR)</td>
                </tr>
                <tr>
                  <td>Обеспечение безопасности, предотвращение злоупотреблений</td>
                  <td>Законный интерес (ст. 6(1)(f) GDPR)</td>
                </tr>
                <tr>
                  <td>Push-уведомления, AI-рекомендации, публикация активности друзьям</td>
                  <td>Согласие пользователя (ст. 6(1)(a) GDPR)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Данные о состоянии здоровья относятся к специальной категории и обрабатываются
            исключительно на основании явного согласия пользователя, выраженного внесением таких
            данных в Сервис (ст. 9(2)(a) GDPR).
          </p>
          <p>
            Оператор не осуществляет продажу персональных данных, не передаёт их рекламным сетям и
            не размещает рекламу в Сервисе.
          </p>
        </>
      ),
    },
    {
      id: 'processors',
      title: 'Место хранения и привлекаемые обработчики',
      body: (
        <>
          <ul>
            <li>
              <strong>Supabase</strong> (PostgreSQL и объектное хранилище, регион ЕС) — учётные,
              тренировочные, телесные и социальные данные. Разграничение доступа обеспечивается
              механизмом row-level security на уровне базы данных.
            </li>
            <li>
              <strong>Vercel</strong> — размещение веб-приложения и технические журналы запросов.
            </li>
            <li>
              <strong>CheapVibeCode</strong> (шлюз к языковой модели Grok 4.5, разработанной xAI) —
              формирование разборов тренировок, рекомендаций, программ, названий тренировок, ответов
              тренера, подсказок поиска и текстов уведомлений. Передаётся минимально необходимый
              обезличенный контекст: сводные показатели тренировок и, при использовании чата,
              заданный пользователем вопрос. Адрес электронной почты, фотографии и личные сообщения
              не передаются.
            </li>
            <li>
              <strong>Push-сервисы браузеров</strong> (Apple, Google, Mozilla, Microsoft) — доставка
              уведомлений по протоколу Web Push с использованием VAPID.
            </li>
          </ul>
          <p>
            Фотографии прогресса размещаются в закрытом бакете и выдаются по ссылкам с ограниченным
            сроком действия. Доступ к ним имеет только владелец учётной записи.
          </p>
        </>
      ),
    },
    {
      id: 'sharing',
      title: 'Данные, доступные другим пользователям',
      body: (
        <>
          <p>
            Часть данных становится видимой другим лицам исключительно по инициативе пользователя:
          </p>
          <ul>
            <li>
              <strong>Друзья</strong> видят отображаемое имя, факт и время завершения тренировок,
              недельный тоннаж, рекорды, серии тренировок и признак текущего нахождения на
              тренировке. Публикация отключается переключателем «Делиться активностью» в профиле.
            </li>
            <li>
              <strong>Личные сообщения</strong> доступны отправителю и получателю. Блокировка
              пользователя прекращает переписку в обе стороны.
            </li>
            <li>
              <strong>Ссылка на тренировку</strong>, созданная пользователем, открывает снимок
              карточки тренировки любому, кто располагает ссылкой, без авторизации. Ссылка содержит
              случайный токен и может быть отозвана владельцем в любой момент; отзыв прекращает
              доступ, но не отменяет ранее сделанные получателем копии.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'retention',
      title: 'Сроки хранения',
      body: (
        <ul>
          <li>Данные учётной записи и тренировок хранятся до удаления учётной записи.</li>
          <li>Технические журналы хостинг-провайдера хранятся около 30 дней.</li>
          <li>
            Резервные копии баз данных ротируются в течение 30 дней после удаления исходных записей.
          </li>
          <li>
            Записи офлайн-очереди, не поддающиеся синхронизации, перемещаются в служебное хранилище
            и удаляются вместе с учётной записью.
          </li>
        </ul>
      ),
    },
    {
      id: 'rights',
      title: 'Права пользователя',
      body: (
        <>
          <ul>
            <li>
              <strong>Доступ и переносимость</strong> — выгрузка тренировочных данных в формате CSV
              из раздела «Профиль»; фотографии загружаются из галереи.
            </li>
            <li>
              <strong>Уточнение и исправление</strong> — редактирование любых записей, подходов и
              измерений в интерфейсе Сервиса.
            </li>
            <li>
              <strong>Удаление</strong> — удаление отдельных записей в интерфейсе либо полное
              удаление учётной записи в порядке раздела 7.
            </li>
            <li>
              <strong>Отзыв согласия</strong> — отключение push-уведомлений в настройках браузера,
              отключение публикации активности в профиле. Отзыв согласия не влияет на законность
              обработки, осуществлённой до его получения.
            </li>
            <li>
              <strong>Обжалование</strong> — обращение в надзорный орган по месту жительства, если
              пользователь считает, что обработка нарушает его права.
            </li>
          </ul>
          <p>
            Запросы направляются на {mailto} с адреса, привязанного к учётной записи. Ответ
            предоставляется в срок не более 30 календарных дней.
          </p>
        </>
      ),
    },
    {
      id: 'deletion',
      title: 'Удаление учётной записи',
      body: (
        <p>
          Для полного удаления учётной записи следует направить письмо на {mailto} с адреса,
          привязанного к записи, указав в теме «Удалить мой аккаунт». Учётная запись и все связанные
          записи — тренировки, подходы, измерения, фотографии, заметки, сообщения и социальные связи
          — удаляются каскадно в срок до 14 календарных дней. Резервные копии перестают содержать
          данные в течение последующих 30 дней.
        </p>
      ),
    },
    {
      id: 'security',
      title: 'Меры безопасности',
      body: (
        <>
          <ul>
            <li>Пароли хранятся в виде хешей, вычисляемых средствами Supabase Auth.</li>
            <li>Весь трафик передаётся по протоколу HTTPS.</li>
            <li>
              Разграничение доступа к строкам реализовано в PostgreSQL: чтение и запись данных
              другого пользователя невозможны на уровне базы данных, а не только на уровне
              приложения.
            </li>
            <li>
              Привилегированные процедуры базы данных исполняются от имени служебной роли и
              недоступны анонимным клиентам.
            </li>
            <li>Зависимости приложения проходят регулярный аудит уязвимостей.</li>
          </ul>
          <p>
            Сообщения о выявленных уязвимостях просьба направлять на {mailto} в порядке
            ответственного раскрытия. Оператор не преследует исследователей, действующих
            добросовестно.
          </p>
        </>
      ),
    },
    {
      id: 'health',
      title: 'Оговорка о медицинских данных',
      body: (
        <div className="legal-callout">
          <p>
            Сервис является <strong>средством учёта</strong> и не оказывает медицинских услуг.
            Расчётный одноповторный максимум, рекомендации по прогрессии, категории силовых
            нормативов и материалы, формируемые системой искусственного интеллекта, носят
            информационный характер и не являются медицинским заключением или назначением. Перед
            началом тренировочной программы, в особенности при наличии травм, беременности или
            сердечно-сосудистых заболеваний, необходима консультация квалифицированного специалиста.
          </p>
        </div>
      ),
    },
    {
      id: 'minors',
      title: 'Несовершеннолетние пользователи',
      body: (
        <p>
          Сервис не предназначен для лиц младше 13 лет; данные таких лиц Оператором сознательно не
          обрабатываются. Лица в возрасте от 13 до 18 лет вправе использовать Сервис с согласия
          родителей или иных законных представителей. При получении сведений о регистрации лица
          младше 13 лет соответствующая учётная запись удаляется. Обращения принимаются по адресу{' '}
          {mailto}.
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'Изменение Политики',
      body: (
        <p>
          Оператор вправе вносить изменения в настоящую Политику. При существенных изменениях
          уведомление размещается в интерфейсе Сервиса до вступления изменений в силу. Дата
          последней редакции указана в начале документа.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Контактные данные',
      body: (
        <p>
          Вопросы, запросы на реализацию прав и жалобы направляются Оператору ({operator}) по адресу
          электронной почты {mailto}.
        </p>
      ),
    },
  ]
}

function privacyEn(mailto: React.ReactNode, operator: string): LegalSection[] {
  return [
    {
      id: 'data',
      title: 'Categories of data processed',
      body: (
        <>
          <p>The Operator processes the following categories of data:</p>
          <ul>
            <li>
              <strong>Account data</strong> — email address and a password hash. The Operator has no
              access to the password itself.
            </li>
            <li>
              <strong>Profile data</strong> — display name, body weight, height, age, training start
              date, weekly schedule, training location, time zone and interface language.
            </li>
            <li>
              <strong>Training data</strong> — sessions, sets (weight, repetitions, RPE, warm-up
              flag), exercises, templates, programs, session and per-exercise notes, and mood
              ratings.
            </li>
            <li>
              <strong>Body data</strong> — weight, height and circumference measurements entered at
              the user&apos;s discretion, together with progress photographs the user uploads.
            </li>
            <li>
              <strong>Cardio data</strong> — duration, distance, heart rate and energy expenditure
              where entered by the user.
            </li>
            <li>
              <strong>Social data</strong> — friend code, friends and pending requests, reactions
              and comments on activity events, direct messages between friends, and blocking
              records.
            </li>
            <li>
              <strong>Notification subscription data</strong> — the opaque endpoint issued by the
              browser when push notifications are enabled, and its associated keys. No telephone
              number and no device identifier is processed.
            </li>
            <li>
              <strong>Technical logs</strong> — request IP address and user agent retained by the
              hosting provider for security and abuse prevention, and interface error reports from
              which query strings are removed and token-like values redacted.
            </li>
          </ul>
          <p>
            The Operator does <strong>not</strong> process location data, contact lists, calendars,
            microphone or camera input (other than photographs the user uploads deliberately),
            browsing history or advertising identifiers.
          </p>
        </>
      ),
    },
    {
      id: 'purposes',
      title: 'Purposes and legal bases',
      body: (
        <>
          <div className="legal-scroll">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Purpose</th>
                  <th>Legal basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Providing workout logging and progress analysis</td>
                  <td>Performance of a contract (GDPR Art. 6(1)(b))</td>
                </tr>
                <tr>
                  <td>Security and abuse prevention</td>
                  <td>Legitimate interest (GDPR Art. 6(1)(f))</td>
                </tr>
                <tr>
                  <td>Push notifications, AI features, sharing activity with friends</td>
                  <td>Consent (GDPR Art. 6(1)(a))</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Health-related data is a special category and is processed solely on the basis of the
            user&apos;s explicit consent, given by entering that data into the Service (GDPR Art.
            9(2)(a)).
          </p>
          <p>
            The Operator does not sell personal data, does not disclose it to advertising networks
            and does not display advertising in the Service.
          </p>
        </>
      ),
    },
    {
      id: 'processors',
      title: 'Storage location and processors engaged',
      body: (
        <>
          <ul>
            <li>
              <strong>Supabase</strong> (PostgreSQL and object storage, EU region) — account,
              training, body and social data. Access is segregated by row-level security in the
              database itself.
            </li>
            <li>
              <strong>Vercel</strong> — application hosting and request logs.
            </li>
            <li>
              <strong>CheapVibeCode</strong> (a gateway to the Grok 4.5 language model developed by
              xAI) — generation of session debriefs, recommendations, programs, session titles,
              coach replies, search suggestions and notification copy. Only the minimum
              pseudonymised context is transmitted: aggregate training figures and, for the chat,
              the question the user asked. Email addresses, photographs and direct messages are
              never transmitted.
            </li>
            <li>
              <strong>Browser push services</strong> (Apple, Google, Mozilla, Microsoft) — delivery
              of notifications over Web Push using VAPID.
            </li>
          </ul>
          <p>
            Progress photographs are held in a private bucket and served through URLs that expire.
            Only the account owner can read them.
          </p>
        </>
      ),
    },
    {
      id: 'sharing',
      title: 'Data visible to other users',
      body: (
        <>
          <p>Certain data becomes visible to others only on the user&apos;s own initiative:</p>
          <ul>
            <li>
              <strong>Friends</strong> see the display name, the fact and time of finished workouts,
              weekly tonnage, records, training streaks and whether the athlete is currently
              training. Publication is switched off with the &quot;Share activity&quot; toggle in
              the profile.
            </li>
            <li>
              <strong>Direct messages</strong> are available to sender and recipient. Blocking a
              user terminates the conversation in both directions.
            </li>
            <li>
              <strong>A workout link</strong> created by the user opens a snapshot of the workout
              card to anyone holding the link, without authentication. The link carries a random
              token and may be revoked by its owner at any time; revocation ends access but cannot
              retract copies a recipient has already made.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'retention',
      title: 'Retention periods',
      body: (
        <ul>
          <li>Account and training data is retained until the account is deleted.</li>
          <li>Hosting provider technical logs are retained for approximately 30 days.</li>
          <li>Database backups rotate within 30 days of the source records being deleted.</li>
          <li>
            Offline queue records that cannot be synchronised are moved to a dead-letter store and
            removed with the account.
          </li>
        </ul>
      ),
    },
    {
      id: 'rights',
      title: 'User rights',
      body: (
        <>
          <ul>
            <li>
              <strong>Access and portability</strong> — export of training data as CSV from the
              Profile screen; photographs can be downloaded from the gallery.
            </li>
            <li>
              <strong>Rectification</strong> — any session, set or measurement can be edited in the
              Service.
            </li>
            <li>
              <strong>Erasure</strong> — individual records can be deleted in the Service, or the
              whole account under section 7.
            </li>
            <li>
              <strong>Withdrawal of consent</strong> — push notifications can be disabled in browser
              settings and activity sharing in the profile. Withdrawal does not affect the
              lawfulness of processing carried out beforehand.
            </li>
            <li>
              <strong>Complaint</strong> — a complaint may be lodged with the supervisory authority
              of the user&apos;s place of residence.
            </li>
          </ul>
          <p>
            Requests should be sent to {mailto} from the address linked to the account. A response
            is provided within 30 calendar days.
          </p>
        </>
      ),
    },
    {
      id: 'deletion',
      title: 'Account deletion',
      body: (
        <p>
          To delete an account, write to {mailto} from the address linked to it with the subject
          &quot;Delete my account&quot;. The account and all linked records — sessions, sets,
          measurements, photographs, notes, messages and social connections — are deleted by cascade
          within 14 calendar days. Backups cease to contain the data within a further 30 days.
        </p>
      ),
    },
    {
      id: 'security',
      title: 'Security measures',
      body: (
        <>
          <ul>
            <li>Passwords are stored as hashes computed by Supabase Auth.</li>
            <li>All traffic is carried over HTTPS.</li>
            <li>
              Row-level security in PostgreSQL makes reading or writing another user&apos;s rows
              impossible at the database layer, not only in the application.
            </li>
            <li>
              Privileged database procedures run under a service role and are unavailable to
              anonymous clients.
            </li>
            <li>Application dependencies are audited for known vulnerabilities on a schedule.</li>
          </ul>
          <p>
            Vulnerability reports are welcome at {mailto} under responsible disclosure. The Operator
            will not pursue researchers acting in good faith.
          </p>
        </>
      ),
    },
    {
      id: 'health',
      title: 'Health and medical notice',
      body: (
        <div className="legal-callout">
          <p>
            The Service is a <strong>logging tool</strong> and does not provide medical services.
            Estimated one-repetition maxima, progression suggestions, strength-standard categories
            and material generated by the artificial intelligence features are informational and do
            not constitute a medical opinion or prescription. Consult a qualified professional
            before beginning a training program, particularly in the presence of injury, pregnancy
            or cardiovascular conditions.
          </p>
        </div>
      ),
    },
    {
      id: 'minors',
      title: 'Minors',
      body: (
        <p>
          The Service is not directed at persons under 13 and their data is not knowingly processed.
          Persons aged 13 to 18 may use the Service with the consent of a parent or legal guardian.
          On learning that a person under 13 has registered, the Operator deletes the account.
          Notifications may be sent to {mailto}.
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'Amendments',
      body: (
        <p>
          The Operator may amend this Policy. Material amendments are announced in the interface of
          the Service before they take effect. The date of the current revision is shown at the head
          of this document.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      body: (
        <p>
          Questions, requests to exercise rights and complaints should be addressed to the Operator
          ({operator}) at {mailto}.
        </p>
      ),
    },
  ]
}
