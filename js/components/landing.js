/**
 * ============================================================================
 * GESTERESIS — Landing Page Component (js/components/landing.js)
 * ============================================================================
 * Стартовая страница сайта (#/). Отвечает за:
 *  - Hero-секцию с описанием продукта и CTA
 *  - Блок «О системе» (Gesteresis — что это, зачем)
 *  - Блок «О компании» (ПРОЕКТ 11)
 *  - Скриншоты интерфейса (плейсхолдеры — заменятся реальными картинками)
 *  - Тарифы (краткая выжимка из модалки подписки)
 *  - CTA-блок «Начать работу»
 *
 * Контент хранится в LANDING_CONTENT — легко менять тексты без правок
 * разметки. Когда появятся реальные скриншоты, достаточно заменить
 * `_renderScreenshotPlaceholder(...)` на `<img src="...">`.
 *
 * Зависимости:
 *  - js/utils/html.js -> Html.escape
 *
 * Подключается ДО app.js (после profile.js).
 * Доступ через window.Landing.
 * ============================================================================
 */

const LANDING_CONTENT = {
  hero: {
    badge: 'Edge AI • Predictive Maintenance',
    title: 'Диагностика оборудования на&nbsp;грани',
    subtitle: 'Gesteresis превращает ESP32-S3 в&nbsp;умный датчик: считает расстояние Махаланобиса D<sub>m</sub> прямо на&nbsp;чипе, ловит предаварийные состояния за&nbsp;дни до&nbsp;поломки и&nbsp;не&nbsp;отправляет сырые данные в&nbsp;облако.',
    primaryCta: { label: 'Войти в систему', href: '#/dashboard' },
    secondaryCta: { label: 'Узнать больше', href: '#landing-about' },
    stats: [
      { value: '644 B', label: 'CalibrationBlob в NVS' },
      { value: '12', label: 'признаков в векторе x' },
      { value: '5 сек', label: 'интервал телеметрии' },
      { value: '0', label: 'сырых данных в облаке' },
    ],
  },

  about: {
    title: 'Что такое Gesteresis',
    subtitle: 'Программно-аппаратный комплекс предиктивной диагностики для промышленного оборудования.',
    cards: [
      {
        icon: 'chip',
        title: 'Edge-first архитектура',
        text: 'Модель рассчитывается на ESP32-S3. В облако уходит только метрика D<sub>m</sub>, статус и код ошибки. Сырые показания акселерометра остаются на объекте — это критично для цехов без стабильного интернета.',
      },
      {
        icon: 'chart',
        title: 'Расстояние Махаланобиса',
        text: 'Каждое окно телеметрии превращается в вектор x[12]: RMS, crest factor, kurtosis, амплитуды 1×RPM и 2–3×RPM, энергия в полосе 2–5 кГц. Отклонение от нормы считается по регуляризованной матрице S⁻¹.',
      },
      {
        icon: 'shield',
        title: 'Калибровка под конкретный станок',
        text: 'Каждый узел проходит автономную калибровку: 30 секунд нормальной работы — и модель «знает» именно этот подшипник, шпиндель или компрессор. Никаких универсальных порогов.',
      },
      {
        icon: 'cloud',
        title: 'Server-side refinement (A2)',
        text: 'Опционально: облако пересчитывает модель по накопленной истории и отправляет обновлённый CalibrationBlob обратно на чип. Точность растёт со временем эксплуатации.',
      },
    ],
  },

  company: {
    title: 'Кто мы',
    subtitle: 'Gesteresis разрабатывается инженерами ООО «ПРОЕКТ 11» — небольшой команды, которая делает промышленное ПО и встраиваемые системы.',
    facts: [
      { label: 'Юридическое лицо', value: 'ООО «ПРОЕКТ 11»' },
      { label: 'ИНН', value: '0272938548' },
      { label: 'Адрес', value: '123456, г. Белебей, ул. Лесная, д. 12' },
      { label: 'Профиль', value: 'Embedded • Edge AI • Industrial IoT' },
    ],
    text: 'Мы верим, что предиктивная диагностика не должна требовать промышленного сервера в цеху и круглосуточного канала связи. Поэтому Gesteresis считает всё на чипе за 2000 ₽, а в облако отправляет только то, что нужно для принятия решения.',
  },

  screenshots: {
    title: 'Как это выглядит',
    subtitle: 'Дашборд, детальная диагностика, график D<sub>m</sub> в реальном времени.',
    items: [
      {
        title: 'Дашборд мониторинга',
        description: 'Все узлы в реальном времени: D<sub>m</sub> (Kalman / Raw), статус, fault-коды, живой график.',
        placeholder: 'dashboard',
      },
      {
        title: 'Детальная диагностика',
        description: 'Вектор признаков x[12], CalibrationBlob, матрица S⁻¹ 12×12 и состояние NVS.',
        placeholder: 'detail',
      },
      {
        title: 'Управление командами',
        description: 'SET_THRESHOLD, SET_RPM, CALIBRATE, CLEAR_FAULT, RESET — прямо из интерфейса.',
        placeholder: 'commands',
      },
    ],
  },

  pricing: {
    title: 'Тарифы',
    subtitle: 'От одного станка до целого парка. Все тарифы включают облачный дашборд и MQTT-брокер.',
    plans: [
      {
        name: 'Базовый цех',
        price: '4 900 ₽',
        period: 'в месяц',
        features: ['До 5 узлов ESP32-S3', 'Телеметрия и хранение логов', 'Стандартная поддержка'],
        highlighted: false,
      },
      {
        name: 'Промышленный',
        price: '24 900 ₽',
        period: 'за 6 месяцев',
        features: ['До 25 узлов', 'Server-refinement моделей (NumPy)', 'Режим аудита C', 'Приоритетная поддержка'],
        highlighted: true,
      },
      {
        name: 'Корпоративный',
        price: '44 900 ₽',
        period: 'за 12 месяцев',
        features: ['Безлимит узлов', 'OTA-раздача прошивок', 'SLA 99,9%', 'Поддержка 24/7'],
        highlighted: false,
      },
    ],
    cta: { label: 'Оформить подписку', href: '#/dashboard', modal: 'modal-subscription' },
  },

  finalCta: {
    title: 'Готовы увидеть свой станок по-новому?',
    subtitle: 'Подключите первый узел за 10 минут. Калибровка — 30 секунд. Первый отчёт — через час.',
    primary: { label: 'Перейти в систему', href: '#/dashboard' },
    secondary: { label: 'Связаться с нами', href: '#/legal/contacts' },
  },
};

