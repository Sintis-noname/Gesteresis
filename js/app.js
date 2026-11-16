/**
 * ============================================================================
 * GESTERESIS — Application Controller (js/app.js)
 * ============================================================================
 * Отвечает за:
 *  - SPA-роутинг (#/ дашборд, #/device/{id} детальная страница)
 *  - Рендеринг KPI, карточек чипов, страницы детальной диагностики
 *  - Модальные окна (настройки чипа, подписка, авторизация, добавление чипа)
 *  - Обработку форм и отправку MQTT-команд через ApiService
 *  - Toast-уведомления
 *
 * Зависимости (должны быть подключены до этого файла):
 *  - js/config.js  -> window.APP_CONFIG, FAULT_CODES, FEATURE_SCHEMA_X12, decodeFaultMask()
 *  - js/api.js     -> class ApiService
 *  - js/chart.js   -> class TelemetryChartRenderer
 */

class GesteresisApp {
  constructor() {
    this.api = new ApiService(APP_CONFIG);
    this.state = {
      user: null,
      subscription: null,
      devices: [],
      isStreaming: true,
      activeSettingsDeviceId: null,
      hoverIndices: {}, // { [deviceId]: number | null }
    };
    this.unsubscribeStream = null;
  }

  async init() {
    this._bindGlobalEvents();
    this._showLoader(true);

    try {
      const [user, subscription, devices] = await Promise.all([
        this.api.getCurrentUser(),
        this.api.getSubscription(),
        this.api.getDevices(),
      ]);

      this.state.user = user;
      this.state.subscription = subscription;
      this.state.devices = devices;

      this._renderAuthHeader();
      this._renderSubscriptionHeader();
      this._updateBackendModeBadge();
      this._handleRoute();
      this._startTelemetryStream();
    } catch (err) {
      this.showToast(`Ошибка инициализации: ${err.message}`, 'error');
    } finally {
      this._showLoader(false);
    }
  }

  _showLoader(show) {
    const loader = document.getElementById('global-loader');
    const dash = document.getElementById('view-dashboard');
    if (show) {
      loader.classList.remove('hidden');
      dash.classList.add('hidden');
    } else {
      loader.classList.add('hidden');
    }
  }

  _updateBackendModeBadge() {
    const badge = document.getElementById('backend-mode-badge');
    if (!badge) return;
    if (APP_CONFIG.USE_MOCK_DATA) {
      badge.textContent = 'MODE: MOCK_STREAM (READY FOR BACKEND)';
      badge.className = 'px-2.5 py-1.5 rounded-lg text-xs font-mono bg-bg-surface border border-border-subtle text-text-secondary';
    } else {
      badge.textContent = `API: ${APP_CONFIG.API_BASE_URL}`;
      badge.className = 'px-2.5 py-1.5 rounded-lg text-xs font-mono bg-status-ok/10 border border-status-ok/40 text-status-ok';
    }
  }

  // -------------------- ПОДПИСКА --------------------

  _renderSubscriptionHeader() {
    const sub = this.state.subscription;
    const dateEl = document.getElementById('sub-expiry-date');
    const dotEl = document.getElementById('sub-status-dot');
    if (!sub || !dateEl || !dotEl) return;

    const dt = new Date(sub.expiresAt);
    const formatted = dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    dateEl.textContent = formatted;

    if (sub.isActive) {
      dotEl.className = 'w-2.5 h-2.5 rounded-full bg-status-ok shadow-sm';
      dateEl.className = 'font-mono font-semibold text-status-ok';
    } else {
      dotEl.className = 'w-2.5 h-2.5 rounded-full bg-status-alarm animate-ping';
      dateEl.className = 'font-mono font-semibold text-status-alarm';
      dateEl.textContent = `${formatted} (Истекла!)`;
    }
  }

  // -------------------- АВТОРИЗАЦИЯ --------------------

