/**
 * ============================================================================
 * GESTERESIS — Profile Page Component (js/components/profile.js)
 * ============================================================================
 * Отвечает за рендеринг страницы #/profile:
 *  - Учётная запись (email, компания, ID)
 *  - Подписка (план, дата, статус, кнопка «Продлить»)
 *  - Смена пароля (в моке — toast, реальный API — позже)
 *  - Уведомления (push on/off, сохраняется в localStorage)
 *  - Опасная зона (выход из аккаунта)
 *
 * Зависимости:
 *  - js/utils/html.js -> Html.escape, Html.formatDate
 *
 * Подключается ДО app.js (после legal.js).
 * Доступ через window.Profile.
 * ============================================================================
 */

const PROFILE_STORAGE_KEY = 'gesteresis_notifications_enabled';

const Profile = {
  /**
   * Рендерит страницу профиля.
   * @param {GesteresisApp} app — для доступа к state и api
   */
  render(app) {
    const container = document.getElementById('view-profile');
    if (!container) return;

    const user = app.state.user;
    const sub = app.state.subscription;

    // Не залогинен — показываем заглушку
    if (!user) {
      container.innerHTML = this._renderGuest();
      this._bindGuest(container);
      return;
    }

    container.innerHTML = this._renderAuthed(user, sub);
    this._bindAuthed(container, app);
  },

  // -------------------- ГОСТЬ (НЕ ЗАЛОГИНЕН) --------------------

  _renderGuest() {
    return `
      <div class="bg-bg-surface border border-border-subtle rounded-card p-8 text-center space-y-4">
        <h2 class="text-lg font-bold text-text-primary">Войдите в аккаунт</h2>
        <p class="text-sm text-text-secondary">Чтобы просмотреть профиль, необходимо авторизоваться в системе.</p>
        <button type="button" data-modal-trigger="modal-login"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-bg-canvas hover:opacity-90 text-sm font-semibold transition cursor-pointer">
          Войти
        </button>
      </div>
    `;
  },

  _bindGuest(container) {
    // data-modal-trigger подхватит ModalManager, но кнопка вставлена динамически
    container.querySelectorAll('[data-modal-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-modal-trigger');
        window.modalManager?.open(id);
      });
    });
  },

  // -------------------- АВТОРИЗОВАННЫЙ --------------------

  _renderAuthed(user, sub) {
    const subIsActive = sub && sub.isActive;
    const subDate = sub ? Html.formatDate(sub.expiresAt) : '—';
    const subPlan = sub ? Html.escape(sub.planName || '—') : '—';
    const notifEnabled = localStorage.getItem(PROFILE_STORAGE_KEY) === 'true';

    return `
      <!-- Шапка -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-bg-surface border border-border-subtle rounded-card p-5">
        <div class="flex items-center gap-4">
          <a href="#/" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle transition">
            ← Назад к дашборду
          </a>
          <div>
            <h1 class="text-lg sm:text-xl font-bold text-text-primary">Профиль</h1>
            <p class="text-xs text-text-secondary font-mono mt-0.5">${Html.escape(user.email)}</p>
          </div>
        </div>
      </div>

      <!-- Сетка: 2 колонки на больших экранах -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Блок 1: Учётная запись -->
        ${this._renderAccountBlock(user)}

        <!-- Блок 2: Подписка -->
        ${this._renderSubscriptionBlock(subPlan, subDate, subIsActive)}

        <!-- Блок 3: Смена пароля -->
        ${this._renderPasswordBlock()}

        <!-- Блок 4: Уведомления -->
        ${this._renderNotificationsBlock(notifEnabled)}

      </div>

      <!-- Блок 5: Опасная зона (на всю ширину) -->
      ${this._renderDangerZone()}
    `;
  },

  _renderAccountBlock(user) {
    return `
      <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
        <div class="px-5 py-4 border-b border-border-subtle bg-bg-canvas/50">
          <h2 class="text-sm font-bold text-text-primary">Учётная запись</h2>
          <p class="text-xs text-text-secondary">Основные данные пользователя</p>
        </div>
        <div class="p-5 space-y-3 font-mono text-xs">
          <div class="flex items-center justify-between p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted">Email</span>
            <span class="text-text-primary font-bold">${Html.escape(user.email)}</span>
          </div>
          <div class="flex items-center justify-between p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted">Компания</span>
            <span class="text-text-primary font-bold">${Html.escape(user.company || '—')}</span>
          </div>
          <div class="flex items-center justify-between p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted">ID пользователя</span>
            <span class="text-text-secondary">${Html.escape(user.id || '—')}</span>
          </div>
        </div>
      </div>
    `;
  },

  _renderSubscriptionBlock(planName, date, isActive) {
    const dot = isActive ? 'bg-status-ok' : 'bg-status-alarm animate-ping';
    const dateClass = isActive ? 'text-status-ok' : 'text-status-alarm';
    const statusLabel = isActive ? 'Активна' : 'Истекла';
    return `
      <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden flex flex-col">
        <div class="px-5 py-4 border-b border-border-subtle bg-bg-canvas/50 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-text-primary">Подписка</h2>
            <p class="text-xs text-text-secondary">Текущий план и срок действия</p>
          </div>
          <span class="inline-flex items-center gap-1.5 text-xs font-mono font-bold ${dateClass}">
            <span class="w-2 h-2 rounded-full ${dot}"></span>
            ${statusLabel}
          </span>
        </div>
        <div class="p-5 space-y-3 font-mono text-xs flex-1 flex flex-col">
          <div class="flex items-center justify-between p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted">План</span>
            <span class="text-text-primary font-bold">${planName}</span>
          </div>
          <div class="flex items-center justify-between p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted">Действует до</span>
            <span class="${dateClass} font-bold">${date}</span>
          </div>
          <button type="button" data-modal-trigger="modal-subscription"
            class="mt-auto w-full py-2.5 rounded-xl text-xs font-semibold bg-accent text-bg-canvas hover:opacity-90 transition cursor-pointer">
            Продлить подписку
          </button>
        </div>
      </div>
    `;
  },

  _renderPasswordBlock() {
    return `
      <form id="form-change-password" class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
        <div class="px-5 py-4 border-b border-border-subtle bg-bg-canvas/50">
          <h2 class="text-sm font-bold text-text-primary">Смена пароля</h2>
          <p class="text-xs text-text-secondary">Минимум 6 символов</p>
        </div>
        <div class="p-5 space-y-3">
          <div>
            <label for="pwd-current" class="block text-xs font-medium text-text-primary mb-1">Текущий пароль</label>
            <input id="pwd-current" type="password" required placeholder="••••••••" class="w-full px-3.5 py-2.5 rounded-xl bg-bg-canvas border border-border-strong text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label for="pwd-new" class="block text-xs font-medium text-text-primary mb-1">Новый пароль</label>
            <input id="pwd-new" type="password" required minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2.5 rounded-xl bg-bg-canvas border border-border-strong text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label for="pwd-confirm" class="block text-xs font-medium text-text-primary mb-1">Повторите новый</label>
            <input id="pwd-confirm" type="password" required minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2.5 rounded-xl bg-bg-canvas border border-border-strong text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <div id="pwd-error" class="hidden text-xs text-status-alarm bg-status-alarm/10 border border-status-alarm/30 p-2.5 rounded-lg"></div>
          <button type="submit" class="w-full py-2.5 rounded-xl text-sm font-semibold bg-accent text-bg-canvas hover:opacity-90 transition cursor-pointer">
            Сменить пароль
          </button>
        </div>
      </form>
    `;
  },

  _renderNotificationsBlock(enabled) {
    return `
      <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
        <div class="px-5 py-4 border-b border-border-subtle bg-bg-canvas/50">
          <h2 class="text-sm font-bold text-text-primary">Уведомления</h2>
          <p class="text-xs text-text-secondary">Браузерные push при тревогах</p>
        </div>
        <div class="p-5 space-y-3">
          <label class="flex items-center justify-between p-3 rounded-xl bg-bg-canvas border border-border-subtle cursor-pointer">
            <div>
              <div class="text-sm font-semibold text-text-primary">Показывать уведомления при ALARM</div>
              <div class="text-xs text-text-secondary">Когда устройство переходит в состояние тревоги</div>
            </div>
            <input id="toggle-notifications" type="checkbox" ${enabled ? 'checked' : ''} class="accent-accent w-5 h-5" />
          </label>
          <div id="notif-status" class="text-xs font-mono text-text-muted p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            ${enabled ? 'Включено. При тревоге появится системное уведомление.' : 'Отключено.'}
          </div>
        </div>
      </div>
    `;
  },

  _renderDangerZone() {
    return `
      <div class="bg-status-alarm/5 border border-status-alarm/30 rounded-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-bold text-status-alarm">Опасная зона</h2>
            <p class="text-xs text-text-secondary">Выход из учётной записи на этом устройстве</p>
          </div>
          <button id="btn-profile-logout" type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-status-alarm/15 hover:bg-status-alarm/25 text-status-alarm border border-status-alarm/40 transition cursor-pointer">
            Выйти из аккаунта
          </button>
        </div>
      </div>
    `;
  },

  // -------------------- ПРИВЯЗКА ОБРАБОТЧИКОВ --------------------

  _bindAuthed(container, app) {
    // Кнопки, открывающие модалки (например, «Продлить подписку»)
    container.querySelectorAll('[data-modal-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-modal-trigger');
        window.modalManager?.open(id);
        // Если это подписка — заполнить текущую дату
        if (id === 'modal-subscription' && app.state.subscription) {
          const el = document.getElementById('modal-sub-current-date');
          if (el) el.textContent = Html.formatDate(app.state.subscription.expiresAt);
        }
      });
    });

    // Форма смены пароля
    const pwdForm = document.getElementById('form-change-password');
    if (pwdForm) {
      pwdForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cur = document.getElementById('pwd-current').value;
        const next = document.getElementById('pwd-new').value;
        const confirm = document.getElementById('pwd-confirm').value;
        const errBox = document.getElementById('pwd-error');
        errBox.classList.add('hidden');

        if (next !== confirm) {
          errBox.textContent = 'Новый пароль и подтверждение не совпадают';
          errBox.classList.remove('hidden');
          return;
        }
        if (next.length < 6) {
          errBox.textContent = 'Пароль должен быть не короче 6 символов';
          errBox.classList.remove('hidden');
          return;
        }
        // В моке — просто успех. В реальном API — POST /auth/change-password
        window.toastService.show('Пароль изменён (демо-режим)', 'success');
        pwdForm.reset();
      });
    }

    // Переключатель уведомлений
    const toggle = document.getElementById('toggle-notifications');
    if (toggle) {
      toggle.addEventListener('change', () => {
        const enabled = toggle.checked;
        localStorage.setItem(PROFILE_STORAGE_KEY, String(enabled));
        const statusEl = document.getElementById('notif-status');
        if (statusEl) {
          statusEl.textContent = enabled
            ? 'Включено. При тревоге появится системное уведомление.'
            : 'Отключено.';
        }
        window.toastService.show(
          enabled ? 'Уведомления включены' : 'Уведомления отключены',
          'info'
        );
      });
    }

    // Кнопка «Выйти»
    const logoutBtn = document.getElementById('btn-profile-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await app.api.logout();
        app.state.user = null;
        app._renderAuthHeader();
        window.toastService.show('Вы вышли из учётной записи', 'info');
        window.location.hash = '#/';
      });
    }
  },
};

window.Profile = Profile;
