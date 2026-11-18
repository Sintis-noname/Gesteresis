/**
 * ============================================================================
 * GESTERESIS — Toast Notifications Service (js/components/toast.js)
 * ============================================================================
 * Отвечает за:
 *  - Показ toast-уведомлений (success / error / info)
 *  - Автоматическое скрытие через TOAST_DURATION_MS
 *  - Плавный fade-out перед удалением
 *  - Ограничение количества одновременных toast (чтобы не залить экран)
 *
 * Раньше логика жила в GesteresisApp.showToast() (app.js).
 * Теперь — отдельный сервис, доступный через window.toastService.
 *
 * Зависимости:
 *  - js/utils/html.js -> Html.escape
 *  - js/config.js     -> APP_CONFIG (опционально)
 *
 * Подключается ДО app.js (после utils/html.js).
 * ============================================================================
 */

const TOAST_CONFIG = {
  DURATION_MS: 3500,       // сколько toast висит до начала исчезновения
  FADE_OUT_MS: 250,        // длительность анимации исчезновения
  MAX_VISIBLE: 5,          // максимум одновременных toast (старые удаляются)
  OFFSET_Y_PX: 6,          // сдвиг при fade-out (translateY)
};

class ToastService {
  /**
   * @param {string} containerId — id контейнера в index.html
   */
  constructor(containerId = 'toast-container') {
    this.containerId = containerId;
  }

  /**
   * Показывает toast-уведомление.
   *
   * @param {string} message — текст (экранируется автоматически)
   * @param {'success'|'error'|'info'} [type='info'] — стиль
   */
  show(message, type = 'info') {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Ограничиваем количество — если больше MAX_VISIBLE, удаляем самые старые
    while (container.children.length >= TOAST_CONFIG.MAX_VISIBLE) {
      container.firstElementChild?.remove();
    }

    const toast = document.createElement('div');
    toast.className = this._getClassName(type);
    toast.innerHTML = `<span>${Html.escape(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => this._dismiss(toast), TOAST_CONFIG.DURATION_MS);
  }

  /**
   * Убирает toast с анимацией и удаляет из DOM.
   * @private
   * @param {HTMLElement} toast
   */
  _dismiss(toast) {
    if (!toast.isConnected) return;
    toast.style.opacity = '0';
    toast.style.transform = `translateY(${TOAST_CONFIG.OFFSET_Y_PX}px)`;
    setTimeout(() => toast.remove(), TOAST_CONFIG.FADE_OUT_MS);
  }

  /**
   * Возвращает Tailwind-классы для конкретного типа toast.
   * @private
   * @param {string} type
   * @returns {string}
   */
  _getClassName(type) {
    const colors = {
      success: 'bg-bg-surface border-status-ok/60 text-status-ok',
      error:   'bg-bg-surface border-status-alarm/60 text-status-alarm',
      info:    'bg-bg-surface border-accent/60 text-accent',
    };
    const base = 'pointer-events-auto px-4 py-3 rounded-xl border shadow-xl text-xs font-medium flex items-center justify-between gap-3 transition-all';
    return `${base} ${colors[type] || colors.info}`;
  }
}

// Глобальный экземпляр — доступен из app.js и других модулей
window.toastService = new ToastService();