/**
 * ============================================================================
 * GESTERESIS — SPA Router (js/router.js)
 * ============================================================================
 * Отвечает за:
 *  - Обработку hashchange и переходы между view
 *  - Реестр маршрутов (легко добавить #/account, #/ota и т.д.)
 *  - Рендеринг дашборда (сетка карточек)
 *  - Управление видимостью view-секций и глобальным лоадером
 *  - Бейдж режима бэкенда (MOCK / API)
 *
 * Раньше логика жила в GesteresisApp._handleRoute / _renderDashboard /
 * _showLoader / _updateBackendModeBadge.
 *
 * Зависимости:
 *  - js/utils/html.js               -> Html.escape
 *  - js/components/kpi-bar.js       -> KpiBar.update
 *  - js/components/device-card.js   -> DeviceCard.build, DeviceCard.bind
 *  - js/components/device-detail.js -> DeviceDetail.render
 *  - js/chart.js                    -> TelemetryChartRenderer.draw
 *
 * Подключается ДО app.js (после device-detail.js).
 * Доступ через window.Router.
 * ============================================================================
 */

const Router = {
  /**
   * Реестр маршрутов. Порядок важен: первый match выигрывает.
   *
   * pattern — RegExp, применяется к location.hash (например '#/device/unit_001')
   * view    — data-view в index.html
   * render  — функция (app, ...capturedParams), которая рендерит страницу
   *
   * Будущие маршруты:
   *   { pattern: /^#\/account$/, view: 'account', render: (app) => Account.render(app) },
   *   { pattern: /^#\/ota$/,     view: 'ota',     render: (app) => Ota.render(app) },
   */
  routes: [],
  _routePromise: null,
  _preloaderShownAt: 0,

  // Тайминги прелоадера (мс). Увеличены, чтобы анимация была заметна.
  PRELOADER_MIN_VISIBLE_MS: 800,   // минимум на экране (даже если загрузка мгновенная)
  PRELOADER_HIDE_DELAY_MS: 300,    // задержка после готовности данных перед fade-out
  PRELOADER_FADE_MS: 200,          // длительность fade-out (должно совпадать с CSS)

  /**
   * @param {GesteresisApp} app
   */
  init(app) {
    this.app = app;

    // Дефолтные маршруты
    this.routes = [
      {
        pattern: /^#\/device\/([^/]+)$/,
        view: 'device-detail',
        render: (app, deviceId) => this._renderDeviceDetail(app, deviceId),
      },
      {
        pattern: /^#\/legal\/([^/]+)$/,
        view: 'legal',
        render: (app, pageKey) => this._renderLegal(app, pageKey),
      },
      {
        pattern: /^#\/profile$/,
        view: 'profile',
        render: (app) => this._renderProfile(app),
      },
      {
        pattern: /^#\/dashboard$/,
        view: 'dashboard',
        render: (app) => this._renderDashboard(app),
      },
      {
        pattern: /^#\/?$/,           // ← корень сайта = лендинг
        view: 'landing',
        render: (app) => this._renderLanding(app),
      },
    ];

    // Подписка на hashchange
    window.addEventListener('hashchange', () => this.handleRoute());

    // Первичный рендер
    this.handleRoute();
  },

    /**
   * Главный обработчик роутинга. Асинхронный: показывает прелоадер,
   * переключает view с анимацией, скрывает прелоадер.
   *
   * Сделаем последовательным (не параллельным), чтобы переходы не накладывались:
   * если пользователь кликает быстро, каждый новый hashchange отменяет предыдущий.
   */
  async handleRoute() {
    const hash = window.location.hash || '#/';

    // Отменяем предыдущий переход, если он ещё в процессе
    if (this._routePromise) {
      this._routePromise.cancelled = true;
    }
    const currentPromise = { cancelled: false };
    this._routePromise = currentPromise;

    let matchedRoute = null;
    let matchedParams = [];

    for (const route of this.routes) {
      const match = hash.match(route.pattern);
      if (match) {
        matchedRoute = route;
        matchedParams = match.slice(1).map(p => decodeURIComponent(p));
        break;
      }
    }

    // Fallback
    if (!matchedRoute) {
      matchedRoute = { view: 'dashboard', render: () => this._renderDashboard(this.app) };
    }

    this._showLoadingBar();

    const preloader = document.getElementById('app-preloader');
    const alreadyVisible = preloader && !preloader.classList.contains('is-hidden');

    let loaderTimer = null;
    if (!alreadyVisible) {
      loaderTimer = setTimeout(() => {
        if (!currentPromise.cancelled) this.showPreloader();
      }, 150);
    }

    try {
      // 1. Анимированно скрываем текущую view
      await this._showView(matchedRoute.view);

      if (currentPromise.cancelled) return;

      // 2. Сбрасываем скролл в начало — ДО рендера,
      //    чтобы новая страница появилась с самого верха
      this._scrollToTop();

      // 3. Рендерим новую view
      matchedRoute.render(this.app, ...matchedParams);

      // Даём браузеру кадр на отрисовку — тогда DOM уже обновлён,
      // и следующий кадр анимации будет плавным
      await new Promise(r => requestAnimationFrame(() => r()));
    } finally {
      if (loaderTimer) clearTimeout(loaderTimer);

      if (!currentPromise.cancelled) {
        // hidePreloader теперь async — не блокируем handleRoute,
        // но и не забываем про необработанный Promise
        this.hidePreloader().catch(() => {});
        setTimeout(() => this._hideLoadingBar(), 100);
      }
    }
  },

  // -------------------- VIEW-ПЕРЕКЛЮЧЕНИЕ --------------------

  /**
   * Анимированно переключает view.
   * @param {string} viewName
   * @returns {Promise<void>}
   */
  async _showView(viewName) {
    const allViews = Array.from(document.querySelectorAll('[data-view]'));
    const target = allViews.find(el => el.dataset.view === viewName);
    const current = allViews.find(el => !el.classList.contains('hidden'));

    // Если уже на этой view — ничего не делаем
    if (current === target && target) return;

    const duration = this._getTransitionDuration();

    // 1. Уводим текущую view (fade-out)
    if (current) {
      current.classList.add('view-leave');
    }

    // 2. Сразу убираем .hidden у целевой, чтобы она участвовала в layout
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('view-enter');
    }

    // 3. Ждём окончания анимации ухода
    if (duration > 0 && current) {
      await new Promise(r => setTimeout(r, duration));
    }

    // 4. Прячем все остальные view и снимаем классы анимации
    allViews.forEach(el => {
      if (el === target) {
        el.classList.remove('view-enter');
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
        el.classList.remove('view-leave');
        el.classList.remove('view-enter');
      }
    });

    // 5. Обновляем шапку
    this._updateHeaderForView(viewName);
  },

  /**
   * Длительность перехода в мс. Учитывает prefers-reduced-motion.
   * @private
   */
  _getTransitionDuration() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 0;
    }
    return 220; // должно совпадать с --anim-view-ms в style.css
  },

  /**
   * Адаптирует шапку под текущую страницу.
   * На лендинге скрываем плашку подписки и кнопку LIVE — они нужны только
   * в рабочем интерфейсе инженера.
   * @private
   */
  _updateHeaderForView(viewName) {
    const isLanding = viewName === 'landing';

    const subscriptionBlock = document.getElementById('header-subscription-block');
    if (subscriptionBlock) {
      subscriptionBlock.classList.toggle('hidden', isLanding);
    }

    const streamBlock = document.getElementById('header-stream-block');
    if (streamBlock) {
      streamBlock.classList.toggle('hidden', isLanding);
    }

    // Навигация лендинга: visible только на лендинге
    const landingNav = document.getElementById('header-landing-nav');
    if (landingNav) {
      landingNav.classList.toggle('hidden', !isLanding);
      landingNav.classList.toggle('flex', isLanding);
    }
  },

  /**
   * Прокручивает страницу в начало.
   * Использует 'instant' (не smooth), чтобы не было «прыжка» анимации
   * при смене страницы. Smooth-скролл оставляем только для якорей
   * (data-scroll-to), а не для навигации.
   *
   * @private
   */
  _scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  },

  // -------------------- ЛОАДЕР И БЕЙДЖ --------------------

  /**
   * Показывает / прячет глобальный лоадер.
   */
  showLoader(show) {
    const loader = document.getElementById('global-loader');
    const dash = document.getElementById('view-dashboard');
    if (show) {
      loader?.classList.remove('hidden');
      dash?.classList.add('hidden');
    } else {
      loader?.classList.add('hidden');
    }
  },

  /**
   * Обновляет бейдж режима бэкенда (MOCK / API).
   */
  updateBackendModeBadge() {
    const badge = document.getElementById('backend-mode-badge');
    if (!badge) return;

    if (APP_CONFIG.USE_MOCK_DATA) {
      badge.textContent = 'MODE: MOCK_STREAM (READY FOR BACKEND)';
      badge.className = 'px-2.5 py-1.5 rounded-lg text-xs font-mono bg-bg-surface border border-border-subtle text-text-secondary';
    } else {
      badge.textContent = `API: ${APP_CONFIG.API_BASE_URL}`;
      badge.className = 'px-2.5 py-1.5 rounded-lg text-xs font-mono bg-status-ok/10 border border-status-ok/40 text-status-ok';
    }
  },

  // -------------------- РЕНДЕР ДАШБОРДА --------------------

  /**
   * Рендерит дашборд: KPI, сетка карточек, обработчики.
   * @private
   */
  _renderDashboard(app) {
    // KPI
    if (window.KpiBar) window.KpiBar.update(app.state.devices);

    const grid = document.getElementById('devices-grid');
    if (!grid) return;

    // Пустое состояние
    if (app.state.devices.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full bg-bg-surface/70 border border-dashed border-border-strong rounded-card p-10 text-center">
          <p class="text-text-primary font-medium">Нет подключённых чипов ESP32-S3</p>
          <p class="text-xs text-text-muted mt-1">Нажмите «+ Добавить чип», чтобы зарегистрировать узел в системе</p>
        </div>
      `;
      return;
    }

    // Сетка карточек
    if (!window.DeviceCard) return;
    grid.innerHTML = app.state.devices.map(dev => window.DeviceCard.build(dev)).join('');

    // Привязка обработчиков к каждой карточке
    app.state.devices.forEach((dev) => {
      const card = document.getElementById(`card-${dev.id}`);
      window.DeviceCard.bind(card, dev, {
        initialHoverIndex: app.state.hoverIndices[dev.id] ?? null,
        onSettings: (id) => app.openDeviceSettingsModal(id),
        onDetails: (id) => {
          window.location.hash = `#/device/${encodeURIComponent(id)}`;
        },
        onHover: (id, idx) => {
          app.state.hoverIndices[id] = idx;
          const dev2 = app.state.devices.find(d => d.id === id);
          const canvas = document.getElementById(`canvas-${id}`);
          if (dev2 && canvas) {
            window.TelemetryChartRenderer.draw(canvas, dev2, idx);
          }
        },
        onHoverEnd: (id) => {
          app.state.hoverIndices[id] = null;
          const dev2 = app.state.devices.find(d => d.id === id);
          const canvas = document.getElementById(`canvas-${id}`);
          if (dev2 && canvas) {
            window.TelemetryChartRenderer.draw(canvas, dev2, null);
          }
        },
      });
    });
  },

  // -------------------- РЕНДЕР ДЕТАЛЬНОЙ СТРАНИЦЫ --------------------

  /**
   * @private
   */
  _renderDeviceDetail(app, deviceId) {
    const dev = app.state.devices.find(d => d.id === deviceId);
    if (window.DeviceDetail) {
      window.DeviceDetail.render(dev, deviceId, {
        onOpenSettings: (id) => app.openDeviceSettingsModal(id),
      });
    }
  },
  /**
  * @private
  */
  _renderLegal(app, pageKey) {
    if (window.Legal) {
      window.Legal.render(pageKey);
    }
  },
  /**
   * @private
   */
  _renderProfile(app) {
    if (window.Profile) {
      window.Profile.render(app);
    }
  },
  /**
   * @private
   */
  _renderLanding(app) {
    if (window.Landing) {
      window.Landing.render(app);
    }
  },

  // -------------------- ПРЕЛОАДЕР И ПОЛОСА ЗАГРУЗКИ --------------------

  showPreloader() {
    let el = document.getElementById('app-preloader');
    if (!el) {
      el = this._createPreloader();
      document.body.appendChild(el);
    }
    el.classList.remove('is-hidden');
    this._preloaderShownAt = Date.now();
  },

  /**
   * Скрывает прелоадер, но не раньше, чем через PRELOADER_MIN_VISIBLE_MS
   * после показа. Возвращает Promise, который резолвится, когда прелоадер
   * полностью исчез (после fade-out).
   */
  async hidePreloader() {
    const el = document.getElementById('app-preloader');
    if (!el) return;

    const elapsed = Date.now() - this._preloaderShownAt;
    const remaining = Math.max(0, this.PRELOADER_MIN_VISIBLE_MS - elapsed);

    if (remaining > 0) {
      await new Promise(r => setTimeout(r, remaining));
    }

    if (this.PRELOADER_HIDE_DELAY_MS > 0) {
      await new Promise(r => setTimeout(r, this.PRELOADER_HIDE_DELAY_MS));
    }

    el.classList.add('is-hidden');

    await new Promise(r => setTimeout(r, this.PRELOADER_FADE_MS));
  },

  /**
   * Создаёт DOM прелоадера.
   * @private
   */
  _createPreloader() {
    const el = document.createElement('div');
    el.id = 'app-preloader';
    el.innerHTML = `
      <div class="preloader-logo">
        <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 12h1.5l1-3 2 6 1-3H15"/>
        </svg>
      </div>
      <div class="preloader-spinner"></div>
      <div class="preloader-text">Загрузка Gesteresis…</div>
    `;
    return el;
  },

  /**
   * Показывает тонкую полосу загрузки сверху.
   * @private
   */
  _showLoadingBar() {
    let el = document.getElementById('app-loading-bar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-loading-bar';
      document.body.appendChild(el);
    }
    el.classList.remove('is-hidden');
  },

  /**
   * Скрывает полосу загрузки.
   * @private
   */
  _hideLoadingBar() {
    const el = document.getElementById('app-loading-bar');
    if (el) el.classList.add('is-hidden');
  },
};


window.Router = Router;
