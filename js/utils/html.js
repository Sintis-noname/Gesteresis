/**
 * ============================================================================
 * GESTERESIS — HTML & Formatting Utilities (js/utils/html.js)
 * ============================================================================
 * Утилиты, которые раньше дублировались или инлайнились в app.js:
 *  - escapeHtml: защита от XSS при вставке пользовательских данных в innerHTML
 *  - formatDate: локальная дата (дд.мм.гггг)
 *  - formatTime: локальное время (чч:мм:сс)
 *  - formatDateTime: дата + время одной строкой
 *
 * Подключается ДО app.js (после config.js).
 * Доступ через window.Html.
 * ============================================================================
 */

const Html = {
  /**
   * Экранирует спецсимволы HTML. Используется везде, где вставляем
   * пользовательские данные (имя устройства, email, company) в innerHTML.
   *
   * @param {*} str — любое значение, приводится к строке
   * @returns {string}
   */
  escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;');
  },

  /** Безопасный href: пропускает только http(s), mailto, tel, / и # */
  safeUrl(url) {
    const s = String(url ?? '').trim();
    // Разрешаем только относительные и явно безопасные схемы
    if (/^(https?:|mailto:|tel:|\/|#)/i.test(s)) {
      // экранируем кавычки в атрибуте
      return this.escape(s);
    }
    return '#'; // всё остальное (javascript:, data:, vbscript:) — в блок
  },

  /**
   * Безопасный id для HTML-атрибута id и getElementById.
   * Разрешает только [a-zA-Z0-9_-], всё остальное → '_'.
   * Гарантирует, что значение в атрибуте и в getElementById совпадает.
   * @param {*} str
   * @returns {string}
   */
  safeId(str) {
    return String(str ?? '').replace(/[^a-zA-Z0-9_-]/g, '_');
  },

  /**
   * Локальная дата в формате дд.мм.гггг.
   * @param {string|number|Date} value — ISO-строка, timestamp (сек или мс), Date
   * @returns {string}
   */
  formatDate(value) {
    const d = this._toDate(value);
    if (!d) return '—';
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  /**
   * Локальное время в формате чч:мм:сс.
   * @param {string|number|Date} value
   * @returns {string}
   */
  formatTime(value) {
    const d = this._toDate(value);
    if (!d) return '—';
    return d.toLocaleTimeString('ru-RU');
  },

  /**
   * Дата + время одной строкой.
   * @param {string|number|Date} value
   * @returns {string}
   */
  formatDateTime(value) {
    const d = this._toDate(value);
    if (!d) return '—';
    return `${this.formatDate(d)} ${this.formatTime(d)}`;
  },

  /**
   * Приводит значение к Date. Поддерживает:
   *  - ISO-строку ("2025-11-16T12:00:00Z")
   *  - timestamp в секундах (число < 1e12 — считаем секундами, как в telemetry.ts)
   *  - timestamp в миллисекундах
   *  - Date
   *
   * @private
   * @param {string|number|Date} value
   * @returns {Date|null}
   */
  _toDate(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value <= 0) return null;
      const ms = value < 1e12 ? value * 1000 : value;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    if (typeof value === 'string') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    return null;
  },
};

window.Html = Html;