const Landing = {
  /**
   * Рендерит стартовую страницу.
   * @param {GesteresisApp} app — для доступа к state (если залогинен — см. CTA)
   */
  render(app) {
    const container = document.getElementById('view-landing');
    if (!container) return;

    const isAuthed = !!(app && app.state && app.state.user);

    container.innerHTML = `
      ${this._renderHero(isAuthed)}
      ${this._renderAbout()}
      ${this._renderCompany()}
      ${this._renderScreenshots()}
      ${this._renderPricing()}
      ${this._renderFinalCta(isAuthed)}
    `;

    this._bind(container);
  },

  // ==========================================================================
  // СЕКЦИИ
  // ==========================================================================

  _renderHero(isAuthed) {
    const h = LANDING_CONTENT.hero;
    return `
      <section class="relative overflow-hidden bg-bg-surface border border-border-subtle rounded-card">
        <!-- Декоративный градиент -->
        <div class="absolute inset-0 pointer-events-none opacity-30"
             style="background: radial-gradient(circle at 20% 0%, var(--color-accent-primary) 0%, transparent 45%);"></div>

        <div class="relative px-6 sm:px-10 py-12 sm:py-16 max-w-4xl mx-auto text-center space-y-6">
          <span class="inline-block px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-accent/10 text-accent border border-accent/30">
            ${Html.escape(h.badge)}
          </span>

          <h1 class="text-3xl sm:text-5xl font-bold text-text-primary leading-tight">
            ${h.title}
          </h1>

          <p class="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            ${h.subtitle}
          </p>

          <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a href="${isAuthed ? '#/dashboard' : h.primaryCta.href}"
               class="px-5 py-3 rounded-xl text-sm font-semibold bg-accent text-bg-canvas hover:opacity-90 shadow-lg transition">
              ${isAuthed ? 'Перейти в систему' : h.primaryCta.label}
            </a>
            <a href="${h.secondaryCta.href}"
               class="px-5 py-3 rounded-xl text-sm font-semibold bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle transition">
              ${h.secondaryCta.label}
            </a>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
            ${h.stats.map(s => `
              <div class="p-3 rounded-xl bg-bg-canvas/70 border border-border-subtle">
                <div class="font-mono text-xl sm:text-2xl font-bold text-accent">${Html.escape(s.value)}</div>
                <div class="text-[11px] text-text-secondary mt-0.5">${Html.escape(s.label)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  _renderAbout() {
    const a = LANDING_CONTENT.about;
    return `
      <section id="landing-about" class="space-y-6">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(a.title)}</h2>
          <p class="text-sm sm:text-base text-text-secondary">${Html.escape(a.subtitle)}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${a.cards.map(card => `
            <div class="bg-bg-surface border border-border-subtle rounded-card p-6 space-y-3 hover:border-accent/40 transition">
              <div class="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
                ${this._icon(card.icon)}
              </div>
              <h3 class="text-base font-bold text-text-primary">${Html.escape(card.title)}</h3>
              <p class="text-sm text-text-secondary leading-relaxed">${card.text}</p>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  _renderCompany() {
    const c = LANDING_CONTENT.company;
    return `
      <section class="bg-bg-surface border border-border-subtle rounded-card p-6 sm:p-10">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div class="space-y-4">
            <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(c.title)}</h2>
            <p class="text-sm text-text-secondary leading-relaxed">${Html.escape(c.subtitle)}</p>
            <p class="text-sm text-text-secondary leading-relaxed">${Html.escape(c.text)}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${c.facts.map(f => `
              <div class="p-4 rounded-xl bg-bg-canvas border border-border-subtle">
                <div class="text-[10px] font-mono uppercase tracking-wider text-text-muted">${Html.escape(f.label)}</div>
                <div class="text-sm font-semibold text-text-primary mt-1">${Html.escape(f.value)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  _renderScreenshots() {
    const s = LANDING_CONTENT.screenshots;
    return `
      <section class="space-y-6">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(s.title)}</h2>
          <p class="text-sm sm:text-base text-text-secondary">${s.subtitle}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${s.items.map(item => `
            <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden flex flex-col">
              ${this._renderScreenshotPlaceholder(item)}
              <div class="p-4 space-y-1">
                <h3 class="text-sm font-bold text-text-primary">${Html.escape(item.title)}</h3>
                <p class="text-xs text-text-secondary">${Html.escape(item.description)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  /**
   * Плейсхолдер скриншота. Когда появятся реальные картинки —
   * заменить на `<img src="assets/screenshots/dashboard.png" alt="...">`.
   * @private
   */
  _renderScreenshotPlaceholder(item) {
    return `
      <div class="aspect-[16/10] bg-bg-canvas border-b border-border-subtle flex items-center justify-center relative overflow-hidden">
        <!-- Сетка-фон -->
        <div class="absolute inset-0 opacity-20"
             style="background-image: linear-gradient(var(--color-border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-subtle) 1px, transparent 1px); background-size: 24px 24px;"></div>
        <div class="relative flex flex-col items-center gap-2 text-text-muted">
          <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
          </svg>
          <span class="text-[10px] font-mono uppercase tracking-wider">${Html.escape(item.placeholder)}.png</span>
        </div>
      </div>
    `;
  },

  _renderPricing() {
    const p = LANDING_CONTENT.pricing;
    return `
      <section id="landing-pricing" class="space-y-6">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(p.title)}</h2>
          <p class="text-sm sm:text-base text-text-secondary">${Html.escape(p.subtitle)}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${p.plans.map(plan => `
            <div class="bg-bg-surface border ${plan.highlighted ? 'border-accent/60 shadow-lg shadow-accent/10' : 'border-border-subtle'} rounded-card p-6 flex flex-col space-y-4">
              ${plan.highlighted ? `<span class="self-start px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-accent/15 text-accent border border-accent/40">Популярный</span>` : ''}
              <div>
                <h3 class="text-lg font-bold text-text-primary">${Html.escape(plan.name)}</h3>
                <div class="mt-2 flex items-baseline gap-1">
                  <span class="text-2xl font-bold text-accent font-mono">${Html.escape(plan.price)}</span>
                  <span class="text-xs text-text-muted">${Html.escape(plan.period)}</span>
                </div>
              </div>
              <ul class="space-y-2 text-sm text-text-secondary flex-1">
                ${plan.features.map(f => `
                  <li class="flex items-start gap-2">
                    <svg class="w-4 h-4 text-status-ok flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span>${Html.escape(f)}</span>
                  </li>
                `).join('')}
              </ul>
              <button type="button" data-modal-trigger="${p.cta.modal}"
                class="w-full py-2.5 rounded-xl text-xs font-semibold ${plan.highlighted ? 'bg-accent text-bg-canvas hover:opacity-90' : 'bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle'} transition cursor-pointer">
                ${Html.escape(p.cta.label)}
              </button>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  _renderFinalCta(isAuthed) {
    const f = LANDING_CONTENT.finalCta;
    return `
      <section class="bg-gradient-to-br from-accent/15 to-status-warn/10 border border-accent/40 rounded-card p-8 sm:p-12 text-center space-y-4">
        <h2 class="text-2xl sm:text-3xl font-bold text-text-primary">${Html.escape(f.title)}</h2>
        <p class="text-sm sm:text-base text-text-secondary max-w-xl mx-auto">${Html.escape(f.subtitle)}</p>
        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a href="${isAuthed ? '#/dashboard' : f.primary.href}"
             class="px-5 py-3 rounded-xl text-sm font-semibold bg-accent text-bg-canvas hover:opacity-90 shadow-lg transition">
            ${isAuthed ? 'Перейти в систему' : f.primary.label}
          </a>
          <a href="${f.secondary.href}"
             class="px-5 py-3 rounded-xl text-sm font-semibold bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle transition">
            ${f.secondary.label}
          </a>
        </div>
      </section>
    `;
  },

  // ==========================================================================
  // ПРИВЯЗКА И ИКОНКИ
  // ==========================================================================

_bind(container) {
  // Кнопки, открывающие модалки (например, «Оформить подписку»)
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
      window.modalManager?.open(id);
    });
  });

  // Скролл-кнопки — ищем по всему документу, т.к. они могут быть в шапке
  document.querySelectorAll('[data-scroll-to]').forEach((btn) => {
    // Защита от двойной привязки: если уже привязано — пропускаем
    if (btn.dataset.scrollBound === '1') return;
    btn.dataset.scrollBound = '1';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-scroll-to');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
},

  /**
   * SVG-иконки по ключу (без внешних библиотек).
   * @private
   */
  _icon(key) {
    const common = 'class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"';
    const icons = {
      chip: `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
      chart: `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>`,
      shield: `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>`,
      cloud: `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"/></svg>`,
    };
    return icons[key] || icons.chip;
  },
};

window.Landing = Landing;
