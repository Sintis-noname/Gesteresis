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
      .replace(/"/g, '&quot;');
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
    if (value instanceof Date) return isNaN(value) ? null : value;

    if (typeof value === 'number') {
      // Telemetry.ts приходит в секундах (10 знаков), Date.now() — в мс (13 знаков).
      // Порог 1e12 (2001-09-09 в мс) отделяет одно от другого.
      const ms = value < 1e12 ? value * 1000 : value;
      const d = new Date(ms);
      return isNaN(d) ? null : d;
    }

    if (typeof value === 'string') {
      const d = new Date(value);
      return isNaN(d) ? null : d;
    }

    return null;
  },
};

window.Html = Html;