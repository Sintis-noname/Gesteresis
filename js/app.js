/**
 * ============================================================================
 * GESTERESIS — Application Controller (js/app.js)
 * ============================================================================
 * Тонкий оркестратор. Отвечает ТОЛЬКО за:
 *  - Инициализацию приложения (init)
 *  - State (user, subscription, devices, hoverIndices)
 *  - Подписку на телеметрию (subscribe/unsubscribe)
 *  - Рендер auth-заголовка и подписки
 *  - Заполнение и открытие модалки настроек устройства
 *  - Делегирование модалок в ModalManager
 *
 * Всё остальное — в компонентах:
 *  - Router       → роутинг, рендер дашборда и детальной страницы
 *  - Forms        → обработчики всех форм
 *  - KpiBar       → KPI-плитки, статус-бейджи, fault-бейджи
 *  - DeviceCard   → карточка чипа
 *  - DeviceDetail → страница #/device/{id}
 *  - ToastService → toast-уведомления
 *  - TelemetryChartRenderer → canvas-графики
 *  - ApiService   → API + мок-генератор
 *  - ThemeManager, ModalManager → темы и модалки
 *
 * Зависимости (подключаются до app.js):
 *  js/config.js, js/utils/html.js, js/theme.js,
 *  js/components/*.js, js/api.js, js/chart.js,
 *  js/forms.js, js/router.js
 * ============================================================================
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

  // ==========================================================================
  // ИНИЦИАЛИЗАЦИЯ
  // ==========================================================================

  async init() {
    this._bindGlobalEvents();
    window.Router.showPreloader();

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
      window.Router.updateBackendModeBadge();
      window.Router.init(this);
      this._startTelemetryStream();
    } catch (err) {
      window.toastService.show(`Ошибка инициализации: ${err.message}`, 'error');
    } finally {
      window.Router.hidePreloader();
    }
  }

  // ==========================================================================
  // ПОДПИСКА НА UI
  // ==========================================================================

  _renderSubscriptionHeader() {
    const sub = this.state.subscription;
    const dateEl = document.getElementById('sub-expiry-date');
    const dotEl = document.getElementById('sub-status-dot');
    if (!sub || !dateEl || !dotEl) return;

    const formatted = Html.formatDate(sub.expiresAt);
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

  _renderAuthHeader() {
    const container = document.getElementById('auth-controls');
    if (!container) return;

    if (this.state.user) {
      container.innerHTML = `
        <a href="#/profile" class="hidden md:flex flex-col items-end mr-1 hover:opacity-80 transition">
          <span class="text-xs font-mono font-semibold text-text-primary">${Html.escape(this.state.user.email)}</span>
          <span class="text-[10px] text-text-secondary">${Html.escape(this.state.user.company || 'Инженер')}</span>
        </a>
        <button id="btn-logout" type="button"
          class="px-3.5 py-2 rounded-xl text-xs font-medium bg-bg-surface hover:bg-status-alarm/20 hover:text-status-alarm text-text-secondary border border-border-subtle hover:border-status-alarm/40 transition cursor-pointer">
          Выйти
        </button>
      `;
      document.getElementById('btn-logout').addEventListener('click', async () => {
        await this.api.logout();
        this.state.user = null;
        this._renderAuthHeader();
        window.toastService.show('Вы вышли из учётной записи', 'info');
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
      // Динамически вставленные кнопки не подхватятся ModalManager.init(),
      // поэтому навешиваем вручную
      container.querySelectorAll('[data-modal-trigger]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-modal-trigger');
          window.modalManager?.open(id);
        });
      });
    }
  }

  // ==========================================================================
  // ПОТОК ТЕЛЕМЕТРИИ
  // ==========================================================================

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

      if (!window.location.hash.startsWith('#/device/')) {
        // Дашборд: точечное обновление карточки + KPI
        window.KpiBar.update(this.state.devices);
        const hoverIndex = this.state.hoverIndices[updatedDevice.id] ?? null;
        const patched = window.DeviceCard.patch(updatedDevice, hoverIndex);
        if (!patched) window.Router.handleRoute();
      } else {
        // Детальная страница: перерендер, если это то же устройство
        const currentDetailId = decodeURIComponent(window.location.hash.replace('#/device/', ''));
        if (currentDetailId === updatedDevice.id) {
          window.Router.handleRoute();
        }
      }
    });
  }

  // ==========================================================================
  // МОДАЛКА НАСТРОЕК УСТРОЙСТВА
  // ==========================================================================

  openDeviceSettingsModal(deviceId) {
    const dev = this.state.devices.find(d => d.id === deviceId);
    if (!dev) return;

    this.state.activeSettingsDeviceId = deviceId;
    document.getElementById('settings-device-id-badge').textContent = dev.id;
    document.getElementById('settings-topic-id').textContent = dev.id;
    document.getElementById('input-device-name').value = dev.name;
    document.getElementById('input-cmd-threshold').value = dev.threshold;
    document.getElementById('input-cmd-rpm').value = dev.nominal_rpm;
    document.getElementById('settings-cmd-log').textContent =
      `Подключено к узлу ${dev.id}. Готов к отправке команд в p11/gesteresis/${dev.id}/cmd`;

    this.openModal('modal-settings');
  }

  _appendSettingsLog(obj) {
    const logEl = document.getElementById('settings-cmd-log');
    const time = new Date().toLocaleTimeString('ru-RU');
    logEl.textContent = `[${time}] ${JSON.stringify(obj)}\n` + logEl.textContent;
  }

  // ==========================================================================
  // МОДАЛКИ (делегирование в ModalManager)
  // ==========================================================================

  openModal(modalId) {
    window.modalManager?.open(modalId);
  }

  closeModal(modalId) {
    window.modalManager?.close(modalId);
  }

  // ==========================================================================
  // ГЛОБАЛЬНЫЕ СОБЫТИЯ
  // ==========================================================================

  _bindGlobalEvents() {
    // Ресайз: перерисовка canvas
    window.addEventListener('resize', () => {
      if (!window.location.hash.startsWith('#/device/')) {
        this.state.devices.forEach(dev => {
          const canvas = document.getElementById(`canvas-${dev.id}`);
          window.TelemetryChartRenderer.draw(canvas, dev, null);
        });
      }
    });

    // Переключение темы → перерисовка всех canvas
    window.addEventListener('theme:changed', () => {
      if (!window.location.hash.startsWith('#/device/')) {
        this.state.devices.forEach(dev => {
          const canvas = document.getElementById(`canvas-${dev.id}`);
          window.TelemetryChartRenderer.draw(canvas, dev, this.state.hoverIndices[dev.id] ?? null);
        });
      }
    });

    // Переключатель Play / Pause live-потока
    document.getElementById('btn-toggle-stream')?.addEventListener('click', () => {
      this.state.isStreaming = !this.state.isStreaming;
      const dot = document.getElementById('stream-indicator');
      const label = document.getElementById('stream-label');
      if (this.state.isStreaming) {
        dot.className = 'w-2 h-2 rounded-full bg-status-ok animate-ping';
        label.textContent = 'LIVE (5s)';
        this._startTelemetryStream();
        window.toastService.show('Поток телеметрии (5 сек) возобновлён', 'info');
      } else {
        dot.className = 'w-2 h-2 rounded-full bg-text-muted';
        label.textContent = 'PAUSED';
        if (this.unsubscribeStream) this.unsubscribeStream();
        window.toastService.show('Обновление графиков поставлено на паузу', 'info');
      }
    });

    // Модальное окно подписки: заполнение текущей даты при открытии
    document.querySelector('[data-modal-trigger="modal-subscription"]')?.addEventListener('click', () => {
      const dt = this.state.subscription
        ? Html.formatDate(this.state.subscription.expiresAt)
        : '—';
      const el = document.getElementById('modal-sub-current-date');
      if (el) el.textContent = dt;
    });

    // Все формы и кнопки-команды
    window.Forms.bindAll(this);
  }
}

// Запуск приложения после загрузки окна
window.addEventListener('DOMContentLoaded', () => {
  window.gesteresisApp = new GesteresisApp();
  window.gesteresisApp.init();
});
