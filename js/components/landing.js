/**
 * ============================================================================
 * GESTERESIS — Landing Page Component (js/components/landing.js)
 * ============================================================================
 * Стартовая страница сайта (#/). Продающий лендинг для владельцев
 * производств. Отвечает за:
 *  - Hero-секцию с бизнес-KPI и CTA
 *  - Блок «Цена отсутствия контроля» (боль владельца)
 *  - Интерактивный ROI-калькулятор экономической выгоды
 *  - Какие узлы и поломки ловит система
 *  - Внедрение без остановки производства
 *  - Сравнение с конкурентами (таблица)
 *  - Живые превью интерфейса (диаграммы)
 *  - Научный задел и надёжность компании
 *  - Тарифы с юнит-экономикой
 *  - FAQ
 *  - Финальный CTA
 *
 * Контент хранится в LANDING_CONTENT — легко менять тексты без правок
 * разметки.
 *
 * Зависимости:
 *  - js/utils/html.js -> Html.escape, Html.formatDate
 *
 * Подключается ДО app.js (после profile.js).
 * Доступ через window.Landing.
 * ============================================================================
 */

const LANDING_CONTENT = {
  hero: {
    badge1: 'Предиктивный контроль ЧПУ и станков • Для цехов 5–100 ед.',
    badge2: 'Окупаемость с 1 предотвращённой аварии',
    title: 'Остановите внезапные поломки станков&nbsp;— пока не&nbsp;заклинило шпиндель и&nbsp;не&nbsp;встал&nbsp;цех',
    subtitle: 'Gesteresis предупреждает об&nbsp;износе подшипников, дисбалансе патрона и&nbsp;сколе фрезы за&nbsp;дни до&nbsp;аварии. Датчик на&nbsp;магните ставится за&nbsp;10&nbsp;минут без врезки в&nbsp;стойку&nbsp;ЧПУ, сам изучает норму вашего станка за&nbsp;30&nbsp;секунд и&nbsp;переводит ремонт в&nbsp;плановое&nbsp;окно.',
    primaryCta: { label: 'Рассчитать экономию для цеха', scrollTo: 'landing-roi' },
    pilotCta: { label: 'Запустить пилот (от 4 900 ₽/мес)', modal: 'modal-subscription', plan: 'plan_1m' },
    dashboardLink: { label: 'Смотреть живой дашборд →', href: '#/dashboard' },
    kpis: [
      { value: 'до 60%', label: 'меньше простоев', note: 'Ремонт в межсменное окно, а не в разгар заказа', color: 'status-ok' },
      { value: 'в 3–5×', label: 'дешевле ремонта', note: 'Замена подшипника заранее вместо капремонта шпинделя', color: 'accent' },
      { value: '10 мин', label: 'на 1 станок без простоя', note: 'Магнитный корпус, без сверления и потери гарантии ЧПУ', color: 'accent' },
      { value: 'от 75 ₽', label: 'в месяц за 1 станок', note: 'При парке цеха от 75–980 ₽/мес на узел — дешевле 15 мин простоя', color: 'accent' },
    ],
  },

  pain: {
    badge: 'Цена отсутствия контроля',
    title: 'Сколько завод теряет, пока ждёт «пока станок застучит»?',
    subtitle: 'Реактивный ремонт всегда бьёт в 3 точки сразу: по кассе на запчасти, по марже из-за простоя и по репутации перед заказчиком.',
    cards: [
      { value: '250 000 – 800 000 ₽', title: 'Капремонт шпинделя', text: 'Плановая замена смазки и подшипников до аварии обходится в 30–60 тыс. ₽. Заклинивание убивает посадку и вал — цена ремонта взлетает в разы.', tone: 'alarm' },
      { value: '2 500 – 5 000 ₽ / час', title: 'Потеря на простое ЧПУ', text: 'Всего 1–2 суток ожидания запчастей и наладчика «сжигают» 60 000 – 200 000 ₽ недополученной выручки и ведут к срыву сроков контракта.', tone: 'alarm' },
      { value: 'от 15 000 ₽ за смену', title: 'Скрытый брак и фрезы', text: 'Микротрещина подшипника или выкрашивание зуба уводят деталь за допуск (Ra) задолго до того, как станок начнёт греметь на весь цех.', tone: 'warn' },
      { value: 'Ночные смены 0 контроля', title: 'Зависимость от «слуха»', text: 'Опытный мастер слышит биение «ухом», но не стоит у каждого станка круглосуточно. Новый оператор замечает поломку уже после удара.', tone: 'warn' },
    ],
    conclusion: 'предотвращение <strong class="text-status-ok">всего одной</strong> аварийной остановки станка полностью окупает подписку на мониторинг всего цеха на несколько лет вперёд.',
  },

  roi: {
    badge: 'Интерактивный расчёт экономики цеха',
    title: 'Сколько денег Gesteresis сохранит вашему предприятию?',
    subtitle: 'Подставьте ваши фактические цифры по парку станков — расчёт обновится мгновенно.',
    presets: [
      { key: 'small', label: 'Участок (5 станков)' },
      { key: 'medium', label: 'Цех (10 станков)', active: true },
      { key: 'large', label: 'Завод (40 станков)' },
    ],
    inputs: [
      { id: 'roi-machines', label: 'Количество станков под контролем', min: 1, max: 100, step: 1, value: 10, unit: 'ед.', minLabel: '1 станок', midLabel: '50', maxLabel: '100 станков' },
      { id: 'roi-hour-cost', label: 'Потери цеха за 1 час простоя станка', min: 1000, max: 10000, step: 250, value: 3500, unit: '₽/ч', minLabel: '1 000 ₽/ч', midLabel: '5 000 ₽/ч', maxLabel: '10 000 ₽/ч' },
      { id: 'roi-incidents', label: 'Внеплановых поломок по всему парку в год', min: 1, max: 30, step: 1, value: 4, unit: 'случая', minLabel: '1 / год', midLabel: '15 / год', maxLabel: '30 / год' },
      { id: 'roi-downtime', label: 'Средний простой при 1 поломке (ожидание + ремонт)', min: 4, max: 72, step: 2, value: 24, unit: 'часа', minLabel: '4 ч', midLabel: '36 ч', maxLabel: '72 ч (3 сут)' },
      { id: 'roi-repair', label: 'Прямой ущерб на 1 аварию (ремонт узла + брак + фреза)', min: 25000, max: 600000, step: 5000, value: 180000, unit: '₽', minLabel: '25 тыс ₽', midLabel: '300 тыс ₽', maxLabel: '600 тыс ₽' },
    ],
    methodology: {
      title: 'Как считается экономия (консервативный расчёт):',
      items: [
        '−55% потерь от простоев: поломка видна заранее, ремонт переносится в плановое окно без простоя смены',
        '−50% расходов на ремонт и брак: замена изношенного подшипника/инструмента до разрушения шпинделя и детали',
      ],
      note: '* Расчёт учитывает облачную подписку Gesteresis; поставка сенсорных модулей на базе ESP32 согласуется индивидуально под число контролируемых узлов и окупается в первый год эксплуатации.',
    },
    cta: { label: 'Зафиксировать расчёт и подключить тариф «Промышленный»', modal: 'modal-subscription', plan: 'plan_6m' },
  },

  nodes: {
    badge: 'Защита критических узлов',
    title: 'Что именно Gesteresis перехватывает до поломки',
    subtitle: 'Система объединяет вибрацию по 3 осям и акустику резания — поэтому видит и механический износ узлов, и проблемы прямо на кромке инструмента.',
    cards: [
      { icon: 'gear', title: 'Шпиндель и подшипники качения', text: 'Обычный датчик молчит, пока не вырастет общая вибрация и нагрев. Gesteresis ловит зарождающиеся микротрещины, питтинг и нехватку смазки на высоких частотах (2–5 кГц) и по ударным пикам — за дни и недели до заклинивания.', tag: 'Экономия до 500 000 ₽/случай', tone: 'ok' },
      { icon: 'bolt', title: 'Процесс резания и режущий инструмент', text: 'Совместный анализ звука и вибрации прямо в момент обработки выявляет затупление или скол зуба фрезы и нештатную нагрузку. Оператор останавливает подачу до того, как дорогая заготовка уйдёт в брак.', tag: 'Сохранение допуска и чистоты Ra', tone: 'accent' },
      { icon: 'cycle', title: 'Дисбаланс патрона и перекос валов', text: 'Разделение радиальной и осевой вибрации сразу показывает: разбалансирован патрон/оправка или появился перекос привода. Это бережёт направляющие и геометрию деталей на чистовых проходах.', tag: '1× и 2–3× гармоники RPM', tone: 'accent' },
      { icon: 'shield', title: 'Задняя бабка, револьверная головка и редукторы', text: 'Контроль люфтов, износа зубчатых передач и жёстких ударов. Вы не меняете исправные детали «по календарю», но всегда видите, какой станок действительно требует внимания на выходных.', tag: 'Переход к ТО по состоянию', tone: 'ok' },
    ],
  },

  implementation: {
    badge: 'Минимум усилий от вашей службы эксплуатации',
    title: 'Внедрение за 15 минут — без сверления станка и вмешательства в ЧПУ',
    subtitle: 'Не нужно звать интеграторов, останавливать линию или прокладывать километры кабеля. Работает на новых ЧПУ и станках с 30-летним пробегом.',
    steps: [
      { num: '01', time: '10 мин', title: 'Крепится на магнитах', text: 'Компактный корпус с батареей ставится снаружи на шпиндельную бабку, заднюю бабку или револьверную головку. Гарантия на станок сохраняется.' },
      { num: '02', time: '30 сек', title: 'Обучается под ваш станок', text: '30 секунд штатной работы — и модель формирует индивидуальный «эталон нормы» именно под конкретный агрегат, патрон и фундамент цеха.' },
      { num: '03', time: '24/7 Edge AI', title: 'Без ложных тревог и Wi-Fi', text: 'Вся диагностика идёт на чипе ESP32-S3. Фильтр Калмана отсекает случайный шум цеха, а при пропадании сети защита станка не отключается.' },
      { num: '04', time: 'Прогноз RUL', title: 'Понятный диагноз узла', text: 'Вместо загадочных кодов мастер видит: какой станок выходит из нормы, по какой физической причине (подшипник / дисбаланс) и когда планировать ТО.' },
    ],
  },

  comparison: {
    badge: 'Сравнение подходов',
    title: 'Почему заводы выбирают Gesteresis вместо дорогих платформ и контроля «на слух»',
    headers: ['Критерий для бизнеса', 'Контроль «на слух» / поломка', 'Siemens, FANUC, MachineMetrics', 'GESTERESIS (Edge AI)'],
    rows: [
      ['Стоимость внедрения', '«Бесплатно», но 1 авария стоит 250–800 тыс. ₽', 'Высокая: ориентирована на крупные корпорации, долгая окупаемость', '<strong class="text-status-ok">Доступно МСП (5–100 станков):</strong> подписка от 4 900 ₽/мес, быстрая окупаемость'],
      ['Монтаж и запуск', 'Нет', 'Сложная интеграция со стойкой ЧПУ, ПЛК и прокладка кабелей', '<strong class="text-accent">10–15 минут без вмешательства в станок</strong> (магнитный корпус)'],
      ['Контроль процесса резания', 'Субъективно — зависит от опыта наладчика', 'В большинстве систем отсутствует или ограничен телеметрией ЧПУ', '<strong class="text-status-ok">Вибрация + акустика резания:</strong> видит износ и скол фрезы'],
      ['Автономность и безопасность данных', '—', 'Требует промышленных серверов или стабильной передачи данных', 'Вычисления на чипе (Edge AI): работает без Wi-Fi, <strong>0 сырых данных в облаке</strong>'],
      ['Понятность причины тревоги', 'Понятно только после разборки узла', 'Нейросети «чёрный ящик» или примитивные пороги', 'Детерминированная модель: точно указывает узел (дисбаланс / перекос / подшипник)'],
      ['Масштабирование на цех', 'Не масштабируется', 'Большие разовые бюджеты на каждый новый станок', '<strong>Старт с 1–5 станков</strong> и плавное расширение на весь парк'],
    ],
  },

  previews: {
    badge: 'Единое окно контроля цеха',
    title: 'Что видите вы, главный инженер и мастер смены',
    subtitle: 'Никаких сложных таблиц — статусы станков, прогноз износа на графике и конкретная причина отклонения.',
    dashboardLink: { label: 'Открыть демо-дашборд →', href: '#/dashboard' },
    cards: [
      {
        type: 'status',
        header: 'ЦЕХ №11 • 3 УЗЛА ONLINE',
        headerRight: 'LIVE EDGE AI',
        items: [
          { name: 'Токарный 16К20Ф3', detail: 'Шпиндель • D<sub>m</sub> = 1.42', status: 'НОРМА', tone: 'ok' },
          { name: 'Фрезерный ОЦ VF-2', detail: 'Тренд ВЧ 2–5 кГц • D<sub>m</sub> = 3.18', status: 'ВНИМАНИЕ', tone: 'warn' },
          { name: 'Шлифовальный #3', detail: 'Рост 1×RPM • D<sub>m</sub> = 4.95', status: 'ТРЕВОГА', tone: 'alarm' },
        ],
        title: 'Светофор по всему парку',
        description: 'За 5 секунд видно, какие станки работают в норме, а какой узел пора ставить на плановое ТО до поломки.',
      },
      {
        type: 'chart',
        header: 'ИНДЕКС АНОМАЛИИ D<sub>m</sub>',
        headerRight: 'RUL: ~4 смены до порога',
        title: 'Чистый тренд без ложных срабатываний',
        description: 'Сглаживание Калмана игнорирует случайный стук стружки (серая линия), но чётко показывает плавный рост износа.',
      },
      {
        type: 'diagnosis',
        header: 'ВКЛАД В ОТКЛОНЕНИЕ (12 ВЕКТОРОВ)',
        headerRight: 'НЕ «ЧЁРНЫЙ ЯЩИК»',
        bars: [
          { label: 'ВЧ энергия 2–5 кГц (подшипник)', value: '+240%', width: 86, tone: 'alarm' },
          { label: 'Эксцесс по оси Z (микроудары)', value: '+145%', width: 62, tone: 'warn' },
          { label: '1×RPM (дисбаланс патрона)', value: '+8% (норма)', width: 18, tone: 'ok' },
        ],
        verdict: 'Вердикт: проверьте смазку и передний подшипник шпинделя.',
        title: 'Механик сразу знает, что чинить',
        description: 'Система показывает, какой именно параметр ушёл от эталона — не нужно вслепую разбирать весь станок.',
      },
    ],
  },

  science: {
    badge: 'Инженерное основание, а не сырой эксперимент',
    title: 'Подтверждённая математика и промышленные корни',
    paragraphs: [
      'Платформа разрабатывается командой <strong>ООО «ПРОЕКТ 11»</strong> на базе исследований кафедры технологий цифровых машиностроительных производств <strong>Набережночелнинского института КФУ</strong> (научные публикации 2017–2022 гг. по виброакустической диагностике и оптимизации режимов резания).',
      'Вместо тяжёлых нейросетей, которым требуются месяцы сбора аварий и дорогой сервер в цеху, Gesteresis использует детерминированную статистику Махаланобиса: ядро прошло <strong>1 420+ автоматизированных проверок</strong> расчётов и работает на микроконтроллере за миллисекунды — без интернета и скрытых отказов.',
    ],
    facts: [
      { label: 'Юридическое лицо', value: 'ООО «ПРОЕКТ 11»', note: 'Договор, счёт, закрывающие документы' },
      { label: 'ИНН / Адрес', value: 'ИНН 0272938548', note: 'г. Белебей, ул. Лесная, д. 12' },
      { label: 'Верификация ядра', value: '1 420+ автотестов • 0 сбоев', note: 'Контроль целостности модели CRC-32', tone: 'ok' },
      { label: 'Соответствие курсу РФ', value: 'Отечественное ПО и Edge AI', note: 'Нацприоритет: датчики диагностики ЧПУ' },
    ],
  },

  pricing: {
    badge: 'Прозрачная стоимость',
    title: 'Тарифы под размер вашего производства',
    subtitle: 'Начните с пилота на 1 участке и масштабируйте на весь цех. Безналичный расчёт для ООО и ИП.',
    plans: [
      {
        name: 'Базовый цех',
        unit: 'от 980 ₽/станок',
        desc: 'Для пилотного запуска и малого участка',
        price: '4 900 ₽',
        period: 'в месяц',
        features: ['До 5 узлов ESP32-S3 на критичных станках', 'Онлайн-телеметрия 24/7 и журнал инцидентов', 'Окупается при спасении даже 1,5 ч простоя/мес'],
        ctaLabel: 'Запустить пилот на этом тарифе',
        plan: 'plan_1m',
        highlighted: false,
      },
      {
        name: 'Промышленный',
        badge: 'Выбор цехов • −15%',
        unit: 'от 166 ₽/станок',
        desc: 'Оптимально для действующего цеха 6–25 станков',
        price: '24 900 ₽',
        period: 'за 6 месяцев (4 150 ₽/мес)',
        features: ['До 25 узлов (шпиндели, головки, приводы)', 'Авто-дообучение моделей по истории смен (A2)', 'Режим аудита смен и приоритетная поддержка'],
        ctaLabel: 'Оформить тариф «Промышленный»',
        plan: 'plan_6m',
        highlighted: true,
      },
      {
        name: 'Корпоративный',
        unit: 'от 75 ₽/станок',
        desc: 'Для всего станочного парка предприятия',
        price: '44 900 ₽',
        period: 'за 12 месяцев (3 742 ₽/мес)',
        features: ['Безлимит узлов и цехов в одном контуре', 'Централизованное OTA-обновление прошивок', 'SLA 99,9% и инженерная поддержка 24/7'],
        ctaLabel: 'Подключить весь завод',
        plan: 'plan_12m',
        highlighted: false,
      },
    ],
  },

  faq: {
    badge: 'Ответы на частые вопросы',
    title: 'Что обычно спрашивают главный инженер и служба безопасности',
    items: [
      {
        q: 'Нужно ли останавливать станок, сверлить корпус или лезть в стойку ЧПУ?',
        a: 'Нет. Модуль выполнен в корпусе с магнитным креплением и устанавливается снаружи за 10 минут без вмешательства в электрику и конструкцию станка. Гарантия производителя оборудования полностью сохраняется.',
        open: true,
      },
      {
        q: 'Что будет, если в цеху плохо ловит Wi-Fi или служба безопасности запрещает выгрузку данных в интернет?',
        a: 'Вся математика (Edge AI) работает автономно на микроконтроллере ESP32-S3 прямо на станке. Сырые записи звука и вибрации не покидают цех; в панель передаются только лёгкие статусы состояния и индекс отклонения. При обрыве связи защита продолжает работать.',
      },
      {
        q: 'На станках постоянно меняются режимы резания и детали — не замучают ли ложные тревоги?',
        a: 'В систему встроен фильтр Калмана и гистерезис: случайные ударные шумы при врезании или отлете стружки отфильтровываются. Кроме того, номинальные обороты (RPM) и 30-секундная калибровка обновляются в один клик из панели управления.',
      },
      {
        q: 'Как проверить эффективность на наших реальных станках перед оснащением всего цеха?',
        a: 'Мы рекомендуем начать с пилота на 1–5 самых нагруженных или дорогих в ремонте станках (тариф «Базовый цех» — 4 900 ₽/мес). Вы сразу увидите реальную загрузку смен, базовый уровень вибрации по каждому узлу и сможете масштабировать систему на основе фактов.',
      },
    ],
  },

  finalCta: {
    title: 'Запустите пилот на 1–5 станках и окупите систему с первой предотвращённой поломки',
    subtitle: 'Монтаж датчика — 10 минут. Автоматическая настройка под станок — 30 секунд. Прозрачная экономика и защита от внепланового простоя 24/7.',
    primary: { label: 'Оформить пилот / подписку', modal: 'modal-subscription', plan: 'plan_6m' },
    dashboard: { label: 'Открыть демо-панель цеха', href: '#/dashboard' },
    contacts: { label: 'Связаться с инженером', href: '#/legal/contacts' },
  },
};

