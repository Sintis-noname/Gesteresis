/**
 * ============================================================================
 * GESTERESIS — Device Detail Page Component (js/components/device-detail.js)
 * ============================================================================
 * Отвечает за рендеринг страницы #/device/{id}:
 *  - Шапка с навигацией назад, ID, прошивкой, именем, статусом
 *  - Баннер «API STUB» (заглушка под подключение /raw и /model)
 *  - Таблица 12-мерного вектора признаков x[12]
 *  - Блок CalibrationBlob (D_m, threshold, cond(S), RPM)
 *  - Заглушка матрицы S⁻¹ 12×12
 *
 * Раньше логика жила в GesteresisApp._renderDeviceDetailPage.
 *
 * Зависимости:
 *  - js/utils/html.js          -> Html.escape
 *  - js/components/kpi-bar.js  -> KpiBar.getStatusBadgeHtml
 *  - js/config.js              -> FEATURE_SCHEMA_X12
 *
 * Подключается ДО app.js (после kpi-bar.js).
 * Доступ через window.DeviceDetail.
 * ============================================================================
 */

const DeviceDetail = {
  /** Безопасное число: Number() + isFinite, иначе '—'. */
  _safeNum(v, digits) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(digits) : '—';
  },

  /** Безопасная экспонента: Number() + isFinite, иначе '—'. */
  _safeExp(v, digits) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toExponential(digits) : '—';
  },

  /**
   * Рендерит страницу детальной диагностики.
   *
   * @param {Object|null} dev — объект устройства или null, если не найдено
   * @param {string} deviceId — ID из URL (для сообщения «не найдено»)
   * @param {Object} handlers — { onOpenSettings: (id) => void }
   */
  render(dev, deviceId, handlers = {}) {
    const container = document.getElementById('view-device-detail');
    if (!container) return;

    if (!dev) {
      container.innerHTML = this._renderNotFound(deviceId);
      return;
    }

    const t = dev.telemetry;
    const statusBadge = window.KpiBar
      ? window.KpiBar.getStatusBadgeHtml(t.status)
      : '';

    container.innerHTML = `
      <!-- Навигация назад и заголовок узла -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-bg-surface border border-border-subtle rounded-card p-5">
        <div class="flex items-center gap-4">
          <a href="#/dashboard" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle transition">
            ← Назад к дашборду
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-accent/15 border border-accent/30 font-mono text-xs font-bold text-accent">${Html.escape(dev.id)}</span>
              <span class="text-xs font-mono text-text-secondary">Прошивка: v${Html.escape(t.fw)}</span>
            </div>
            <h1 class="text-lg sm:text-xl font-bold text-text-primary mt-0.5">${Html.escape(dev.name)}</h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          ${statusBadge}
          <button id="detail-open-settings" type="button" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle transition cursor-pointer">
            Настройки чипа
          </button>
        </div>
      </div>

      <!-- Баннер-заглушка для подключения детального API -->
      <div class="bg-status-warn/10 border border-status-warn/30 rounded-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-start gap-3">
          <span class="px-2 py-1 rounded bg-status-warn/20 text-status-warn font-mono text-xs font-bold">API STUB</span>
          <div class="text-xs sm:text-sm text-text-primary/90">
            <strong>Страница детальной диагностики чипа (заглушка).</strong> Архитектура готова к подключению топиков
            <code class="font-mono text-status-warn">p11/gesteresis/${Html.escape(dev.id)}/raw</code> (режим аудита C) и эндпоинта <code class="font-mono text-status-warn">GET /api/v1/devices/${Html.escape(dev.id)}/model</code>.
          </div>
        </div>
      </div>

      <!-- Сетка: Вектор признаков x[12] + Матрица S⁻¹ и NVS CalibrationBlob -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Блок 1: 12-мерный вектор признаков x[12] -->
        <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
          <div class="px-5 py-4 border-b border-border-subtle bg-bg-canvas/50 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-text-primary">Вектор признаков x[12] (float32)</h2>
              <p class="text-xs text-text-secondary">Контракт порядка признаков (interfaces.md §1)</p>
            </div>
            <span class="font-mono text-xs text-accent">DIM = 12</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-border-subtle text-[11px] font-mono text-text-secondary bg-bg-canvas/30">
                  <th class="py-2.5 px-4">#</th>
                  <th class="py-2.5 px-3">Ключ</th>
                  <th class="py-2.5 px-3">Описание</th>
                  <th class="py-2.5 px-4 text-right">Значение (Stub)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-subtle text-xs font-mono">
                ${this._renderFeatureRows(t)}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Блок 2: CalibrationBlob и матрица S⁻¹ -->
        <div class="space-y-6">
          ${this._renderCalibrationBlock(dev, t)}
          ${this._renderMatrixBlock()}
        </div>

      </div>
    `;

    // Привязка кнопки «Настройки чипа» — через callback, чтобы не тащить app целиком
    const btnSettings = document.getElementById('detail-open-settings');
    if (btnSettings && handlers.onOpenSettings) {
      btnSettings.addEventListener('click', () => handlers.onOpenSettings(dev.id));
    }
  },

  // -------------------- ПРИВАТНЫЕ РЕНДЕРЕРЫ --------------------

  /**
   * HTML для случая «устройство не найдено».
   * @private
   */
  _renderNotFound(deviceId) {
    return `
      <div class="bg-bg-surface border border-border-subtle rounded-card p-8 text-center space-y-4">
        <h2 class="text-lg font-bold text-status-alarm">Устройство "${Html.escape(deviceId)}" не найдено</h2>
        <a href="#/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-elevated hover:bg-bg-surface text-sm text-text-primary border border-border-subtle transition">
          ← Назад к дашборду
        </a>
      </div>
    `;
  },

  /**
   * Строки таблицы признаков x[12].
   * @private
   */
  _renderFeatureRows(t) {
    return FEATURE_SCHEMA_X12.map(f => {
      const mockVal = f.key === 'rms_x' ? this._safeNum(t.rms, 4) : '— (ожидание /raw)';
      return `
        <tr class="hover:bg-bg-elevated/50">
          <td class="py-2 px-4 text-text-muted">${f.idx}</td>
          <td class="py-2 px-3 text-accent font-semibold">${Html.escape(f.key)}</td>
          <td class="py-2 px-3 font-sans text-text-primary">${Html.escape(f.desc)}</td>
          <td class="py-2 px-4 text-right text-text-secondary">${mockVal} <span class="text-text-muted">${Html.escape(f.unit)}</span></td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Блок CalibrationBlob (D_m, threshold, cond(S), RPM).
   * @private
   */
  _renderCalibrationBlock(dev, t) {
    return `
      <div class="bg-bg-surface border border-border-subtle rounded-card p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-border-subtle pb-3">
          <div>
            <h2 class="text-sm font-bold text-text-primary">Состояние модели NVS (CalibrationBlob)</h2>
            <p class="text-xs text-text-secondary">Namespace: <code class="font-mono text-text-primary">gesteresis</code> • Размер: 644 байта</p>
          </div>
          <span class="px-2 py-0.5 rounded font-mono text-xs bg-bg-elevated text-accent border border-border-subtle">
            Source: ${Html.escape(dev.model_source)}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3 font-mono text-xs">
          <div class="p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted block text-[10px]">D_m (Kalman / Raw)</span>
            <span class="text-sm font-bold text-text-primary mt-0.5 block">${this._safeNum(t.d_m_filtered, 3)} / ${this._safeNum(t.d_m, 3)}</span>
          </div>
          <div class="p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted block text-[10px]">Порог тревоги (threshold)</span>
            <span class="text-sm font-bold text-status-alarm mt-0.5 block">${this._safeNum(dev.threshold, 2)}</span>
          </div>
          <div class="p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted block text-[10px]">Число обусловленности cond(S)</span>
            <span class="text-sm font-bold text-status-warn mt-0.5 block">${this._safeExp(dev.cond_number, 2)}</span>
          </div>
          <div class="p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted block text-[10px]">Номинал RPM / Magic</span>
            <span class="text-sm font-bold text-text-primary mt-0.5 block">${Html.escape(dev.nominal_rpm)} / 0x47455354</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Заглушка матрицы S⁻¹ 12×12.
   * @private
   */
  _renderMatrixBlock() {
    const cells = Array.from({ length: 144 }, (_, idx) => {
      const row = Math.floor(idx / 12);
      const col = idx % 12;
      const isDiag = row === col;
      return `<div class="py-1 rounded ${isDiag ? 'bg-accent/25 text-accent font-bold' : 'bg-bg-elevated text-text-muted'}">${isDiag ? '1.0' : '0.0'}</div>`;
    }).join('');

    return `
      <div class="bg-bg-surface border border-border-subtle rounded-card p-5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-text-primary">Обратная ковариационная матрица S⁻¹ (12×12)</h2>
          <span class="text-xs font-mono text-text-secondary">144 float32</span>
        </div>
        <p class="text-xs text-text-secondary">
          Регуляризованная матрица <code class="font-mono text-text-primary">inv(S + λ·I)</code>, загруженная в память ESP32-S3. После подключения бэкенда здесь будет отображаться тепловая карта корреляций.
        </p>
        <div class="grid grid-cols-12 gap-1 p-3 rounded-xl bg-bg-canvas border border-border-subtle font-mono text-[9px] text-center select-none">
          ${cells}
        </div>
      </div>
    `;
  },
};

window.DeviceDetail = DeviceDetail;
