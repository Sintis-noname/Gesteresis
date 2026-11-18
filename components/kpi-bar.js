/**
 * ============================================================================
 * GESTERESIS — KPI Bar & Status Badges (js/components/kpi-bar.js)
 * ============================================================================
 * Отвечает за:
 *  - Обновление 4 KPI-плиток (всего / OK / ALARM / CALIBRATING+FAULT)
 *  - HTML-бейдж статуса устройства (OK / ALARM / SENSOR_FAULT / CALIBRATING / OFFLINE)
 *  - HTML-бейджи активных fault-кодов (по битовой маске fault_code)
 *
 * Все методы — чистые (не зависят от state приложения), поэтому могут
 * использоваться и на дашборде, и на детальной странице чипа.
 *
 * Зависимости:
 *  - js/utils/html.js -> Html.escape
 *  - js/config.js     -> decodeFaultMask (глобальная функция)
 *
 * Подключается ДО app.js (после utils/html.js).
 * Доступ через window.KpiBar.
 * ============================================================================
 */

const KpiBar = {
  /**
   * Обновляет 4 KPI-плитки на дашборде.
   *
   * Правила подсчёта:
   *  - total: все устройства
   *  - ok:    status === 'OK' И fault_code === 0
   *  - alarm: status === 'ALARM'
   *  - warn:  CALIBRATING / SENSOR_FAULT / OFFLINE / любой ненулевой fault_code
   *
   * @param {Array<Object>} devices — массив устройств из state
   */
  update(devices) {
    const total = devices.length;
    const ok = devices.filter(
      d => d.telemetry.status === 'OK' && d.telemetry.fault_code === 0
    ).length;
    const alarm = devices.filter(d => d.telemetry.status === 'ALARM').length;
    const warn = devices.filter(
      d =>
        d.telemetry.status === 'CALIBRATING' ||
        d.telemetry.status === 'SENSOR_FAULT' ||
        d.telemetry.status === 'OFFLINE' ||
        d.telemetry.fault_code !== 0
    ).length;

    this._setText('kpi-total', total);
    this._setText('kpi-ok', ok);
    this._setText('kpi-alarm', alarm);
    this._setText('kpi-warn', warn);
  },

  /**
   * Возвращает HTML-бейдж статуса устройства.
   *
   * @param {string} status — OK | ALARM | SENSOR_FAULT | CALIBRATING | OFFLINE
   * @returns {string} HTML-строка
   */
  getStatusBadgeHtml(status) {
    const map = {
      OK: {
        bg: 'bg-status-ok/15 text-status-ok border-status-ok/40',
        dot: 'bg-status-ok',
        label: 'OK',
      },
      ALARM: {
        bg: 'bg-status-alarm/20 text-status-alarm border-status-alarm/60',
        dot: 'bg-status-alarm animate-ping',
        label: 'ALARM',
      },
      SENSOR_FAULT: {
        bg: 'bg-status-alarm/25 text-status-alarm border-status-alarm/70',
        dot: 'bg-status-alarm',
        label: 'SENSOR_FAULT',
      },
      CALIBRATING: {
        bg: 'bg-status-warn/15 text-status-warn border-status-warn/40',
        dot: 'bg-status-warn animate-pulse',
        label: 'CALIBRATING',
      },
      OFFLINE: {
        bg: 'bg-bg-elevated text-text-muted border-border-strong',
        dot: 'bg-text-muted',
        label: 'OFFLINE',
      },
    };
    const cfg = map[status] || map.OFFLINE;

    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${cfg.bg}">
        <span class="w-2 h-2 rounded-full ${cfg.dot}"></span>
        ${cfg.label}
      </span>
    `;
  },

  /**
   * Возвращает HTML-бейджи активных fault-кодов.
   * Если fault_code === 0 — возвращает «NONE» текстом.
   *
   * @param {number} faultCode — битовая маска (см. FAULT_CODES в config.js)
   * @returns {string} HTML-строка
   */
  renderFaultBadgesHtml(faultCode) {
    // decodeFaultMask объявлена глобально в config.js
    const faults = typeof decodeFaultMask === 'function'
      ? decodeFaultMask(faultCode)
      : [];

    if (faults.length === 0) {
      return `<span class="text-[11px] font-mono text-text-muted">fault_code: 0x0000 (NONE)</span>`;
    }

    return faults.map(f => {
      const hex = '0x' + f.mask.toString(16).padStart(4, '0').toUpperCase();
      return `
        <span title="${Html.escape(f.label)}" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-status-warn/15 text-status-warn border border-status-warn/40">
          ⚠ ${hex} ${Html.escape(f.name)}
        </span>
      `;
    }).join(' ');
  },

  /**
   * Утилита: устанавливает textContent элемента по id, если элемент есть.
   * @private
   * @param {string} id
   * @param {string|number} value
   */
  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },
};

window.KpiBar = KpiBar;