/**
 * ============================================================================
 * GESTERESIS — Device Card Component (js/components/device-card.js)
 * ============================================================================
 * Отвечает за:
 *  - build(dev): полный HTML карточки чипа (шапка, кнопки, метрики, canvas)
 *  - patch(dev, hoverIndex): точечное обновление данных существующей карточки
 *    без пересоздания DOM (чтобы график не «дёргался» при каждом тике)
 *  - bind(card, dev, handlers): навешивание обработчиков на свежесозданную карточку
 *
 * Раньше логика жила в GesteresisApp._buildDeviceCardHtml / _patchDeviceCard.
 *
 * Зависимости:
 *  - js/utils/html.js               -> Html.escape, Html.formatTime
 *  - js/components/kpi-bar.js       -> KpiBar.getStatusBadgeHtml, renderFaultBadgesHtml
 *  - js/chart.js                    -> TelemetryChartRenderer.draw
 *
 * Подключается ДО app.js (после chart.js).
 * Доступ через window.DeviceCard.
 * ============================================================================
 */

const DeviceCard = {
  /**
   * Собирает HTML карточки чипа.
   *
   * @param {Object} dev — объект устройства из state.devices
   * @returns {string} HTML-строка для вставки в сетку
   */
  build(dev) {
    const t = dev.telemetry;
    const isAlarm = t.status === 'ALARM';
    const cardBorder = isAlarm
      ? 'border-status-alarm/80 alarm-card-pulse'
      : 'border-border-subtle hover:border-border-strong';
    const lastUpdateStr = Html.formatTime(t.ts);
    const statusBadge = window.KpiBar
      ? window.KpiBar.getStatusBadgeHtml(t.status)
      : '';
    const faultBadges = window.KpiBar
      ? window.KpiBar.renderFaultBadgesHtml(t.fault_code)
      : '';

    return `
      <article id="card-${Html.escape(dev.id)}" class="bg-bg-surface border ${cardBorder} rounded-card overflow-hidden shadow-xl transition flex flex-col">

        <!-- ШАПКА КАРТОЧКИ -->
        <div class="p-4 sm:p-5 bg-bg-canvas/60 border-b border-border-subtle space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-bg-elevated border border-border-subtle font-mono text-xs font-bold text-accent">
                  ${Html.escape(dev.id)}
                </span>
                <span class="text-[11px] font-mono text-text-secondary">fw v${Html.escape(t.fw)}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-bg-elevated text-text-secondary border border-border-subtle">
                  Model: ${Html.escape(dev.model_source)}
                </span>
              </div>
              <h2 id="title-${Html.escape(dev.id)}" class="text-base sm:text-lg font-bold text-text-primary leading-snug">
                ${Html.escape(dev.name)}
              </h2>
            </div>

            <div id="status-badge-${Html.escape(dev.id)}">
              ${statusBadge}
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div id="faults-${Html.escape(dev.id)}" class="flex flex-wrap items-center gap-1.5">
              ${faultBadges}
            </div>

            <div class="flex items-center gap-2 ml-auto">
              <button id="btn-settings-${Html.escape(dev.id)}" type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle transition cursor-pointer">
                <svg class="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Настройки</span>
              </button>

              <button id="btn-details-${Html.escape(dev.id)}" type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent/15 hover:bg-accent/25 text-accent border border-accent/40 transition cursor-pointer">
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
            <div id="metric-dm-filt-${Html.escape(dev.id)}" class="mt-0.5 font-mono text-base sm:text-lg font-bold ${isAlarm ? 'text-status-alarm' : 'text-accent'}">
              ${t.d_m_filtered.toFixed(2)}
            </div>
          </div>
          <div class="p-3 text-center">
            <div class="text-[10px] font-mono uppercase text-text-secondary">D_m (Raw)</div>
            <div id="metric-dm-raw-${Html.escape(dev.id)}" class="mt-0.5 font-mono text-base sm:text-lg font-semibold text-text-primary">
              ${t.d_m.toFixed(2)}
            </div>
          </div>
          <div class="p-3 text-center">
            <div class="text-[10px] font-mono uppercase text-text-secondary">RMS (X)</div>
            <div id="metric-rms-${Html.escape(dev.id)}" class="mt-0.5 font-mono text-base sm:text-lg font-semibold text-text-primary">
              ${t.rms.toFixed(3)} <span class="text-xs text-text-muted">g</span>
            </div>
          </div>
          <div class="p-3 text-center">
            <div class="text-[10px] font-mono uppercase text-text-secondary">Порог / RPM</div>
            <div id="metric-thr-${Html.escape(dev.id)}" class="mt-0.5 font-mono text-xs sm:text-sm font-semibold text-text-primary">
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
            <span id="ts-${Html.escape(dev.id)}" class="text-text-muted">Обновлено: ${lastUpdateStr}</span>
          </div>

          <div class="relative w-full h-[190px] bg-bg-canvas/70 rounded-xl border border-border-subtle overflow-hidden">
            <canvas id="canvas-${Html.escape(dev.id)}" class="w-full h-full block cursor-crosshair"></canvas>
          </div>
        </div>

      </article>
    `;
  },

  /**
   * Точечно обновляет данные существующей карточки — без пересоздания DOM.
   * Вызывается при каждом пакете телеметрии (~5 сек), чтобы график не «дёргался».
   *
   * @param {Object} dev — объект устройства из state.devices
   * @param {number|null} hoverIndex — индекс точки истории под курсором
   * @returns {boolean} true если карточка найдена и обновлена, false — если нет
   */
  patch(dev, hoverIndex = null) {
    const t = dev.telemetry;
    const isAlarm = t.status === 'ALARM';
    const card = document.getElementById(`card-${dev.id}`);
    if (!card) return false;

    card.className = `bg-bg-surface border ${isAlarm ? 'border-status-alarm/80 alarm-card-pulse' : 'border-border-subtle hover:border-border-strong'} rounded-card overflow-hidden shadow-xl transition flex flex-col`;

    const statusEl = document.getElementById(`status-badge-${dev.id}`);
    if (statusEl && window.KpiBar) {
      statusEl.innerHTML = window.KpiBar.getStatusBadgeHtml(t.status);
    }

    const faultsEl = document.getElementById(`faults-${dev.id}`);
    if (faultsEl && window.KpiBar) {
      faultsEl.innerHTML = window.KpiBar.renderFaultBadgesHtml(t.fault_code);
    }

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
    if (tsEl) tsEl.textContent = `Обновлено: ${Html.formatTime(t.ts)}`;

    const canvas = document.getElementById(`canvas-${dev.id}`);
    if (canvas && window.TelemetryChartRenderer) {
      window.TelemetryChartRenderer.draw(canvas, dev, hoverIndex);
    }

    return true;
  },

  /**
   * Навешивает обработчики на свежесозданную карточку:
   *  - hover по canvas (crosshair)
   *  - кнопка «Настройки» → onSettings(id)
   *  - кнопка «Детальная информация» → onDetails(id)
   *
   * @param {HTMLElement} card — DOM-элемент карточки (или null, если не найден)
   * @param {Object} dev
   * @param {Object} handlers — { onSettings, onDetails, onHover, onHoverEnd }
   */
  bind(card, dev, handlers = {}) {
    if (!card) return;

    const canvas = document.getElementById(`canvas-${dev.id}`);
    if (canvas) {
      // Первичная отрисовка
      if (window.TelemetryChartRenderer) {
        window.TelemetryChartRenderer.draw(canvas, dev, handlers.initialHoverIndex ?? null);
      }

      // Hover по графику (mouse + touch)
      const handlePointer = (clientX) => {
        const rect = canvas.getBoundingClientRect();
        const relX = clientX - rect.left - 40;
        const plotW = rect.width - 56;
        if (plotW <= 0 || !dev.history || dev.history.length === 0) return;
        const ratio = Math.max(0, Math.min(1, relX / plotW));
        const idx = Math.round(ratio * (dev.history.length - 1));
        if (handlers.onHover) handlers.onHover(dev.id, idx);
      };

      canvas.addEventListener('mousemove', (e) => handlePointer(e.clientX));
      canvas.addEventListener('touchmove', (e) => {
        if (e.touches[0]) handlePointer(e.touches[0].clientX);
      }, { passive: true });
      canvas.addEventListener('mouseleave', () => {
        if (handlers.onHoverEnd) handlers.onHoverEnd(dev.id);
      });
    }

    const btnSettings = document.getElementById(`btn-settings-${dev.id}`);
    if (btnSettings && handlers.onSettings) {
      btnSettings.addEventListener('click', () => handlers.onSettings(dev.id));
    }

    const btnDetails = document.getElementById(`btn-details-${dev.id}`);
    if (btnDetails && handlers.onDetails) {
      btnDetails.addEventListener('click', () => handlers.onDetails(dev.id));
    }
  },
};

window.DeviceCard = DeviceCard;