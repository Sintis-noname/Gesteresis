/**
 * ============================================================================
 * GESTERESIS — Form Handlers (js/forms.js)
 * ============================================================================
 * Отвечает за ВСЕ submit- и click-обработчики форм приложения:
 *  - Формы авторизации (login, register)
 *  - Форма добавления чипа
 *  - Формы внутри модалки настроек (rename, set_threshold, set_rpm, calibrate)
 *  - Кнопки системных команд (CLEAR_FAULT, RESET, clear-log)
 *  - Кнопка оплаты подписки (btn-confirm-payment)
 *
 * Каждая форма — отдельная функция bind<Name>(app). Все они идемпотентны:
 * если элемента нет в DOM — просто ничего не делают (через ?.).
 *
 * Зависимости:
 *  - js/utils/html.js -> Html.formatDate
 *
 * Подключается ДО app.js (после device-detail.js).
 * Доступ через window.Forms.
 * ============================================================================
 */

const Forms = {
  /**
   * Привязывает все формы сразу. Вызывается из app._bindGlobalEvents().
   * @param {GesteresisApp} app — экземпляр приложения
   */
  bindAll(app) {
    this.bindLogin(app);
    this.bindRegister(app);
    this.bindAddChip(app);
    this.bindDeviceMeta(app);
    this.bindCmdThreshold(app);
    this.bindCmdRpm(app);
    this.bindCmdCalibrate(app);
    this.bindCmdClearFault(app);
    this.bindCmdReset(app);
    this.bindClearCmdLog(app);
    this.bindConfirmPayment(app);
  },

  // ==========================================================================
  // АВТОРИЗАЦИЯ
  // ==========================================================================

  bindLogin(app) {
    const form = document.getElementById('form-login');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-password').value;
      const errBox = document.getElementById('login-error');
      errBox.classList.add('hidden');

      try {
        app.state.user = await app.api.login(email, pass);
        app._renderAuthHeader();
        app.closeModal('modal-login');
        window.toastService.show(`Добро пожаловать, ${email}`, 'success');
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      }
    });
  },

  bindRegister(app) {
    const form = document.getElementById('form-register');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const company = document.getElementById('reg-company').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const pass = document.getElementById('reg-password').value;
      const errBox = document.getElementById('register-error');
      errBox.classList.add('hidden');

      try {
        app.state.user = await app.api.register(email, pass, company);
        app._renderAuthHeader();
        app.closeModal('modal-register');
        window.toastService.show('Аккаунт предприятия успешно создан', 'success');
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      }
    });
  },

  // ==========================================================================
  // ДОБАВЛЕНИЕ ЧИПА
  // ==========================================================================

  bindAddChip(app) {
    const form = document.getElementById('form-add-chip');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('new-chip-id').value.trim();
      const name = document.getElementById('new-chip-name').value.trim();
      const nominal_rpm = document.getElementById('new-chip-rpm').value;
      const threshold = document.getElementById('new-chip-threshold').value;

      try {
        await app.api.addDevice({ id, name, nominal_rpm, threshold });
        app.closeModal('modal-add-chip');
        e.target.reset();
        window.Router.handleRoute();
        window.toastService.show(`Узел ${id} добавлен в мониторинг`, 'success');
      } catch (err) {
        window.toastService.show(err.message, 'error');
      }
    });
  },

  // ==========================================================================
  // МОДАЛКА НАСТРОЕК УСТРОЙСТВА
  // ==========================================================================

  bindDeviceMeta(app) {
    const form = document.getElementById('form-device-meta');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = app.state.activeSettingsDeviceId;
      const name = document.getElementById('input-device-name').value.trim();

      try {
        await app.api.updateDeviceMeta(id, { name });
        const titleEl = document.getElementById(`title-${id}`);
        if (titleEl) titleEl.textContent = name;
        window.toastService.show('Название узла обновлено', 'success');
      } catch (err) {
        window.toastService.show(err.message, 'error');
      }
    });
  },

  bindCmdThreshold(app) {
    const form = document.getElementById('form-cmd-threshold');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = app.state.activeSettingsDeviceId;
      const threshold = parseFloat(document.getElementById('input-cmd-threshold').value);

      try {
        const ack = await app.api.sendCommand(id, 'SET_THRESHOLD', { threshold });
        app._appendSettingsLog(ack);
        const dev = app.state.devices.find(d => d.id === id);
        if (dev) {
          const hoverIndex = app.state.hoverIndices[dev.id] ?? null;
          const patched = window.DeviceCard.patch(dev, hoverIndex);
          if (!patched) window.Router.handleRoute();
        }
        window.KpiBar.update(app.state.devices);
        window.toastService.show(`Порог D_m = ${threshold} отправлен на ${id}`, 'success');
      } catch (err) {
        window.toastService.show(err.message, 'error');
      }
    });
  },

  bindCmdRpm(app) {
    const form = document.getElementById('form-cmd-rpm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = app.state.activeSettingsDeviceId;
      const nominal_rpm = parseInt(document.getElementById('input-cmd-rpm').value, 10);

      try {
        const ack = await app.api.sendCommand(id, 'SET_RPM', { nominal_rpm });
        app._appendSettingsLog(ack);
        const dev = app.state.devices.find(d => d.id === id);
        if (dev) {
          const hoverIndex = app.state.hoverIndices[dev.id] ?? null;
          const patched = window.DeviceCard.patch(dev, hoverIndex);
          if (!patched) window.Router.handleRoute();
        }
        window.toastService.show(`Номинал RPM = ${nominal_rpm} отправлен на ${id}`, 'success');
      } catch (err) {
        window.toastService.show(err.message, 'error');
      }
    });
  },

  bindCmdCalibrate(app) {
    const form = document.getElementById('form-cmd-calibrate');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = app.state.activeSettingsDeviceId;
      const duration_s = parseInt(document.getElementById('input-calib-duration').value, 10);

      try {
        const ack = await app.api.sendCommand(id, 'CALIBRATE', { duration_s });
        app._appendSettingsLog(ack);
        const dev = app.state.devices.find(d => d.id === id);
        if (dev) {
          const hoverIndex = app.state.hoverIndices[dev.id] ?? null;
          const patched = window.DeviceCard.patch(dev, hoverIndex);
          if (!patched) window.Router.handleRoute();
        }
        window.KpiBar.update(app.state.devices);
        window.toastService.show(`Команда CALIBRATE (${duration_s}с) отправлена на ${id}`, 'info');
      } catch (err) {
        window.toastService.show(err.message, 'error');
      }
    });
  },

  bindCmdClearFault(app) {
    const btn = document.getElementById('btn-cmd-clear-fault');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const id = app.state.activeSettingsDeviceId;
      try {
        const ack = await app.api.sendCommand(id, 'CLEAR_FAULT', {});
        app._appendSettingsLog(ack);
        const dev = app.state.devices.find(d => d.id === id);
        if (dev) {
          const hoverIndex = app.state.hoverIndices[dev.id] ?? null;
          const patched = window.DeviceCard.patch(dev, hoverIndex);
          if (!patched) window.Router.handleRoute();
        }
        window.KpiBar.update(app.state.devices);
        window.toastService.show(`Ошибка сброшена (CLEAR_FAULT) на ${id}`, 'success');
      } catch (err) {
        window.toastService.show(err.message, 'error');
      }
    });
  },

  bindCmdReset(app) {
    const btn = document.getElementById('btn-cmd-reset');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const id = app.state.activeSettingsDeviceId;
      try {
        const ack = await app.api.sendCommand(id, 'RESET', {});
        app._appendSettingsLog(ack);
        const dev = app.state.devices.find(d => d.id === id);
        if (dev) {
          const hoverIndex = app.state.hoverIndices[dev.id] ?? null;
          const patched = window.DeviceCard.patch(dev, hoverIndex);
          if (!patched) window.Router.handleRoute();
        }
        window.KpiBar.update(app.state.devices);
        window.toastService.show(`Команда RESET отправлена на ${id}`, 'info');
      } catch (err) {
        window.toastService.show(err.message, 'error');
      }
    });
  },

  bindClearCmdLog(app) {
    const btn = document.getElementById('btn-clear-cmd-log');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const log = document.getElementById('settings-cmd-log');
      if (log) log.textContent = 'Лог очищен.';
    });
  },

  // ==========================================================================
  // ОПЛАТА ПОДПИСКИ
  // ==========================================================================

  bindConfirmPayment(app) {
    const btn = document.getElementById('btn-confirm-payment');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const selected = document.querySelector('input[name="sub_plan"]:checked');
      const planId = selected ? selected.value : 'plan_1m';
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Обработка платежа...';

      try {
        const updatedSub = await app.api.createPaymentSession(planId);
        app.state.subscription = updatedSub;
        app._renderSubscriptionHeader();
        app.closeModal('modal-subscription');
        const newDateStr = Html.formatDate(updatedSub.expiresAt);
        window.toastService.show(`Подписка успешно продлена до ${newDateStr}`, 'success');
      } catch (err) {
        window.toastService.show(`Ошибка оплаты: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  },
};

window.Forms = Forms;