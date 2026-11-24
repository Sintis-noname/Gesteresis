/**
 * ============================================================================
 * GESTERESIS — Profile Page Component (js/components/profile.js)
 * ============================================================================
 * Отвечает за рендеринг страницы #/profile:
 *  - Учётная запись (email, компания, ID, дата регистрации, последний вход)
 *  - Статистика (устройства, тревоги, аптайм)
 *  - Подписка (план, дата, статус, прогресс-бар, кнопка «Продлить»)
 *  - Смена пароля (в моке — toast, реальный API — позже)
 *  - Уведомления (ALARM / WARNING / email-дайджест, хранятся в localStorage)
 *  - Опасная зона (выход, выход на всех устройствах)
 *
 * Зависимости:
 *  - js/utils/html.js -> Html.escape, Html.formatDate
 *
 * Подключается ДО app.js (после legal.js).
 * Доступ через window.Profile.
 * ============================================================================
 */

const PROFILE_STORAGE_KEY = 'gesteresis_notifications_enabled';
const PROFILE_NOTIF_KEYS = {
  alarm:   'gesteresis_notif_alarm',
  warning: 'gesteresis_notif_warning',
  digest:  'gesteresis_notif_digest',
};

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

    if (!user) {
      container.innerHTML = this._renderGuest();
      this._bindGuest(container);
      return;
    }

    container.innerHTML = this._renderAuthed(user, sub, app);
    this._bindAuthed(container, app);
  },

  // -------------------- ХЕЛПЕРЫ --------------------

  _initials(email) {
    if (!email) return '?';
    const name = String(email).split('@')[0];
    const parts = name.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  },

  _notifValue(key, fallback) {
    const raw = localStorage.getItem(PROFILE_NOTIF_KEYS[key]);
    if (raw === null) return fallback;
    return raw === 'true';
  },

  _safeNumber(v) {
    return Number.isFinite(v) ? v : 0;
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
    container.querySelectorAll('[data-modal-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-modal-trigger');
        window.modalManager?.open(id);
      });
    });
  },

  // -------------------- АВТОРИЗОВАННЫЙ --------------------

  _renderAuthed(user, sub, app) {
    const subIsActive = sub && sub.isActive;
    const subDate = sub ? Html.formatDate(sub.expiresAt) : '—';
    const subPlan = sub ? Html.escape(sub.planName || '—') : '—';
    const notifEnabled = localStorage.getItem(PROFILE_STORAGE_KEY) === 'true';

    return `
      <!-- Шапка с аватаром -->
      ${this._renderHeader(user, subIsActive, subPlan)}

      <!-- Статистика -->
      ${this._renderStatsBlock(app)}

      <!-- Сетка: 2 колонки на больших экранах -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        ${this._renderAccountBlock(user)}
        ${this._renderSubscriptionBlock(sub, subPlan, subDate, subIsActive)}
        ${this._renderPasswordBlock()}
        ${this._renderNotificationsBlock(notifEnabled)}
      </div>

      <!-- Активность -->
      ${this._renderActivityBlock()}

      <!-- Опасная зона -->
      ${this._renderDangerZone()}
    `;
  },

  _renderHeader(user, subIsActive, subPlan) {
    const initials = this._initials(user.email);
    const statusDot = subIsActive ? 'bg-status-ok' : 'bg-status-alarm';
    const statusLabel = subIsActive ? subPlan : 'Нет подписки';
    const statusText = subIsActive ? 'text-status-ok' : 'text-status-alarm';

    return `
      <div class="flex flex-wrap items-center justify-between gap-4 bg-bg-surface border border-border-subtle rounded-card p-5">
        <div class="flex items-center gap-4">
          <a href="#/dashboard" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-subtle transition">
            ← Назад к дашборду
          </a>
          <div class="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <span class="text-lg font-bold text-accent font-mono">${Html.escape(initials)}</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg sm:text-xl font-bold text-text-primary">Профиль</h1>
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-bg-canvas border border-border-subtle text-[10px] font-mono ${statusText}">
                <span class="w-1.5 h-1.5 rounded-full ${statusDot}"></span>
                ${Html.escape(statusLabel)}
              </span>
            </div>
            <p class="text-xs text-text-secondary font-mono mt-0.5">${Html.escape(user.email)}</p>
          </div>
        </div>
      </div>
    `;
  },

  _renderStatsBlock(app) {
    const devices = this._safeNumber(app?.state?.devices?.length);
    const alarms = this._safeNumber(app?.state?.devices?.filter((d) => d.state === 'ALARM').length);
    const warnings = this._safeNumber(app?.state?.devices?.filter((d) => d.state === 'WARNING').length);

    const cell = (label, value, tone) => `
      <div class="p-4 rounded-xl bg-bg-canvas border border-border-subtle">
        <div class="text-[10px] uppercase tracking-wider text-text-muted mb-1">${label}</div>
        <div class="text-xl font-bold font-mono ${tone || 'text-text-primary'}">${value}</div>
      </div>
    `;

    return `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${cell('Устройства', devices)}
        ${cell('Тревоги', alarms, alarms > 0 ? 'text-status-alarm' : 'text-status-ok')}
        ${cell('Предупреждения', warnings, warnings > 0 ? 'text-status-warn' : 'text-text-primary')}
        ${cell('Аптайм', '99.98%', 'text-status-ok')}
      </div>
    `;
  },

  _renderAccountBlock(user) {
    const registered = user.createdAt ? Html.formatDate(user.createdAt) : '—';
    const lastLogin = user.lastLoginAt ? Html.formatDate(user.lastLoginAt) : '—';

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
          <div class="flex items-center justify-between p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted">Дата регистрации</span>
            <span class="text-text-secondary">${Html.escape(registered)}</span>
          </div>
          <div class="flex items-center justify-between p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            <span class="text-text-muted">Последний вход</span>
            <span class="text-text-secondary">${Html.escape(lastLogin)}</span>
          </div>
        </div>
      </div>
    `;
  },

  _renderSubscriptionBlock(sub, planName, date, isActive) {
    const dot = isActive ? 'bg-status-ok' : 'bg-status-alarm animate-ping';
    const dateClass = isActive ? 'text-status-ok' : 'text-status-alarm';
    const statusLabel = isActive ? 'Активна' : 'Истекла';

    // Прогресс-бар: сколько дней осталось
    let progressHtml = '';
    let daysLeft = null;
    if (sub && sub.expiresAt && sub.startedAt) {
      const start = new Date(sub.startedAt).getTime();
      const end = new Date(sub.expiresAt).getTime();
      const now = Date.now();
      const total = Math.max(end - start, 1);
      const left = Math.max(end - now, 0);
      const pct = Math.min(100, Math.round((left / total) * 100));
      daysLeft = Math.ceil(left / (1000 * 60 * 60 * 24));

      let barTone = 'bg-status-ok';
      if (pct < 50) barTone = 'bg-status-warn';
      if (pct < 20) barTone = 'bg-status-alarm';

      progressHtml = `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[10px] text-text-muted">
            <span>Остаток срока</span>
            <span class="font-mono font-bold text-text-primary">${daysLeft} дн.</span>
          </div>
          <div class="h-2 rounded-full bg-bg-canvas border border-border-subtle overflow-hidden">
            <div class="h-full ${barTone} transition-all" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }

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
          ${progressHtml}
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
    const alarm = this._notifValue('alarm', enabled);
    const warning = this._notifValue('warning', false);
    const digest = this._notifValue('digest', true);

    const toggleRow = (id, title, subtitle, checked) => `
      <label class="flex items-center justify-between p-3 rounded-xl bg-bg-canvas border border-border-subtle cursor-pointer">
        <div>
          <div class="text-sm font-semibold text-text-primary">${title}</div>
          <div class="text-xs text-text-secondary">${subtitle}</div>
        </div>
        <input id="${id}" type="checkbox" ${checked ? 'checked' : ''} class="accent-accent w-5 h-5" />
      </label>
    `;

    return `
      <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
        <div class="px-5 py-4 border-b border-border-subtle bg-bg-canvas/50">
          <h2 class="text-sm font-bold text-text-primary">Уведомления</h2>
          <p class="text-xs text-text-secondary">Что и когда показывать</p>
        </div>
        <div class="p-5 space-y-3">
          ${toggleRow('toggle-notif-alarm', 'Push при ALARM', 'Мгновенное уведомление при тревоге', alarm)}
          ${toggleRow('toggle-notif-warning', 'Push при WARNING', 'Когда устройство уходит в предупреждение', warning)}
          ${toggleRow('toggle-notif-digest', 'Email-дайджест', 'Ежедневная сводка на почту', digest)}
          <div id="notif-status" class="text-xs font-mono text-text-muted p-3 rounded-xl bg-bg-canvas border border-border-subtle">
            ${enabled ? 'Push-уведомления включены.' : 'Push-уведомления отключены.'}
          </div>
        </div>
      </div>
    `;
  },

  _renderActivityBlock() {
    const items = [
      { time: 'Сегодня, 14:32', text: 'Вход в систему с этого устройства', tone: 'text-status-ok' },
      { time: 'Вчера, 09:10', text: 'Изменены настройки уведомлений', tone: 'text-text-secondary' },
      { time: '2 дня назад', text: 'Устройство «Насос #3» перешло в ALARM', tone: 'text-status-alarm' },
      { time: '5 дней назад', text: 'Продлена подписка', tone: 'text-status-ok' },
    ];
    return `
      <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
        <div class="px-5 py-4 border-b border-border-subtle bg-bg-canvas/50">
          <h2 class="text-sm font-bold text-text-primary">Последняя активность</h2>
          <p class="text-xs text-text-secondary">Журнал действий по аккаунту (демо)</p>
        </div>
        <ul class="divide-y divide-border-subtle">
          ${items.map((it) => `
            <li class="flex items-center justify-between gap-3 px-5 py-3 font-mono text-xs">
              <span class="${it.tone}">${Html.escape(it.text)}</span>
              <span class="text-text-muted whitespace-nowrap">${Html.escape(it.time)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  },

  _renderDangerZone() {
    return `
      <div class="bg-status-alarm/5 border border-status-alarm/30 rounded-card p-5 space-y-4">
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
        <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-status-alarm/20">
          <div>
            <h3 class="text-sm font-bold text-status-alarm">Все устройства</h3>
            <p class="text-xs text-text-secondary">Завершить все сессии, включая текущую</p>
          </div>
          <button id="btn-profile-logout-all" type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-status-alarm/15 hover:bg-status-alarm/25 text-status-alarm border border-status-alarm/40 transition cursor-pointer">
            Выйти на всех устройствах
          </button>
        </div>
      </div>
    `;
  },

  // -------------------- ПРИВЯЗКА ОБРАБОТЧИКОВ --------------------

  _bindAuthed(container, app) {
    // Кнопки, открывающие модалки
    container.querySelectorAll('[data-modal-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-modal-trigger');
        window.modalManager?.open(id);
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
        window.toastService.show('Пароль изменён (демо-режим)', 'success');
        pwdForm.reset();
      });
    }

    // Тумблеры уведомлений
    const bindToggle = (id, key, toastOn, toastOff) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        const enabled = el.checked;
        localStorage.setItem(PROFILE_NOTIF_KEYS[key], String(enabled));
        // Мастер-ключ: включаем, если хоть один push-канал активен
        const alarm = localStorage.getItem(PROFILE_NOTIF_KEYS.alarm) === 'true';
        const warning = localStorage.getItem(PROFILE_NOTIF_KEYS.warning) === 'true';
        localStorage.setItem(PROFILE_STORAGE_KEY, String(alarm || warning));
        window.toastService.show(enabled ? toastOn : toastOff, 'info');
      });
    };
    bindToggle('toggle-notif-alarm', 'alarm', 'Push при ALARM включён', 'Push при ALARM отключён');
    bindToggle('toggle-notif-warning', 'warning', 'Push при WARNING включён', 'Push при WARNING отключён');
    bindToggle('toggle-notif-digest', 'digest', 'Email-дайджест включён', 'Email-дайджест отключён');

    // Кнопка «Выйти»
    const logoutBtn = document.getElementById('btn-profile-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await app.api.logout();
        app.state.user = null;
        app._renderAuthHeader();
        window.toastService.show('Вы вышли из учётной записи', 'info');
        window.location.hash = '#/dashboard';
      });
    }

    // Кнопка «Выйти на всех устройствах»
    const logoutAllBtn = document.getElementById('btn-profile-logout-all');
    if (logoutAllBtn) {
      logoutAllBtn.addEventListener('click', async () => {
        const ok = window.confirm?.('Завершить все сессии, включая текущую?');
        if (!ok) return;
        try {
          await app.api.logoutAll?.();
        } catch (_) { /* ignore in mock */ }
        await app.api.logout();
        app.state.user = null;
        app._renderAuthHeader();
        window.toastService.show('Все сессии завершены', 'info');
        window.location.hash = '#/dashboard';
      });
    }
  },
};

window.Profile = Profile;
