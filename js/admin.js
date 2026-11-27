document.addEventListener('DOMContentLoaded', () => {
  // --- 1. АВТОРИЗАЦИЯ ---
  const loginScreen = document.getElementById('admin-login-screen');
  const dashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('admin-login-form');
  const logoutBtn = document.getElementById('admin-logout-btn');

  if (localStorage.getItem('gesteresis_admin_token') === 'demo_admin_token') {
    showDashboard();
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const login = document.getElementById('admin-login').value;
    const pass = document.getElementById('admin-password').value;

    if (login === 'admin' && pass === 'admin') {
      localStorage.setItem('gesteresis_admin_token', 'demo_admin_token');
      showDashboard();
      window.toastService.show('Добро пожаловать в админ-панель', 'success');
    } else {
      window.toastService.show('Неверный логин или пароль', 'error');
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('gesteresis_admin_token');
    dashboard.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  });

  function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    initData(); 
  }

  // --- 2. ТЕМА ---
  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) themeBtn.addEventListener('click', () => window.themeManager.toggle());

  // --- 3. НАВИГАЦИЯ (САЙДБАР) ---
  const navItems = document.querySelectorAll('.admin-nav-item');
  const views = document.querySelectorAll('.admin-view');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // 1. Сброс стилей кнопок
      navItems.forEach(nav => {
        nav.classList.remove('text-accent', 'bg-accent/10');
        nav.classList.add('text-text-secondary', 'hover:text-text-primary', 'hover:bg-bg-elevated');
      });
      // 2. Активация текущей
      item.classList.remove('text-text-secondary', 'hover:text-text-primary', 'hover:bg-bg-elevated');
      item.classList.add('text-accent', 'bg-accent/10');

      // 3. Смена контента
      const targetId = item.getAttribute('data-target');
      views.forEach(view => {
        view.classList.add('hidden');
        if (view.id === targetId) view.classList.remove('hidden');
      });

      // 3.1 ПЕРЕРИСОВКА ГРАФИКОВ, если мы вернулись на дашборд
      if (targetId === 'view-dashboard') {
        setTimeout(initCharts, 50);
      }

      // 4. Закрываем сайдбар на мобильных
      if (window.innerWidth < 768) {
        toggleMobileSidebar(false);
      }
    });
  });

  // Мобильный сайдбар
  function toggleMobileSidebar(show) {
    if (show) {
      sidebar.classList.remove('translate-x-full');
      overlay.classList.remove('hidden');
    } else {
      sidebar.classList.add('translate-x-full');
      overlay.classList.add('hidden');
    }
  }

  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', () => toggleMobileSidebar(true));
  }
  if (overlay) {
    overlay.addEventListener('click', () => toggleMobileSidebar(false));
  }


  // --- 4. ДАННЫЕ И ТАБЛИЦЫ ---
  const mockUsers = [
    { id: 'usr_1', email: 'engineer@plant-p11.ru', company: 'Цех №11', role: 'Инженер' },
    { id: 'usr_2', email: 'admin@plant.ru', company: 'ООО «ПромСтанкоСервис»', role: 'Админ' },
    { id: 'usr_3', email: 'test@test.ru', company: 'ИП Тестов', role: 'Клиент' },
    { id: 'usr_4', email: 'boss@machine.ru', company: 'АО «Станкозавод»', role: 'Клиент' },
  ];

  const mockDevices = [
    { id: 'unit_001', name: 'Токарный ЧПУ #1 (Шпиндель)', status: 'OK', threshold: 3.5 },
    { id: 'unit_002', name: 'Фрезерный B-4 (Подшипник)', status: 'ALARM', threshold: 3.5 },
    { id: 'unit_005', name: 'Компрессор #2', status: 'CALIBRATING', threshold: 3.2 },
    { id: 'unit_006', name: 'Шлифовальный #3', status: 'OK', threshold: 4.0 },
  ];

  const usersTbody = document.getElementById('users-tbody');
  const devicesTbody = document.getElementById('devices-tbody');
  const searchUsers = document.getElementById('search-users');
  const searchDevices = document.getElementById('search-devices');

  function renderUsers(query = '') {
    const q = query.toLowerCase();
    const filtered = mockUsers.filter(u => u.email.toLowerCase().includes(q) || u.company.toLowerCase().includes(q));
    if (filtered.length === 0) {
      usersTbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-text-muted">Ничего не найдено</td></tr>`;
      return;
    }
    usersTbody.innerHTML = filtered.map(u => `
      <tr class="hover:bg-bg-elevated/30 transition">
        <td class="py-3 px-4 font-mono text-xs text-text-muted">${u.id}</td>
        <td class="py-3 px-4 font-medium text-text-primary">${window.Html.escape(u.email)}</td>
        <td class="py-3 px-4 text-text-secondary">${window.Html.escape(u.company)}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-mono border ${u.role === 'Админ' ? 'bg-status-warn/10 border-status-warn/30 text-status-warn' : 'bg-bg-canvas border-border-subtle text-text-secondary'}">${u.role}</span>
        </td>
        <td class="py-3 px-4 text-right"><button class="text-accent hover:underline text-xs">Изменить</button></td>
      </tr>
    `).join('');
  }

  function renderDevices(query = '') {
    const q = query.toLowerCase();
    const filtered = mockDevices.filter(d => d.id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q));
    if (filtered.length === 0) {
      devicesTbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-text-muted">Ничего не найдено</td></tr>`;
      return;
    }
    devicesTbody.innerHTML = filtered.map(d => {
      let statusClass = 'bg-status-ok/10 border-status-ok/30 text-status-ok';
      if (d.status === 'ALARM') statusClass = 'bg-status-alarm/10 border-status-alarm/30 text-status-alarm';
      if (d.status === 'CALIBRATING') statusClass = 'bg-status-warn/10 border-status-warn/30 text-status-warn';
      return `
        <tr class="hover:bg-bg-elevated/30 transition">
          <td class="py-3 px-4 font-mono text-xs text-accent">${window.Html.escape(d.id)}</td>
          <td class="py-3 px-4 font-medium text-text-primary">${window.Html.escape(d.name)}</td>
          <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[11px] font-mono border ${statusClass}">${d.status}</span></td>
          <td class="py-3 px-4 font-mono text-text-secondary">${d.threshold}</td>
          <td class="py-3 px-4 text-right"><button class="text-status-alarm hover:underline text-xs">Удалить</button></td>
        </tr>
      `;
    }).join('');
  }

  function initData() {
    renderUsers();
    renderDevices();
    searchUsers.addEventListener('input', (e) => renderUsers(e.target.value));
    searchDevices.addEventListener('input', (e) => renderDevices(e.target.value));
  }

  // --- 5. ГРАФИКИ ---
  function initCharts() {
    // Данные для графиков
    const labels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];
    const usersData = [4, 6, 8, 11, 12, 14];
    const revenueData = [24500, 38000, 62000, 85000, 110000, 144500];

    // Функция получения цвета с учетом темы
    const getColor = (varName) => {
      const temp = document.createElement('div');
      temp.style.color = `var(${varName})`;
      document.body.appendChild(temp);
      const color = getComputedStyle(temp).color;
      temp.remove();
      return color;
    };

    const colorAccent = getColor('--color-accent-primary');
    const colorBorder = getColor('--color-border-subtle');
    const colorTextMuted = getColor('--color-text-muted');
    const colorBg = getColor('--color-bg-canvas');
    const colorOk = getColor('--color-status-ok'); // для графика выручки
    // Настройки для текста
    const fontStr = '10px "JetBrains Mono", monospace';

    // Функция отрисовки сетки и осей
    const drawGrid = (ctx, width, height, padding, maxVal, steps = 4) => {
      ctx.strokeStyle = colorBorder;
      ctx.lineWidth = 1;
      ctx.fillStyle = colorTextMuted;
      ctx.font = fontStr;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= steps; i++) {
        const val = (maxVal / steps) * i;
        const y = padding.top + (height - padding.top - padding.bottom) - (val / maxVal) * (height - padding.top - padding.bottom);
        
        // Линия
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // Подпись
        ctx.fillText(val.toFixed(0), padding.left - 8, y);
      }

      // Подписи оси X
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const plotW = width - padding.left - padding.right;
      labels.forEach((label, i) => {
        const x = padding.left + (i / (labels.length - 1)) * plotW;
        ctx.fillText(label, x, height - padding.bottom + 8);
      });
    };

    // 1. Отрисовка Столбчатого графика (Пользователи)
    const canvasUsers = document.getElementById('chart-users');
    if (canvasUsers) {
      const ctx = canvasUsers.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvasUsers.parentElement.getBoundingClientRect();
      canvasUsers.width = rect.width * dpr;
      canvasUsers.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const pad = { top: 20, right: 10, bottom: 30, left: 30 };
      const maxV = Math.max(...usersData) * 1.2; // запас сверху

      drawGrid(ctx, w, h, pad, maxV);

      const plotW = w - pad.left - pad.right;
      const barW = (plotW / usersData.length) * 0.5;
      const gap = (plotW / usersData.length - barW) / 2;

      usersData.forEach((val, i) => {
        const x = pad.left + i * (plotW / usersData.length) + gap;
        const barH = (val / maxV) * (h - pad.top - pad.bottom);
        const y = h - pad.bottom - barH;

        // Градиент для столбцов
        const grad = ctx.createLinearGradient(0, y, 0, h - pad.bottom);
        grad.addColorStop(0, colorAccent);
        grad.addColorStop(1, colorAccent + '33'); // прозрачный акцент

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
        ctx.fill();
        
        // Значение над столбцом
        ctx.fillStyle = colorAccent;
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(val, x + barW / 2, y - 4);
      });
    }

    // 2. Отрисовка Линейного графика (Выручка)
    const canvasRev = document.getElementById('chart-revenue');
    if (canvasRev) {
      const ctx = canvasRev.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvasRev.parentElement.getBoundingClientRect();
      canvasRev.width = rect.width * dpr;
      canvasRev.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const pad = { top: 20, right: 20, bottom: 30, left: 45 };
      const maxV = Math.max(...revenueData) * 1.2;

      drawGrid(ctx, w, h, pad, maxV);

      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;
      const getX = (i) => pad.left + (i / (revenueData.length - 1)) * plotW;
      const getY = (val) => h - pad.bottom - (val / maxV) * plotH;

      // Заливка под графиком
      ctx.beginPath();
      revenueData.forEach((val, i) => {
        if (i === 0) ctx.moveTo(getX(i), getY(val));
        else ctx.lineTo(getX(i), getY(val));
      });
      ctx.lineTo(getX(revenueData.length - 1), h - pad.bottom);
      ctx.lineTo(getX(0), h - pad.bottom);
      ctx.closePath();
      
      // Преобразуем HEX/RGB в RGBA с прозрачностью
      const rgba = (color, alpha) => {
        if (color.startsWith('#')) {
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color; // fallback
      };

      const fillGrad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
      fillGrad.addColorStop(0, rgba(colorOk, 0.2));
      fillGrad.addColorStop(1, rgba(colorOk, 0));
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Сама линия
      ctx.beginPath();
      ctx.strokeStyle = colorOk;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      revenueData.forEach((val, i) => {
        if (i === 0) ctx.moveTo(getX(i), getY(val));
        else ctx.lineTo(getX(i), getY(val));
      });
      ctx.stroke();

      // Точки на линии
      revenueData.forEach((val, i) => {
        ctx.beginPath();
        ctx.arc(getX(i), getY(val), 4, 0, Math.PI * 2);
        ctx.fillStyle = colorBg;
        ctx.fill();
        ctx.strokeStyle = colorOk;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  }

  // Вызываем инициализацию графиков в showDashboard()
  const originalShowDashboard = showDashboard;
  showDashboard = function() {
    originalShowDashboard();
    // Ждём, пока CSS-анимации закончатся и canvas получит размеры
    setTimeout(initCharts, 100); 
  };

  // Перерисовка при ресайзе окна
  window.addEventListener('resize', () => {
    if (!document.getElementById('admin-dashboard').classList.contains('hidden')) {
      initCharts();
    }
  });
});