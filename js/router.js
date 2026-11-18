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
        pattern: /^#\/?$/,
        view: 'dashboard',
        render: (app) => this._renderDashboard(app),
      },
    ];

    // Подписка на hashchange
    window.addEventListener('hashchange', () => this.handleRoute());

    // Первичный рендер
    this.handleRoute();
  },

  /**
   * Главный обработчик роутинга. Вызывается при старте и каждом hashchange.
   */
  handleRoute() {
    const hash = window.location.hash || '#/';

    for (const route of this.routes) {
      const match = hash.match(route.pattern);
      if (match) {
        this._showView(route.view);
        const params = match.slice(1).map(p => decodeURIComponent(p));
        route.render(this.app, ...params);
        return;
      }
    }

    // Fallback: неизвестный маршрут → дашборд
    this._showView('dashboard');
    this._renderDashboard(this.app);
  },

  // -------------------- VIEW-ПЕРЕКЛЮЧЕНИЕ --------------------

  /**
   * Показывает одну view-секцию, остальные прячет.
   * Ищет по `data-view` в index.html.
   * @private
   */
  _showView(viewName) {
    document.querySelectorAll('[data-view]').forEach((el) => {
      el.classList.toggle('hidden', el.dataset.view !== viewName);
    });
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
};


window.Router = Router;