const Landing = {
  /**
   * Рендерит стартовую страницу.
   * @param {GesteresisApp} app — для доступа к state
   */
  render(app) {
    const container = document.getElementById('view-landing');
    if (!container) return;

    container.innerHTML = `
      ${this._renderHero()}
      ${this._renderPain()}
      ${this._renderRoi()}
      ${this._renderNodes()}
      ${this._renderImplementation()}
      ${this._renderComparison()}
      ${this._renderPreviews()}
      ${this._renderScience()}
      ${this._renderPricing()}
      ${this._renderFaq()}
      ${this._renderFinalCta()}
    `;

    this._bind(container);
    this._initRoi(container);
  },

  // ==========================================================================
  // СЕКЦИИ
  // ==========================================================================

  _renderHero() {
    const h = LANDING_CONTENT.hero;
    return `
      <section class="relative overflow-hidden bg-bg-surface border border-border-subtle rounded-card">
        <div class="absolute inset-0 pointer-events-none g-hero-glow"></div>

        <div class="relative px-6 sm:px-10 py-12 sm:py-16 max-w-4xl mx-auto text-center space-y-6">
          <div class="flex flex-wrap items-center justify-center gap-2">
            <span class="inline-block px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider g-tint-accent text-accent border">
              ${Html.escape(h.badge1)}
            </span>
            <span class="inline-block px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider g-tint-ok text-status-ok border">
              ${Html.escape(h.badge2)}
            </span>
          </div>

          <h1 class="text-3xl sm:text-5xl font-bold text-text-primary leading-tight">
            ${h.title}
          </h1>

          <p class="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            ${h.subtitle}
          </p>

          <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button type="button" data-scroll-to="${h.primaryCta.scrollTo}" class="px-5 py-3 rounded-xl text-sm font-semibold bg-accent text-bg-canvas hover:opacity-90 shadow-lg transition cursor-pointer">
              ${Html.escape(h.primaryCta.label)}
            </button>
            <button type="button" data-modal-trigger="${h.pilotCta.modal}" data-select-plan="${h.pilotCta.plan}" class="px-5 py-3 rounded-xl text-sm font-semibold bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-strong transition cursor-pointer">
              ${Html.escape(h.pilotCta.label)}
            </button>
            <a href="${h.dashboardLink.href}" class="px-5 py-3 rounded-xl text-sm font-medium text-accent hover:underline transition">
              ${Html.escape(h.dashboardLink.label)}
            </a>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 text-left">
            ${h.kpis.map(k => `
              <div class="p-3.5 rounded-xl bg-bg-canvas/70 border border-border-subtle">
                <div class="font-mono text-xl sm:text-2xl font-bold ${k.color === 'status-ok' ? 'text-status-ok' : 'text-accent'}">${Html.escape(k.value)}</div>
                <div class="text-xs font-semibold text-text-primary mt-0.5">${Html.escape(k.label)}</div>
                <div class="text-[11px] text-text-secondary mt-0.5">${Html.escape(k.note)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  _renderPain() {
    const p = LANDING_CONTENT.pain;
    return `
      <section class="space-y-5">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="text-[11px] font-mono uppercase tracking-wider text-status-alarm">${Html.escape(p.badge)}</span>
          <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(p.title)}</h2>
          <p class="text-sm sm:text-base text-text-secondary">${Html.escape(p.subtitle)}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${p.cards.map(c => `
            <div class="bg-bg-surface border rounded-card p-5 space-y-2.5 ${c.tone === 'alarm' ? 'g-tint-alarm' : 'g-tint-warn'}">
              <div class="font-mono text-lg font-bold ${c.tone === 'alarm' ? 'text-status-alarm' : 'text-status-warn'}">${Html.escape(c.value)}</div>
              <h3 class="text-sm font-bold text-text-primary">${Html.escape(c.title)}</h3>
              <p class="text-xs text-text-secondary leading-relaxed">${Html.escape(c.text)}</p>
            </div>
          `).join('')}
        </div>

        <div class="bg-bg-surface border border-border-subtle rounded-card p-4 text-center text-xs sm:text-sm text-text-primary">
          <span class="font-semibold text-accent">Вывод для собственника:</span> ${p.conclusion}
        </div>
      </section>
    `;
  },

  _renderRoi() {
    const r = LANDING_CONTENT.roi;
    return `
      <section id="landing-roi" class="bg-bg-surface border border-border-subtle rounded-card p-6 sm:p-10 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-subtle pb-5">
          <div class="space-y-1.5 max-w-2xl">
            <span class="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider g-tint-accent text-accent border">
              ${Html.escape(r.badge)}
            </span>
            <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(r.title)}</h2>
            <p class="text-sm text-text-secondary">${Html.escape(r.subtitle)}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            ${r.presets.map(p => `
              <button type="button" class="g-preset-btn ${p.active ? 'is-active' : ''} px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-canvas border border-border-strong text-text-secondary hover:text-text-primary transition" data-roi-preset="${p.key}">
                ${Html.escape(p.label)}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div class="lg:col-span-5 space-y-4">
            ${r.inputs.map(inp => `
              <div class="p-4 rounded-xl bg-bg-canvas border border-border-subtle space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <label for="${inp.id}" class="font-medium text-text-primary">${Html.escape(inp.label)}</label>
                  <span id="${inp.id}-val" class="font-mono font-bold text-accent">${inp.value} ${Html.escape(inp.unit)}</span>
                </div>
                <input id="${inp.id}" type="range" min="${inp.min}" max="${inp.max}" step="${inp.step}" value="${inp.value}" class="g-range">
                <div class="flex justify-between text-[10px] text-text-muted font-mono">
                  <span>${Html.escape(inp.minLabel)}</span><span>${Html.escape(inp.midLabel)}</span><span>${Html.escape(inp.maxLabel)}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="lg:col-span-7 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-5 rounded-xl border g-tint-alarm space-y-1.5">
                <div class="text-xs font-medium text-text-secondary">Текущие потери цеха без контроля</div>
                <div id="roi-out-current-loss" class="font-mono text-2xl sm:text-3xl font-bold text-status-alarm">1 056 000 ₽</div>
                <div class="text-xs text-text-secondary">в год (<span id="roi-out-total-hours" class="font-mono font-semibold text-text-primary">96 ч</span> вынужденного простоя)</div>
              </div>
              <div class="p-5 rounded-xl border g-tint-ok space-y-1.5">
                <div class="text-xs font-medium text-text-secondary">Экономия с Gesteresis за год</div>
                <div id="roi-out-savings" class="font-mono text-2xl sm:text-3xl font-bold text-status-ok">544 800 ₽</div>
                <div class="text-xs text-text-secondary">возвращается в цех <span id="roi-out-saved-hours" class="font-mono font-semibold text-text-primary">53 станко-часа</span> в год</div>
              </div>
            </div>

            <div class="p-5 rounded-xl bg-bg-canvas border border-border-strong space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-subtle">
                <div>
                  <div class="text-[11px] font-mono uppercase tracking-wider text-text-muted">Рекомендованный тариф под ваш парк</div>
                  <div id="roi-out-plan-name" class="text-base font-bold text-text-primary mt-0.5">Промышленный (до 25 узлов)</div>
                </div>
                <div class="sm:text-right">
                  <div class="text-[11px] text-text-muted">Стоимость подписки в год</div>
                  <div id="roi-out-sub-cost" class="font-mono text-lg font-bold text-accent">49 800 ₽ / год</div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="p-3.5 rounded-xl bg-bg-surface border border-border-subtle">
                  <div class="text-[11px] text-text-secondary">Чистая выгода за вычетом подписки</div>
                  <div id="roi-out-net" class="font-mono text-xl font-bold text-status-ok mt-1">+495 000 ₽</div>
                </div>
                <div class="p-3.5 rounded-xl bg-bg-surface border border-border-subtle">
                  <div class="text-[11px] text-text-secondary">Окупаемость подписки</div>
                  <div id="roi-out-payback" class="font-mono text-xl font-bold text-text-primary mt-1">~33 дня</div>
                </div>
                <div class="p-3.5 rounded-xl bg-bg-surface border border-border-subtle">
                  <div class="text-[11px] text-text-secondary">Возврат на 1 ₽ подписки</div>
                  <div id="roi-out-multiple" class="font-mono text-xl font-bold text-accent mt-1">10.9×</div>
                </div>
              </div>

              <div class="p-3.5 rounded-xl bg-bg-surface border border-border-subtle text-xs text-text-secondary space-y-1.5 leading-relaxed">
                <div class="font-semibold text-text-primary">${Html.escape(r.methodology.title)}</div>
                <div>• <strong class="text-text-primary">${Html.escape(r.methodology.items[0])}</strong> (<span id="roi-out-saved-downtime" class="font-mono text-text-primary">184 800 ₽</span>).</div>
                <div>• <strong class="text-text-primary">${Html.escape(r.methodology.items[1])}</strong> (<span id="roi-out-saved-repair" class="font-mono text-text-primary">360 000 ₽</span>).</div>
                <div class="text-[11px] text-text-muted pt-1">${Html.escape(r.methodology.note)}</div>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button id="roi-cta-button" type="button" data-modal-trigger="${r.cta.modal}" data-select-plan="${r.cta.plan}" class="flex-1 py-3 px-5 rounded-xl text-sm font-bold bg-accent text-bg-canvas hover:opacity-90 shadow-lg transition cursor-pointer text-center">
                  ${Html.escape(r.cta.label)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  _renderNodes() {
    const n = LANDING_CONTENT.nodes;
    return `
      <section class="space-y-6">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="text-[11px] font-mono uppercase tracking-wider text-accent">${Html.escape(n.badge)}</span>
          <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(n.title)}</h2>
          <p class="text-sm sm:text-base text-text-secondary">${Html.escape(n.subtitle)}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${n.cards.map(c => `
            <div class="bg-bg-surface border border-border-subtle rounded-card p-6 space-y-3 g-card-hover">
              <div class="flex items-center justify-between">
                <div class="w-10 h-10 rounded-xl g-tint-accent border flex items-center justify-center">
                  ${this._icon(c.icon)}
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono ${c.tone === 'ok' ? 'g-tint-ok text-status-ok' : 'g-tint-accent text-accent'} border">${Html.escape(c.tag)}</span>
              </div>
              <h3 class="text-base font-bold text-text-primary">${Html.escape(c.title)}</h3>
              <p class="text-sm text-text-secondary leading-relaxed">${Html.escape(c.text)}</p>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  _renderImplementation() {
    const im = LANDING_CONTENT.implementation;
    return `
      <section id="landing-about" class="bg-bg-surface border border-border-subtle rounded-card p-6 sm:p-10 space-y-6">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="text-[11px] font-mono uppercase tracking-wider text-accent">${Html.escape(im.badge)}</span>
          <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(im.title)}</h2>
          <p class="text-sm sm:text-base text-text-secondary">${Html.escape(im.subtitle)}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${im.steps.map(s => `
            <div class="p-5 rounded-xl bg-bg-canvas border border-border-subtle space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="font-mono text-2xl font-bold text-accent">${Html.escape(s.num)}</span>
                <span class="text-[11px] font-mono text-text-muted">${Html.escape(s.time)}</span>
              </div>
              <h3 class="text-sm font-bold text-text-primary">${Html.escape(s.title)}</h3>
              <p class="text-xs text-text-secondary leading-relaxed">${Html.escape(s.text)}</p>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  _renderComparison() {
    const c = LANDING_CONTENT.comparison;
    return `
      <section id="landing-compare" class="space-y-6">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="text-[11px] font-mono uppercase tracking-wider text-accent">${Html.escape(c.badge)}</span>
          <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(c.title)}</h2>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Колонка 1: Обычный контроль -->
          <div class="bg-bg-surface border border-border-subtle rounded-card p-6 opacity-80">
            <h3 class="text-lg font-bold text-text-secondary mb-4 border-b border-border-subtle pb-3">${Html.escape(c.headers[1])}</h3>
            <ul class="space-y-4 text-sm">
              <li><strong class="text-text-primary block">Стоимость:</strong> «Бесплатно», но 1 авария стоит 250–800 тыс. ₽</li>
              <li><strong class="text-text-primary block">Монтаж:</strong> Нет</li>
              <li><strong class="text-text-primary block">Контроль:</strong> Субъективно, зависит от наладчика</li>
              <li><strong class="text-text-primary block">Тревоги:</strong> Понятно только после разборки узла</li>
            </ul>
          </div>

          <!-- Колонка 2: Дорогие платформы -->
          <div class="bg-bg-surface border border-border-subtle rounded-card p-6 opacity-80">
            <h3 class="text-lg font-bold text-text-secondary mb-4 border-b border-border-subtle pb-3">${Html.escape(c.headers[2])}</h3>
            <ul class="space-y-4 text-sm">
              <li><strong class="text-text-primary block">Стоимость:</strong> Высокая, долгая окупаемость</li>
              <li><strong class="text-text-primary block">Монтаж:</strong> Сложная интеграция со стойкой ЧПУ</li>
              <li><strong class="text-text-primary block">Контроль:</strong> Часто отсутствует или ограничен</li>
              <li><strong class="text-text-primary block">Тревоги:</strong> Нейросети «чёрный ящик»</li>
            </ul>
          </div>

          <!-- Колонка 3: Gesteresis (Выделенная) -->
          <div class="bg-bg-surface border-2 border-accent rounded-card p-6 shadow-xl shadow-accent/10 relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-accent text-bg-canvas text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Выбор цехов</div>
            <h3 class="text-lg font-bold text-accent mb-4 border-b border-accent/30 pb-3 mt-2">${Html.escape(c.headers[3])}</h3>
            <ul class="space-y-4 text-sm">
              <li><strong class="text-status-ok block">Доступно МСП (5–100 станков):</strong> подписка от 4 900 ₽/мес</li>
              <li><strong class="text-status-ok block">Монтаж 10 минут:</strong> без вмешательства в станок</li>
              <li><strong class="text-status-ok block">Вибрация + акустика:</strong> видит износ и скол фрезы</li>
              <li><strong class="text-status-ok block">Детерминированная модель:</strong> точно указывает узел</li>
            </ul>
          </div>

        </div>
      </section>
    `;
  },

  _renderPreviews() {
    const p = LANDING_CONTENT.previews;
    return `
      <section class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div class="space-y-2 max-w-2xl">
            <span class="text-[11px] font-mono uppercase tracking-wider text-accent">${Html.escape(p.badge)}</span>
            <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(p.title)}</h2>
            <p class="text-sm sm:text-base text-text-secondary">${Html.escape(p.subtitle)}</p>
          </div>
          <a href="${p.dashboardLink.href}" class="self-start px-4 py-2.5 rounded-xl text-xs font-semibold g-tint-accent text-accent border hover:opacity-90 transition">
            ${Html.escape(p.dashboardLink.label)}
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${p.cards.map(card => `
            <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden flex flex-col">
              ${this._renderPreviewCard(card)}
              <div class="p-4 space-y-1">
                <h3 class="text-sm font-bold text-text-primary">${Html.escape(card.title)}</h3>
                <p class="text-xs text-text-secondary">${Html.escape(card.description)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  _renderPreviewCard(card) {
    if (card.type === 'status') {
      return `
        <div class="p-4 bg-bg-canvas border-b border-border-subtle space-y-2.5">
          <div class="flex items-center justify-between text-[10px] font-mono text-text-muted">
            <span>${Html.escape(card.header)}</span>
            <span class="text-status-ok">${Html.escape(card.headerRight)}</span>
          </div>
          ${card.items.map(item => `
            <div class="p-2.5 rounded-lg bg-bg-surface border ${item.tone === 'ok' ? 'border-border-subtle' : item.tone === 'warn' ? 'g-tint-warn' : 'g-tint-alarm'} flex items-center justify-between">
              <div>
                <div class="text-xs font-semibold text-text-primary">${Html.escape(item.name)}</div>
                <div class="text-[10px] font-mono ${item.tone === 'ok' ? 'text-text-muted' : item.tone === 'warn' ? 'text-status-warn' : 'text-status-alarm'}">${Html.escape(item.detail)}</div>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${item.tone === 'ok' ? 'g-tint-ok text-status-ok' : item.tone === 'warn' ? 'g-tint-warn text-status-warn' : 'g-tint-alarm text-status-alarm'} border">${Html.escape(item.status)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (card.type === 'chart') {
      return `
        <div class="p-4 bg-bg-canvas border-b border-border-subtle space-y-2">
          <div class="flex items-center justify-between text-[10px] font-mono">
            <span class="text-text-muted">${Html.escape(card.header)}</span>
            <span class="text-status-warn">${Html.escape(card.headerRight)}</span>
          </div>
          <svg viewBox="0 0 320 135" class="w-full" style="height:142px" aria-label="График прогноза износа до аварии">
            <rect x="0" y="6" width="320" height="32" fill="rgba(239,68,68,0.10)"></rect>
            <line x1="0" y1="38" x2="320" y2="38" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="4 3"></line>
            <text x="6" y="33" fill="#ef4444" font-size="9" font-family="JetBrains Mono, monospace">ПОРОГ АВАРИИ (threshold)</text>
            <polyline fill="none" stroke="rgba(148,163,184,0.45)" stroke-width="1.2" points="8,112 24,102 38,116 54,84 68,110 86,105 102,114 118,98 134,106 150,90 166,97 182,85 198,92 214,76 230,72 248,60 264,54 280,46 296,40 312,31"></polyline>
            <path fill="none" stroke="#22d3ee" stroke-width="2.5" d="M8,112 C60,108 110,106 155,98 C200,90 240,72 312,35"></path>
            <circle cx="248" cy="65" r="4.5" fill="#f59e0b"></circle>
            <text x="148" y="60" fill="#f59e0b" font-size="9" font-family="JetBrains Mono, monospace">Ранний сигнал (ТО в план)</text>
            <text x="6" y="127" fill="#10b981" font-size="9" font-family="JetBrains Mono, monospace">НОРМА (фильтр Калмана гасит шум)</text>
          </svg>
        </div>
      `;
    }

    // diagnosis
    return `
      <div class="p-4 bg-bg-canvas border-b border-border-subtle space-y-2.5">
        <div class="flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span>${Html.escape(card.header)}</span>
          <span class="text-accent">${Html.escape(card.headerRight)}</span>
        </div>
        <div class="space-y-2 pt-1">
          ${card.bars.map(bar => `
            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <span class="text-text-primary font-medium">${Html.escape(bar.label)}</span>
                <span class="font-mono ${bar.tone === 'alarm' ? 'text-status-alarm' : bar.tone === 'warn' ? 'text-status-warn' : 'text-status-ok'} font-bold">${Html.escape(bar.value)}</span>
              </div>
              <div class="g-bar-track"><div class="g-bar-fill ${bar.tone === 'alarm' ? 'bg-status-alarm' : bar.tone === 'warn' ? 'bg-status-warn' : 'bg-status-ok'}" style="width:${bar.width}%"></div></div>
            </div>
          `).join('')}
          <div class="p-2 rounded bg-bg-surface border border-border-subtle text-[10px] font-mono text-text-secondary">
            ${Html.escape(card.verdict)}
          </div>
        </div>
      </div>
    `;
  },

  _renderScience() {
    const s = LANDING_CONTENT.science;
    return `
      <section class="bg-bg-surface border border-border-subtle rounded-card p-6 sm:p-10">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div class="space-y-4">
            <span class="text-[11px] font-mono uppercase tracking-wider text-accent">${Html.escape(s.badge)}</span>
            <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(s.title)}</h2>
            ${s.paragraphs.map(p => `<p class="text-sm text-text-secondary leading-relaxed">${p}</p>`).join('')}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${s.facts.map(f => `
              <div class="p-4 rounded-xl bg-bg-canvas border border-border-subtle">
                <div class="text-[10px] font-mono uppercase tracking-wider text-text-muted">${Html.escape(f.label)}</div>
                <div class="text-sm font-semibold ${f.tone === 'ok' ? 'text-status-ok' : 'text-text-primary'} mt-1">${Html.escape(f.value)}</div>
                <div class="text-[11px] text-text-secondary mt-0.5">${Html.escape(f.note)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  _renderPricing() {
    const p = LANDING_CONTENT.pricing;
    return `
      <section id="landing-pricing" class="space-y-6">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="text-[11px] font-mono uppercase tracking-wider text-accent">${Html.escape(p.badge)}</span>
          <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(p.title)}</h2>
          <p class="text-sm sm:text-base text-text-secondary">${Html.escape(p.subtitle)}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${p.plans.map(plan => `
            <div class="bg-bg-surface border ${plan.highlighted ? 'g-tint-accent shadow-lg' : 'border-border-subtle'} rounded-card p-6 flex flex-col space-y-4">
              ${plan.badge ? `<div class="flex items-center justify-between gap-2"><span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider g-tint-accent text-accent border">${Html.escape(plan.badge)}</span><span class="text-[11px] font-mono text-accent">${Html.escape(plan.unit)}</span></div>` : `<div class="flex items-center justify-between gap-2"><h3 class="text-lg font-bold text-text-primary">${Html.escape(plan.name)}</h3><span class="text-[11px] font-mono text-text-muted">${Html.escape(plan.unit)}</span></div>`}
              <div>
                ${plan.badge ? `<h3 class="text-lg font-bold text-text-primary">${Html.escape(plan.name)}</h3>` : ''}
                <p class="text-xs text-text-secondary mt-1">${Html.escape(plan.desc)}</p>
                <div class="mt-3 flex items-baseline gap-1">
                  <span class="text-2xl font-bold text-accent font-mono">${Html.escape(plan.price)}</span>
                  <span class="text-xs text-text-muted">${Html.escape(plan.period)}</span>
                </div>
              </div>
              <ul class="space-y-2 text-sm text-text-secondary flex-1">
                ${plan.features.map(f => `
                  <li class="flex items-start gap-2">
                    <svg class="w-4 h-4 text-status-ok flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    <span>${Html.escape(f)}</span>
                  </li>
                `).join('')}
              </ul>
              <button type="button" data-modal-trigger="modal-subscription" data-select-plan="${plan.plan}" class="w-full py-2.5 rounded-xl text-xs font-semibold ${plan.highlighted ? 'bg-accent text-bg-canvas hover:opacity-90' : 'bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle'} transition cursor-pointer">
                ${Html.escape(plan.ctaLabel)}
              </button>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  _renderFaq() {
    const f = LANDING_CONTENT.faq;
    return `
      <section id="landing-faq" class="bg-bg-surface border border-border-subtle rounded-card p-6 sm:p-10 space-y-5">
        <div class="max-w-2xl space-y-1">
          <span class="text-[11px] font-mono uppercase tracking-wider text-accent">${Html.escape(f.badge)}</span>
          <h2 class="text-2xl font-bold text-text-primary">${Html.escape(f.title)}</h2>
        </div>

        <div class="space-y-2.5" id="landing-faq-list">
          ${f.items.map(item => `
            <div class="g-faq-item ${item.open ? 'is-open' : ''} rounded-xl bg-bg-canvas border border-border-subtle overflow-hidden">
              <button type="button" class="g-faq-toggle w-full p-4 flex items-center justify-between gap-4 text-left cursor-pointer">
                <span class="text-sm font-semibold text-text-primary">${Html.escape(item.q)}</span>
                <svg class="g-faq-chevron w-4 h-4 text-text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <div class="g-faq-answer">
                <div class="px-4 pb-4 text-xs sm:text-sm text-text-secondary leading-relaxed">
                  ${Html.escape(item.a)}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  _renderFinalCta() {
    const f = LANDING_CONTENT.finalCta;
    return `
      <section class="g-cta-gradient border border-border-strong rounded-card p-8 sm:p-12 text-center space-y-4">
        <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(f.title)}</h2>
        <p class="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto">${Html.escape(f.subtitle)}</p>
        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button type="button" data-modal-trigger="${f.primary.modal}" data-select-plan="${f.primary.plan}" class="px-6 py-3 rounded-xl text-sm font-bold bg-accent text-bg-canvas hover:opacity-90 shadow-lg transition cursor-pointer">
            ${Html.escape(f.primary.label)}
          </button>
          <a href="${f.dashboard.href}" class="px-5 py-3 rounded-xl text-sm font-semibold bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle transition">
            ${Html.escape(f.dashboard.label)}
          </a>
          <a href="${f.contacts.href}" class="px-5 py-3 rounded-xl text-sm font-semibold bg-bg-surface hover:bg-bg-elevated text-text-primary border border-border-subtle transition">
            ${Html.escape(f.contacts.label)}
          </a>
        </div>
      </section>
    `;
  },

  // ==========================================================================
  // ROI-КАЛЬКУЛЯТОР (логика)
  // ==========================================================================

  _initRoi(container) {
    const roi = container.querySelector('#landing-roi');
    if (!roi) return;

    const machines = roi.querySelector('#roi-machines');
    const hourCost = roi.querySelector('#roi-hour-cost');
    const incidents = roi.querySelector('#roi-incidents');
    const downtime = roi.querySelector('#roi-downtime');
    const repair = roi.querySelector('#roi-repair');
    if (!machines || !hourCost || !incidents || !downtime || !repair) return;

    const els = {
      machinesVal: roi.querySelector('#roi-machines-val'),
      hourCostVal: roi.querySelector('#roi-hour-cost-val'),
      incidentsVal: roi.querySelector('#roi-incidents-val'),
      downtimeVal: roi.querySelector('#roi-downtime-val'),
      repairVal: roi.querySelector('#roi-repair-val'),
      currentLoss: roi.querySelector('#roi-out-current-loss'),
      totalHours: roi.querySelector('#roi-out-total-hours'),
      savings: roi.querySelector('#roi-out-savings'),
      savedHours: roi.querySelector('#roi-out-saved-hours'),
      planName: roi.querySelector('#roi-out-plan-name'),
      subCost: roi.querySelector('#roi-out-sub-cost'),
      net: roi.querySelector('#roi-out-net'),
      payback: roi.querySelector('#roi-out-payback'),
      multiple: roi.querySelector('#roi-out-multiple'),
      savedDowntime: roi.querySelector('#roi-out-saved-downtime'),
      savedRepair: roi.querySelector('#roi-out-saved-repair'),
    };

    const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽';

    const planForMachines = (m) => {
      if (m <= 5) return { name: 'Базовый цех (до 5 узлов)', costPerYear: 4900 * 12 };
      if (m <= 25) return { name: 'Промышленный (до 25 узлов)', costPerYear: 24900 * 2 };
      return { name: 'Корпоративный (безлимит)', costPerYear: 44900 };
    };

    const update = () => {
      const m = +machines.value;
      const hc = +hourCost.value;
      const inc = +incidents.value;
      const dt = +downtime.value;
      const rp = +repair.value;

      els.machinesVal.textContent = m + ' ед.';
      els.hourCostVal.textContent = hc.toLocaleString('ru-RU') + ' ₽/ч';
      els.incidentsVal.textContent = inc + ' случая';
      els.downtimeVal.textContent = dt + ' часа';
      els.repairVal.textContent = rp.toLocaleString('ru-RU') + ' ₽';

      const totalHours = inc * dt;
      const currentLoss = inc * dt * hc + inc * rp;
      const savedDowntime = Math.round(inc * dt * hc * 0.55);
      const savedRepair = Math.round(inc * rp * 0.5);
      const savings = savedDowntime + savedRepair;
      const plan = planForMachines(m);
      const net = savings - plan.costPerYear;
      const multiple = plan.costPerYear > 0 ? savings / plan.costPerYear : 0;
      const paybackDays = savings > 0 ? Math.round((plan.costPerYear / savings) * 365) : 0;
      const savedHours = Math.round(totalHours * 0.55);

      els.currentLoss.textContent = fmt(currentLoss);
      els.totalHours.textContent = totalHours + ' ч';
      els.savings.textContent = fmt(savings);
      els.savedHours.textContent = savedHours + ' станко-часа';
      els.planName.textContent = plan.name;
      els.subCost.textContent = fmt(plan.costPerYear) + ' / год';
      els.net.textContent = (net >= 0 ? '+' : '') + fmt(net);
      els.net.className = 'font-mono text-xl font-bold mt-1 ' + (net >= 0 ? 'text-status-ok' : 'text-status-alarm');
      els.payback.textContent = '~' + paybackDays + ' дней';
      els.multiple.textContent = multiple.toFixed(1) + '×';
      els.savedDowntime.textContent = fmt(savedDowntime);
      els.savedRepair.textContent = fmt(savedRepair);
    };

    [machines, hourCost, incidents, downtime, repair].forEach((el) => {
      el.addEventListener('input', update);
    });

    roi.querySelectorAll('[data-roi-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-roi-preset');
        if (preset === 'small') { machines.value = 5; incidents.value = 2; downtime.value = 16; repair.value = 120000; }
        else if (preset === 'medium') { machines.value = 10; incidents.value = 4; downtime.value = 24; repair.value = 180000; }
        else { machines.value = 40; incidents.value = 12; downtime.value = 36; repair.value = 300000; }
        roi.querySelectorAll('[data-roi-preset]').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        update();
      });
    });

    update();
  },

  // ==========================================================================
  // ПРИВЯЗКА И ИКОНКИ
  // ==========================================================================

  _bind(container) {
    // Кнопки, открывающие модалки
    container.querySelectorAll('[data-modal-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-modal-trigger');
        if (id === 'modal-subscription') {
          const app = window.gesteresisApp;
          const dt = app?.state?.subscription
            ? Html.formatDate(app.state.subscription.expiresAt)
            : '—';
          const el = document.getElementById('modal-sub-current-date');
          if (el) el.textContent = dt;
        }
        const plan = btn.getAttribute('data-select-plan');
        if (plan) {
          const radio = document.querySelector(`input[name="sub_plan"][value="${plan}"]`);
          if (radio) radio.checked = true;
        }
        window.modalManager?.open(id);
      });
    });

    // FAQ-аккордеон
    container.querySelectorAll('.g-faq-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.g-faq-item');
        if (item) item.classList.toggle('is-open');
      });
    });
  },

  _icon(key) {
    const common = 'class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"';
    const icons = {
      gear: `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
      bolt: `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
      cycle: `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`,
      shield: `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>`,
    };
    return icons[key] || icons.gear;
  },
};

window.Landing = Landing;

// Глобальный обработчик скролл-кнопок (работает для кнопок в шапке и на лендинге)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-scroll-to]');
  if (!btn) return;
  e.preventDefault();
  const id = btn.getAttribute('data-scroll-to');
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
