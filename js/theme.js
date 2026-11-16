/**
 * ============================================================================
 * GESTERESIS — Theme Manager & Declarative UI Bindings (js/theme.js)
 * ============================================================================
 * Отвечает за:
 *  - Переключение тем через <html data-theme="...">
 *  - Сохранение выбора в localStorage
 *  - Учёт prefers-color-scheme при первом заходе
 *  - Событие 'theme:changed' для перерисовки canvas (chart.js, Шаг 4)
 *  - Декларативные триггеры модалок: [data-modal-trigger], [data-close-modal]
 *
 * Подключается ДО app.js (после config.js).
 */

class ThemeManager {
  constructor() {
    this.storageKey = 'gesteresis_theme';
    this.themes = ['dark', 'light']; // расширяемо
    this.defaultTheme = 'dark';
    this.current = null;
  }

  /** Определяет стартовую тему: localStorage → prefers-color-scheme → default */
  _resolveInitial() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved && this.themes.includes(saved)) return saved;

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return this.defaultTheme;
  }

  /** Применяет тему: атрибут, localStorage, событие, иконки кнопки */
  apply(name) {
    if (!this.themes.includes(name)) {
      console.warn(`[ThemeManager] Unknown theme "${name}", fallback to "${this.defaultTheme}"`);
      name = this.defaultTheme;
    }
    this.current = name;
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem(this.storageKey, name);

    this._updateToggleIcon(name);

    // chart.js (Шаг 4) подпишется и перерисует canvas.
    window.dispatchEvent(new CustomEvent('theme:changed', { detail: { name } }));
  }

  toggle() {
    this.apply(this.current === 'dark' ? 'light' : 'dark');
  }

  init() {
    this.apply(this._resolveInitial());

    const btn = document.getElementById('btn-toggle-theme');
    if (btn) {
      btn.addEventListener('click', () => this.toggle());
    }

    // Реагируем на смену системной темы, если пользователь не выбрал вручную
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const handler = (e) => {
        if (!localStorage.getItem(this.storageKey)) {
          this.apply(e.matches ? 'light' : 'dark');
        }
      };
      // Safari < 14 не поддерживает addEventListener на MediaQueryList
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else if (mq.addListener) mq.addListener(handler);
    }
  }

  /** Показывает нужную иконку (солнце в dark → «переключить на light»; луна в light) */
  _updateToggleIcon(name) {
    const iconDark = document.getElementById('theme-icon-dark');
    const iconLight = document.getElementById('theme-icon-light');
    if (!iconDark || !iconLight) return;
    // В тёмной теме показываем солнце (клик → станет светло), и наоборот
    iconDark.classList.toggle('hidden', name !== 'dark');
    iconLight.classList.toggle('hidden', name !== 'light');
  }
}

/**
 * Декларативные триггеры модалок.
 *  - [data-modal-trigger="modal-id"] — открыть модалку
 *  - [data-close-modal="modal-id"]   — закрыть модалку (в app.js уже был этот атрибут)
 *  - клик по фону модалки (элемент с id="modal-...") — закрыть
 *  - Esc — закрыть верхнюю открытую модалку
 */
class ModalManager {
  constructor() {
    this.openStack = [];
    this._onEsc = this._onEsc.bind(this);
  }

  init() {
    document.querySelectorAll('[data-modal-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-modal-trigger');
        // Если кнопка ещё и закрывает другую модалку (например, «Нет аккаунта? → Регистрация»)
        const alsoClose = btn.getAttribute('data-close-modal');
        if (alsoClose) this.close(alsoClose);
        this.open(id);
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-close-modal');
        this.close(id);
      });
    });

    // Клик по фону модалки
    document.querySelectorAll('[id^="modal-"]').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close(modal.id);
      });
    });

    document.addEventListener('keydown', this._onEsc);
  }

  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');
    if (!this.openStack.includes(id)) this.openStack.push(id);
  }

  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
    this.openStack = this.openStack.filter((x) => x !== id);
  }

  closeAll() {
    [...this.openStack].forEach((id) => this.close(id));
  }

  _onEsc(e) {
    if (e.key !== 'Escape' || this.openStack.length === 0) return;
    this.close(this.openStack[this.openStack.length - 1]);
  }
}

// Глобальные экземпляры — доступны из app.js
window.themeManager = new ThemeManager();
window.modalManager = new ModalManager();

// Инициализация до DOMContentLoaded не нужна — app.js вызовет init() сам,
// но подстрахуемся на случай, если theme.js подключили позже:
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.themeManager.init();
    window.modalManager.init();
  });
} else {
  window.themeManager.init();
  window.modalManager.init();
}