  _renderAuthHeader() {
    const container = document.getElementById('auth-controls');
    if (!container) return;

    if (this.state.user) {
      container.innerHTML = `
        <div class="hidden md:flex flex-col items-end mr-1">
          <span class="text-xs font-mono font-semibold text-slate-200">${this._escapeHtml(this.state.user.email)}</span>
          <span class="text-[10px] text-slate-400">${this._escapeHtml(this.state.user.company || 'Инженер')}</span>
        </div>
        <button id="btn-logout" type="button"
          class="px-3.5 py-2 rounded-xl text-xs font-medium bg-bg-surface hover:bg-status-alarm/20 hover:text-status-alarm text-text-secondary border border-border-subtle hover:border-status-alarm/40 transition cursor-pointer">
          Выйти
        </button>
      `;
      document.getElementById('btn-logout').addEventListener('click', async () => {
        await this.api.logout();
        this.state.user = null;
        this._renderAuthHeader();
        this.showToast('Вы вышли из учётной записи', 'info');
      });
    } else {
      container.innerHTML = `
        <button type="button" data-modal-trigger="modal-login"
          class="px-3.5 py-2 rounded-xl text-xs font-medium bg-bg-surface hover:bg-bg-elevated text-text-primary border border-border-subtle transition cursor-pointer">
          Войти
        </button>
        <button type="button" data-modal-trigger="modal-register"
          class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent text-bg-canvas hover:opacity-90 shadow-sm transition cursor-pointer">
          Регистрация
        </button>
      `;
      // Триггеры навесит ModalManager.init() — но он уже вызван при старте,
      // поэтому для динамически вставленных кнопок навешиваем вручную:
      container.querySelectorAll('[data-modal-trigger]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-modal-trigger');
          if (window.modalManager) window.modalManager.open(id);
        });
      });
    }
  }
  // -------------------- ПОТОК ТЕЛЕМЕТРИИ --------------------

  _startTelemetryStream() {
    if (this.unsubscribeStream) {
      this.unsubscribeStream();
      this.unsubscribeStream = null;
    }
    if (!this.state.isStreaming) return;

    this.unsubscribeStream = this.api.subscribeTelemetry((updatedDevice) => {
      const idx = this.state.devices.findIndex(d => d.id === updatedDevice.id);
      if (idx !== -1) {
        this.state.devices[idx] = updatedDevice;
      }
      // Обновляем UI без полного пересоздания DOM карточек для плавности графиков
      if (!window.location.hash.startsWith('#/device/')) {
        this._updateKpis();
        this._patchDeviceCard(updatedDevice);
      } else {
        const currentDetailId = decodeURIComponent(window.location.hash.replace('#/device/', ''));
        if (currentDetailId === updatedDevice.id) {
          this._renderDeviceDetailPage(updatedDevice.id);
        }
      }
    });
  }

  // -------------------- SPA РОУТИНГ (DASHBOARD <-> DETAIL STUB) --------------------

  _handleRoute() {
    const hash = window.location.hash || '#/';
    const dashView = document.getElementById('view-dashboard');
    const detailView = document.getElementById('view-device-detail');

    if (hash.startsWith('#/device/')) {
      const deviceId = decodeURIComponent(hash.replace('#/device/', ''));
      dashView.classList.add('hidden');
      detailView.classList.remove('hidden');
      this._renderDeviceDetailPage(deviceId);
    } else {
      detailView.classList.add('hidden');
      dashView.classList.remove('hidden');
      this._renderDashboard();
    }
  }

  // -------------------- РЕНДЕРИНГ ДАШБОРДА И КАРТОЧЕК ЧИПОВ --------------------

  _updateKpis() {
    const devices = this.state.devices;
    const total = devices.length;
    const ok = devices.filter(d => d.telemetry.status === 'OK' && d.telemetry.fault_code === 0).length;
    const alarm = devices.filter(d => d.telemetry.status === 'ALARM').length;
    const warn = devices.filter(
      d => d.telemetry.status === 'CALIBRATING' || d.telemetry.status === 'SENSOR_FAULT' || d.telemetry.status === 'OFFLINE' || d.telemetry.fault_code !== 0
    ).length;

    const elTotal = document.getElementById('kpi-total');
    const elOk = document.getElementById('kpi-ok');
    const elAlarm = document.getElementById('kpi-alarm');
    const elWarn = document.getElementById('kpi-warn');
    if (elTotal) elTotal.textContent = total;
    if (elOk) elOk.textContent = ok;
    if (elAlarm) elAlarm.textContent = alarm;
    if (elWarn) elWarn.textContent = warn;
  }

  _getStatusBadgeHtml(status) {
    const map = {
      OK:           { bg: 'bg-status-ok/15 text-status-ok border-status-ok/40',             dot: 'bg-status-ok', label: 'OK' },
      ALARM:        { bg: 'bg-status-alarm/20 text-status-alarm border-status-alarm/60',     dot: 'bg-status-alarm animate-ping', label: 'ALARM' },
      SENSOR_FAULT: { bg: 'bg-status-alarm/25 text-status-alarm border-status-alarm/70',     dot: 'bg-status-alarm', label: 'SENSOR_FAULT' },
      CALIBRATING:  { bg: 'bg-status-warn/15 text-status-warn border-status-warn/40',        dot: 'bg-status-warn animate-pulse', label: 'CALIBRATING' },
      OFFLINE:      { bg: 'bg-bg-elevated text-text-muted border-border-strong',             dot: 'bg-text-muted', label: 'OFFLINE' },
    };
    const cfg = map[status] || map.OFFLINE;
    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${cfg.bg}">
        <span class="w-2 h-2 rounded-full ${cfg.dot}"></span>
        ${cfg.label}
      </span>
    `;
  }

  _renderFaultBadgesHtml(faultCode) {
    const faults = decodeFaultMask(faultCode);
    if (faults.length === 0) {
      return `<span class="text-[11px] font-mono text-text-muted">fault_code: 0x0000 (NONE)</span>`;
    }
    return faults.map(f => {
      const hex = '0x' + f.mask.toString(16).padStart(4, '0').toUpperCase();
      return `
        <span title="${this._escapeHtml(f.label)}" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-status-warn/15 text-status-warn border border-status-warn/40">
          ⚠ ${hex} ${f.name}
        </span>
      `;
    }).join(' ');
  }

  _renderDashboard() {
    this._updateKpis();
    const grid = document.getElementById('devices-grid');
    if (!grid) return;

    if (this.state.devices.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full bg-slate-900/70 border border-dashed border-slate-700 rounded-2xl p-10 text-center">
          <p class="text-slate-300 font-medium">Нет подключённых чипов ESP32-S3</p>
          <p class="text-xs text-slate-500 mt-1">Нажмите «+ Добавить чип», чтобы зарегистрировать узел в системе</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.state.devices.map(dev => this._buildDeviceCardHtml(dev)).join('');

    // Навешиваем обработчики на кнопки и Canvas для каждой карточки
    this.state.devices.forEach((dev) => {
      const canvas = document.getElementById(`canvas-${dev.id}`);
      TelemetryChartRenderer.draw(canvas, dev, this.state.hoverIndices[dev.id] ?? null);

      // Интерактивный hover по графику
      if (canvas) {
        const handlePointer = (clientX) => {
          const rect = canvas.getBoundingClientRect();
          const relX = clientX - rect.left - 40;
          const plotW = rect.width - 56;
          if (plotW <= 0 || dev.history.length === 0) return;
          const ratio = Math.max(0, Math.min(1, relX / plotW));
          const idx = Math.round(ratio * (dev.history.length - 1));
          this.state.hoverIndices[dev.id] = idx;
          TelemetryChartRenderer.draw(canvas, dev, idx);
        };

        canvas.addEventListener('mousemove', (e) => handlePointer(e.clientX));
        canvas.addEventListener('touchmove', (e) => {
          if (e.touches[0]) handlePointer(e.touches[0].clientX);
        }, { passive: true });
        canvas.addEventListener('mouseleave', () => {
          this.state.hoverIndices[dev.id] = null;
          TelemetryChartRenderer.draw(canvas, dev, null);
        });
      }

      // Кнопка "Настройки" над чипом
      const btnSettings = document.getElementById(`btn-settings-${dev.id}`);
      if (btnSettings) {
        btnSettings.addEventListener('click', () => this.openDeviceSettingsModal(dev.id));
      }

      // Кнопка "Детальная информация" над чипом (переход на новую страницу-заглушку)
      const btnDetails = document.getElementById(`btn-details-${dev.id}`);
      if (btnDetails) {
        btnDetails.addEventListener('click', () => {
          window.location.hash = `#/device/${encodeURIComponent(dev.id)}`;
        });
      }
    });
  }

  _buildDeviceCardHtml(dev) {
    const t = dev.telemetry;
    const isAlarm = t.status === 'ALARM';
    const cardBorder = isAlarm ? 'border-status-alarm/80 alarm-card-pulse' : 'border-border-subtle hover:border-border-strong';
    const lastUpdateStr = new Date(t.ts * 1000).toLocaleTimeString('ru-RU');

    return `
      <article id="card-${dev.id}" class="bg-bg-surface border ${cardBorder} rounded-card overflow-hidden shadow-xl transition flex flex-col">

        <!-- ШАПКА КАРТОЧКИ -->
        <div class="p-4 sm:p-5 bg-bg-canvas/60 border-b border-border-subtle space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-bg-elevated border border-border-subtle font-mono text-xs font-bold text-accent">
                  ${this._escapeHtml(dev.id)}
                </span>
                <span class="text-[11px] font-mono text-text-secondary">fw v${this._escapeHtml(t.fw)}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-bg-elevated text-text-secondary border border-border-subtle">
                  Model: ${this._escapeHtml(dev.model_source)}
                </span>
              </div>
              <h2 id="title-${dev.id}" class="text-base sm:text-lg font-bold text-text-primary leading-snug">
                ${this._escapeHtml(dev.name)}
              </h2>
            </div>

            <div id="status-badge-${dev.id}">
              ${this._getStatusBadgeHtml(t.status)}
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div id="faults-${dev.id}" class="flex flex-wrap items-center gap-1.5">
              ${this._renderFaultBadgesHtml(t.fault_code)}
            </div>

            <div class="flex items-center gap-2 ml-auto">
              <button id="btn-settings-${dev.id}" type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle transition cursor-pointer">
                <svg class="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Настройки</span>
              </button>

              <button id="btn-details-${dev.id}" type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent/15 hover:bg-accent/25 text-accent border border-accent/40 transition cursor-pointer">
                <span>Детальная информация</span>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- МЕТРИКИ -->
        <div class="grid grid-cols-4 divide-x divide-border-subtle border-b border-border-subtle bg-bg-surface/50">
          <div class="p-3 text-center">
            <div class="text-[10px] font-mono uppercase text-text-secondary">D_m (Kalman)</div>
            <div id="metric-dm-filt-${dev.id}" class="mt-0.5 font-mono text-base sm:text-lg font-bold ${isAlarm ? 'text-status-alarm' : 'text-accent'}">
              ${t.d_m_filtered.toFixed(2)}
            </div>
          </div>
          <div class="p-3 text-center">
            <div class="text-[10px] font-mono uppercase text-text-secondary">D_m (Raw)</div>
            <div id="metric-dm-raw-${dev.id}" class="mt-0.5 font-mono text-base sm:text-lg font-semibold text-text-primary">
              ${t.d_m.toFixed(2)}
            </div>
          </div>
          <div class="p-3 text-center">
            <div class="text-[10px] font-mono uppercase text-text-secondary">RMS (X)</div>
            <div id="metric-rms-${dev.id}" class="mt-0.5 font-mono text-base sm:text-lg font-semibold text-text-primary">
              ${t.rms.toFixed(3)} <span class="text-xs text-text-muted">g</span>
            </div>
          </div>
          <div class="p-3 text-center">
            <div class="text-[10px] font-mono uppercase text-text-secondary">Порог / RPM</div>
            <div id="metric-thr-${dev.id}" class="mt-0.5 font-mono text-xs sm:text-sm font-semibold text-text-primary">
              ${dev.threshold.toFixed(1)} <span class="text-text-muted">/</span> ${dev.nominal_rpm}
            </div>
          </div>
        </div>

        <!-- ГРАФИК -->
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2 text-[11px] font-mono">
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center gap-1.5 text-accent">
                <span class="w-3 h-0.5 bg-accent inline-block"></span> d_m_filtered (Калман)
              </span>
              <span class="inline-flex items-center gap-1.5 text-accent/70">
                <span class="w-3 h-0.5 bg-accent/50 inline-block"></span> d_m (сырой)
              </span>
              <span class="inline-flex items-center gap-1.5 text-status-alarm">
                <span class="w-3 h-0.5 border-t border-dashed border-status-alarm inline-block"></span> threshold
              </span>
            </div>
            <span id="ts-${dev.id}" class="text-text-muted">Обновлено: ${lastUpdateStr}</span>
          </div>

          <div class="relative w-full h-[190px] bg-bg-canvas/70 rounded-xl border border-border-subtle overflow-hidden">
            <canvas id="canvas-${dev.id}" class="w-full h-full block cursor-crosshair"></canvas>
          </div>
        </div>

      </article>
    `;
  }

  _patchDeviceCard(dev) {
    const t = dev.telemetry;
    const isAlarm = t.status === 'ALARM';
    const card = document.getElementById(`card-${dev.id}`);
    if (!card) {
      this._renderDashboard();
      return;
    }

    card.className = `bg-bg-surface border ${isAlarm ? 'border-status-alarm/80 alarm-card-pulse' : 'border-border-subtle hover:border-border-strong'} rounded-card overflow-hidden shadow-xl transition flex flex-col`;

    const statusEl = document.getElementById(`status-badge-${dev.id}`);
    if (statusEl) statusEl.innerHTML = this._getStatusBadgeHtml(t.status);

    const faultsEl = document.getElementById(`faults-${dev.id}`);
    if (faultsEl) faultsEl.innerHTML = this._renderFaultBadgesHtml(t.fault_code);

    const dmFiltEl = document.getElementById(`metric-dm-filt-${dev.id}`);
    if (dmFiltEl) {
      dmFiltEl.textContent = t.d_m_filtered.toFixed(2);
      dmFiltEl.className = `mt-0.5 font-mono text-base sm:text-lg font-bold ${isAlarm ? 'text-status-alarm' : 'text-accent'}`;
    }

    const dmRawEl = document.getElementById(`metric-dm-raw-${dev.id}`);
    if (dmRawEl) dmRawEl.textContent = t.d_m.toFixed(2);

    const rmsEl = document.getElementById(`metric-rms-${dev.id}`);
    if (rmsEl) rmsEl.innerHTML = `${t.rms.toFixed(3)} <span class="text-xs text-text-muted">g</span>`;

    const thrEl = document.getElementById(`metric-thr-${dev.id}`);
    if (thrEl) thrEl.innerHTML = `${dev.threshold.toFixed(1)} <span class="text-text-muted">/</span> ${dev.nominal_rpm}`;

    const tsEl = document.getElementById(`ts-${dev.id}`);
    if (tsEl) tsEl.textContent = `Обновлено: ${new Date(t.ts * 1000).toLocaleTimeString('ru-RU')}`;

    const canvas = document.getElementById(`canvas-${dev.id}`);
    TelemetryChartRenderer.draw(canvas, dev, this.state.hoverIndices[dev.id] ?? null);
  }

  // -------------------- СТРАНИЦА ДЕТАЛЬНОЙ ИНФОРМАЦИИ (ЗАГЛУШКА) --------------------

  _renderDeviceDetailPage(deviceId) {
    const container = document.getElementById('view-device-detail');
    if (!container) return;
    const dev = this.state.devices.find(d => d.id === deviceId);

    if (!dev) {
      container.innerHTML = `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <h2 class="text-lg font-bold text-rose-400">Устройство "${this._escapeHtml(deviceId)}" не найдено</h2>
          <a href="#/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-white">
            ← Назад к дашборду
          </a>
        </div>
      `;
      return;
    }

    const t = dev.telemetry;

    container.innerHTML = `
      <!-- Навигация назад и заголовок узла -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div class="flex items-center gap-4">
          <a href="#/" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
            ← Назад к дашборду
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 font-mono text-xs font-bold text-cyan-400">${this._escapeHtml(dev.id)}</span>
              <span class="text-xs font-mono text-slate-400">Прошивка: v${this._escapeHtml(t.fw)}</span>
            </div>
            <h1 class="text-lg sm:text-xl font-bold text-white mt-0.5">${this._escapeHtml(dev.name)}</h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          ${this._getStatusBadgeHtml(t.status)}
          <button id="detail-open-settings" type="button" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition cursor-pointer">
            Настройки чипа
          </button>
        </div>
      </div>

      <!-- Баннер-заглушка для подключения детального API -->
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-start gap-3">
          <span class="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">API STUB</span>
          <div class="text-xs sm:text-sm text-amber-100/90">
            <strong>Страница детальной диагностики чипа (заглушка).</strong> Архитектура готова к подключению топиков
            <code class="font-mono text-amber-300">p11/gesteresis/${this._escapeHtml(dev.id)}/raw</code> (режим аудита C) и эндпоинта <code class="font-mono text-amber-300">GET /api/v1/devices/${this._escapeHtml(dev.id)}/model</code>.
          </div>
        </div>
      </div>

      <!-- Сетка: Вектор признаков x[12] + Матрица S⁻¹ (12x12) и NVS CalibrationBlob -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Блок 1: 12-мерный вектор признаков x[12] (interfaces.md §1) -->
        <div class="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-white">Вектор признаков x[12] (float32)</h2>
              <p class="text-xs text-slate-400">Контракт порядка признаков (interfaces.md §1)</p>
            </div>
            <span class="font-mono text-xs text-cyan-400">DIM = 12</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-800 text-[11px] font-mono text-slate-400 bg-slate-950/30">
                  <th class="py-2.5 px-4">#</th>
                  <th class="py-2.5 px-3">Ключ</th>
                  <th class="py-2.5 px-3">Описание</th>
                  <th class="py-2.5 px-4 text-right">Значение (Stub)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-xs font-mono">
                ${FEATURE_SCHEMA_X12.map(f => {
                  const mockVal = f.key === 'rms_x' ? t.rms.toFixed(4) : '— (ожидание /raw)';
                  return `
                    <tr class="hover:bg-slate-800/30">
                      <td class="py-2 px-4 text-slate-500">${f.idx}</td>
                      <td class="py-2 px-3 text-cyan-300 font-semibold">${f.key}</td>
                      <td class="py-2 px-3 font-sans text-slate-300">${f.desc}</td>
                      <td class="py-2 px-4 text-right text-slate-400">${mockVal} <span class="text-slate-600">${f.unit}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Блок 2: CalibrationBlob (644 байта) и матрица S⁻¹ -->
        <div class="space-y-6">
          <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 class="text-sm font-bold text-white">Состояние модели NVS (CalibrationBlob)</h2>
                <p class="text-xs text-slate-400">Namespace: <code class="font-mono text-slate-300">gesteresis</code> • Размер: 644 байта</p>
              </div>
              <span class="px-2 py-0.5 rounded font-mono text-xs bg-slate-800 text-cyan-400 border border-slate-700">
                Source: ${this._escapeHtml(dev.model_source)}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3 font-mono text-xs">
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span class="text-slate-500 block text-[10px]">D_m (Kalman / Raw)</span>
                <span class="text-sm font-bold text-white mt-0.5 block">${t.d_m_filtered.toFixed(3)} / ${t.d_m.toFixed(3)}</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span class="text-slate-500 block text-[10px]">Порог тревоги (threshold)</span>
                <span class="text-sm font-bold text-rose-400 mt-0.5 block">${dev.threshold.toFixed(2)}</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span class="text-slate-500 block text-[10px]">Число обусловленности cond(S)</span>
                <span class="text-sm font-bold text-amber-300 mt-0.5 block">${dev.cond_number ? dev.cond_number.toExponential(2) : '—'}</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span class="text-slate-500 block text-[10px]">Номинал RPM / Magic</span>
                <span class="text-sm font-bold text-slate-200 mt-0.5 block">${dev.nominal_rpm} / 0x47455354</span>
              </div>
            </div>
          </div>

          <!-- Заглушка под матрицу S⁻¹ 12x12 -->
          <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-white">Обратная ковариационная матрица S⁻¹ (12×12)</h2>
              <span class="text-xs font-mono text-slate-400">144 float32</span>
            </div>
            <p class="text-xs text-slate-400">
              Регуляризованная матрица <code class="font-mono text-slate-300">inv(S + λ·I)</code>, загруженная в память ESP32-S3. После подключения бэкенда здесь будет отображаться тепловая карта корреляций.
            </p>
            <div class="grid grid-cols-12 gap-1 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[9px] text-center select-none">
              ${Array.from({ length: 144 }, (_, idx) => {
                const row = Math.floor(idx / 12);
                const col = idx % 12;
                const isDiag = row === col;
                return `<div class="py-1 rounded ${isDiag ? 'bg-cyan-500/25 text-cyan-300 font-bold' : 'bg-slate-900 text-slate-600'}">${isDiag ? '1.0' : '0.0'}</div>`;
              }).join('')}
            </div>
          </div>
        </div>

      </div>
    `;

    document.getElementById('detail-open-settings')?.addEventListener('click', () => {
      this.openDeviceSettingsModal(dev.id);
    });
  }

  // -------------------- МОДАЛЬНЫЕ ОКНА --------------------

  openModal(modalId) {
    if (window.modalManager) window.modalManager.open(modalId);
  }

  closeModal(modalId) {
    if (window.modalManager) window.modalManager.close(modalId);
  }

  openDeviceSettingsModal(deviceId) {
    const dev = this.state.devices.find(d => d.id === deviceId);
    if (!dev) return;

    this.state.activeSettingsDeviceId = deviceId;
    document.getElementById('settings-device-id-badge').textContent = dev.id;
    document.getElementById('settings-topic-id').textContent = dev.id;
    document.getElementById('input-device-name').value = dev.name;
    document.getElementById('input-cmd-threshold').value = dev.threshold;
    document.getElementById('input-cmd-rpm').value = dev.nominal_rpm;
    document.getElementById('settings-cmd-log').textContent = `Подключено к узлу ${dev.id}. Готов к отправке команд в p11/gesteresis/${dev.id}/cmd`;

    this.openModal('modal-settings');
  }

  _appendSettingsLog(obj) {
    const logEl = document.getElementById('settings-cmd-log');
    const time = new Date().toLocaleTimeString('ru-RU');
    logEl.textContent = `[${time}] ${JSON.stringify(obj)}\n` + logEl.textContent;
  }

  // -------------------- ОБРАБОТЧИКИ СОБЫТИЙ --------------------

  _bindGlobalEvents() {
  // Роутинг
  window.addEventListener('hashchange', () => this._handleRoute());

  // Ресайз: перерисовка canvas
  window.addEventListener('resize', () => {
    if (!window.location.hash.startsWith('#/device/')) {
      this.state.devices.forEach(dev => {
        const canvas = document.getElementById(`canvas-${dev.id}`);
        TelemetryChartRenderer.draw(canvas, dev, null);
      });
    }
  });

  // Переключение темы → перерисовать все canvas (chart.js пока на хардкоде,
  // но перерисовка нужна на Шаге 4; здесь — на будущее)
  window.addEventListener('theme:changed', () => {
    if (!window.location.hash.startsWith('#/device/')) {
      this.state.devices.forEach(dev => {
        const canvas = document.getElementById(`canvas-${dev.id}`);
        TelemetryChartRenderer.draw(canvas, dev, this.state.hoverIndices[dev.id] ?? null);
      });
    }
  });

  // Модалки: обработчики [data-modal-trigger], [data-close-modal], фон, Esc
  // уже навешаны в ModalManager.init() (js/theme.js).

  // Переключатель Play / Pause live-потока
  document.getElementById('btn-toggle-stream')?.addEventListener('click', () => {
    this.state.isStreaming = !this.state.isStreaming;
    const dot = document.getElementById('stream-indicator');
    const label = document.getElementById('stream-label');
    if (this.state.isStreaming) {
      dot.className = 'w-2 h-2 rounded-full bg-status-ok animate-ping';
      label.textContent = 'LIVE (5s)';
      this._startTelemetryStream();
      this.showToast('Поток телеметрии (5 сек) возобновлён', 'info');
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-text-muted';
      label.textContent = 'PAUSED';
      if (this.unsubscribeStream) this.unsubscribeStream();
      this.showToast('Обновление графиков поставлено на паузу', 'info');
    }
  });

  // Модальное окно подписки: дата-заполнение при открытии
  document.querySelector('[data-modal-trigger="modal-subscription"]')?.addEventListener('click', () => {
    const dt = this.state.subscription
      ? new Date(this.state.subscription.expiresAt).toLocaleDateString('ru-RU')
      : '—';
    const el = document.getElementById('modal-sub-current-date');
    if (el) el.textContent = dt;
  });

  // Кнопка «Оплатить» внутри модалки подписки
  document.getElementById('btn-confirm-payment')?.addEventListener('click', async () => {
    const selected = document.querySelector('input[name="sub_plan"]:checked');
    const planId = selected ? selected.value : 'plan_1m';
    const btn = document.getElementById('btn-confirm-payment');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Обработка платежа...';

    try {
      const updatedSub = await this.api.createPaymentSession(planId);
      this.state.subscription = updatedSub;
      this._renderSubscriptionHeader();
      this.closeModal('modal-subscription');
      const newDateStr = new Date(updatedSub.expiresAt).toLocaleDateString('ru-RU');
      this.showToast(`Подписка успешно продлена до ${newDateStr}`, 'success');
    } catch (err) {
      this.showToast(`Ошибка оплаты: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  // Переключение между логином и регистрацией — уже через data-modal-trigger
  // в HTML, дополнительных обработчиков не нужно.

  // Форма логина
  document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    errBox.classList.add('hidden');
    try {
      this.state.user = await this.api.login(email, pass);
      this._renderAuthHeader();
      this.closeModal('modal-login');
      this.showToast(`Добро пожаловать, ${email}`, 'success');
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  });

  // Форма регистрации
  document.getElementById('form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const company = document.getElementById('reg-company').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const errBox = document.getElementById('register-error');
    errBox.classList.add('hidden');
    try {
      this.state.user = await this.api.register(email, pass, company);
      this._renderAuthHeader();
      this.closeModal('modal-register');
      this.showToast('Аккаунт предприятия успешно создан', 'success');
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  });

  // Добавление нового чипа (открытие — через data-modal-trigger в HTML)
  document.getElementById('form-add-chip')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('new-chip-id').value.trim();
    const name = document.getElementById('new-chip-name').value.trim();
    const nominal_rpm = document.getElementById('new-chip-rpm').value;
    const threshold = document.getElementById('new-chip-threshold').value;
    try {
      await this.api.addDevice({ id, name, nominal_rpm, threshold });
      this.closeModal('modal-add-chip');
      e.target.reset();
      this._renderDashboard();
      this.showToast(`Узел ${id} добавлен в мониторинг`, 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  });

  // Формы внутри модалки настроек чипа
  document.getElementById('form-device-meta')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = this.state.activeSettingsDeviceId;
    const name = document.getElementById('input-device-name').value.trim();
    try {
      await this.api.updateDeviceMeta(id, { name });
      const titleEl = document.getElementById(`title-${id}`);
      if (titleEl) titleEl.textContent = name;
      this.showToast('Название узла обновлено', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  });

  document.getElementById('form-cmd-threshold')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = this.state.activeSettingsDeviceId;
    const threshold = parseFloat(document.getElementById('input-cmd-threshold').value);
    try {
      const ack = await this.api.sendCommand(id, 'SET_THRESHOLD', { threshold });
      this._appendSettingsLog(ack);
      const dev = this.state.devices.find(d => d.id === id);
      if (dev) this._patchDeviceCard(dev);
      this._updateKpis();
      this.showToast(`Порог D_m = ${threshold} отправлен на ${id}`, 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  });

  document.getElementById('form-cmd-rpm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = this.state.activeSettingsDeviceId;
    const nominal_rpm = parseInt(document.getElementById('input-cmd-rpm').value, 10);
    try {
      const ack = await this.api.sendCommand(id, 'SET_RPM', { nominal_rpm });
      this._appendSettingsLog(ack);
      const dev = this.state.devices.find(d => d.id === id);
      if (dev) this._patchDeviceCard(dev);
      this.showToast(`Номинал RPM = ${nominal_rpm} отправлен на ${id}`, 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  });

  document.getElementById('form-cmd-calibrate')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = this.state.activeSettingsDeviceId;
    const duration_s = parseInt(document.getElementById('input-calib-duration').value, 10);
    try {
      const ack = await this.api.sendCommand(id, 'CALIBRATE', { duration_s });
      this._appendSettingsLog(ack);
      const dev = this.state.devices.find(d => d.id === id);
      if (dev) this._patchDeviceCard(dev);
      this._updateKpis();
      this.showToast(`Команда CALIBRATE (${duration_s}с) отправлена на ${id}`, 'info');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-cmd-clear-fault')?.addEventListener('click', async () => {
    const id = this.state.activeSettingsDeviceId;
    try {
      const ack = await this.api.sendCommand(id, 'CLEAR_FAULT', {});
      this._appendSettingsLog(ack);
      const dev = this.state.devices.find(d => d.id === id);
      if (dev) this._patchDeviceCard(dev);
      this._updateKpis();
      this.showToast(`Ошибка сброшена (CLEAR_FAULT) на ${id}`, 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-cmd-reset')?.addEventListener('click', async () => {
    const id = this.state.activeSettingsDeviceId;
    try {
      const ack = await this.api.sendCommand(id, 'RESET', {});
      this._appendSettingsLog(ack);
      const dev = this.state.devices.find(d => d.id === id);
      if (dev) this._patchDeviceCard(dev);
      this._updateKpis();
      this.showToast(`Команда RESET отправлена на ${id}`, 'info');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-clear-cmd-log')?.addEventListener('click', () => {
    const log = document.getElementById('settings-cmd-log');
    if (log) log.textContent = 'Лог очищен.';
  });
}

  // -------------------- УВЕДОМЛЕНИЯ (TOASTS) --------------------

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const colors = {
      success: 'bg-bg-surface border-status-ok/60 text-status-ok',
      error:   'bg-bg-surface border-status-alarm/60 text-status-alarm',
      info:    'bg-bg-surface border-accent/60 text-accent',
    };
    const toast = document.createElement('div');
    toast.className = `pointer-events-auto px-4 py-3 rounded-xl border shadow-xl text-xs font-medium flex items-center justify-between gap-3 transition-all ${colors[type] || colors.info}`;
    toast.innerHTML = `<span>${this._escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  _escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Запуск приложения после загрузки окна
window.addEventListener('DOMContentLoaded', () => {
  window.gesteresisApp = new GesteresisApp();
  window.gesteresisApp.init();
});
