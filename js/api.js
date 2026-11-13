/**
 * ============================================================================
 * GESTERESIS — API & Data Service Layer (js/api.js)
 * ============================================================================
 */

class ApiService {
  constructor() {
    this.token = localStorage.getItem('gesteresis_token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('gesteresis_user') || 'null');
    this.mockSubscription = JSON.parse(localStorage.getItem('gesteresis_mock_sub') || 'null');
    this.ws = null;
    this.wsSubscribers = new Set();
    this.mockIntervalId = null;
    this.mockDevices = [];

    if (APP_CONFIG.USE_MOCK_DATA) {
      this._initMockStorage();
    }
  }

  // ==========================================================================
  // AUTH
  // ==========================================================================

  async getCurrentUser() {
    if (APP_CONFIG.USE_MOCK_DATA) {
      await this._delay(120);
      return this.currentUser;
    }
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.AUTH_ME}`, {
      headers: this._getAuthHeaders(),
    });
    if (!res.ok) return null;
    this.currentUser = await res.json();
    return this.currentUser;
  }

  async login(email, password) {
    if (APP_CONFIG.USE_MOCK_DATA) {
      await this._delay(300);
      if (!email || !password) throw new Error('Введите email и пароль');
      const user = {
        id: 'usr_' + Math.random().toString(36).slice(2, 8),
        name: email.split('@')[0],
        email,
        company: 'Цех №11 • Механообработка',
        subscriptionExpires: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      };
      this.currentUser = user;
      this.token = 'mock_jwt_' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem('gesteresis_token', this.token);
      localStorage.setItem('gesteresis_user', JSON.stringify(user));
      return user;
    }
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.AUTH_LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Ошибка авторизации');
    this.token = data.token;
    this.currentUser = data.user;
    localStorage.setItem('gesteresis_token', this.token);
    localStorage.setItem('gesteresis_user', JSON.stringify(this.currentUser));
    return this.currentUser;
  }

  async register(email, password, company) {
    if (APP_CONFIG.USE_MOCK_DATA) {
      await this._delay(300);
      if (!email || !password || password.length < 6) {
        throw new Error('Пароль должен быть не короче 6 символов');
      }
      const user = {
        id: 'usr_' + Math.random().toString(36).slice(2, 8),
        name: email.split('@')[0],
        email,
        company: company || 'Инженер',
        subscriptionExpires: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      };
      this.currentUser = user;
      this.token = 'mock_jwt_' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem('gesteresis_token', this.token);
      localStorage.setItem('gesteresis_user', JSON.stringify(user));
      return user;
    }
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.AUTH_REGISTER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, company }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Ошибка регистрации');
    this.token = data.token;
    this.currentUser = data.user;
    localStorage.setItem('gesteresis_token', this.token);
    localStorage.setItem('gesteresis_user', JSON.stringify(this.currentUser));
    return this.currentUser;
  }

  async logout() {
    if (!APP_CONFIG.USE_MOCK_DATA) {
      await fetch(`${APP_CONFIG.API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
      }).catch(() => {});
    }
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('gesteresis_token');
    localStorage.removeItem('gesteresis_user');
    if (this.ws) { this.ws.close(); this.ws = null; }
    return true;
  }

  // ==========================================================================
  // SUBSCRIPTION
  // ==========================================================================

  async getSubscription() {
    if (APP_CONFIG.USE_MOCK_DATA) {
      await this._delay(120);
      if (!this.mockSubscription) {
        this.mockSubscription = {
          planName: 'Промышленный (до 25 узлов)',
          expiresAt: new Date(Date.now() + 32 * 24 * 3600 * 1000).toISOString(),
          isActive: true,
        };
        localStorage.setItem('gesteresis_mock_sub', JSON.stringify(this.mockSubscription));
      }
      const isActive = new Date(this.mockSubscription.expiresAt).getTime() > Date.now();
      return { ...this.mockSubscription, isActive };
    }
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.SUBSCRIPTION_PAY}`, {
      headers: this._getAuthHeaders(),
    });
    return res.json();
  }

  async createPaymentSession(planId) {
    if (APP_CONFIG.USE_MOCK_DATA) {
      await this._delay(400);
      const daysMap  = { plan_1m: 30,  plan_6m: 180, plan_12m: 365 };
      const namesMap = { plan_1m: 'Базовый цех (до 5 узлов)', plan_6m: 'Промышленный (до 25 узлов)', plan_12m: 'Корпоративный (Безлимит)' };
      const addDays = daysMap[planId] || 30;
      const baseTime = Math.max(Date.now(), this.mockSubscription ? new Date(this.mockSubscription.expiresAt).getTime() : 0);
      const newExpiry = new Date(baseTime + addDays * 24 * 3600 * 1000).toISOString();
      this.mockSubscription = {
        planName: namesMap[planId] || 'Промышленный',
        expiresAt: newExpiry,
        isActive: true,
      };
      localStorage.setItem('gesteresis_mock_sub', JSON.stringify(this.mockSubscription));
      return this.mockSubscription;
    }
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.SUBSCRIPTION_PAY}`, {
      method: 'POST',
      headers: this._getAuthHeaders(),
      body: JSON.stringify({ plan_id: planId }),
    });
    return res.json();
  }

  // ==========================================================================
  // DEVICES
  // ==========================================================================

  async getDevices() {
    if (APP_CONFIG.USE_MOCK_DATA) {
      await this._delay(200);
      return this.mockDevices;
    }
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.DEVICES_LIST}`, {
      headers: this._getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Не удалось загрузить устройства');
    return data;
  }

  async addDevice({ id, name, nominal_rpm, threshold }) {
    if (APP_CONFIG.USE_MOCK_DATA) {
      await this._delay(250);
      if (this.mockDevices.some(d => d.id === id)) {
        throw new Error(`Устройство с ID "${id}" уже зарегистрировано`);
      }
      const nowSec = Math.floor(Date.now() / 1000);
      const dev = {
        id,
        name,
        threshold: Number(threshold) || APP_CONFIG.DEFAULT_THRESHOLD,
        nominal_rpm: Number(nominal_rpm) || 0,
        model_source: 'MCU',
        cond_number: 520.0,
        telemetry: {
          id, ts: nowSec,
          d_m: 1.45, d_m_filtered: 1.42,
          status: 'OK', rms: 0.035,
          fault_code: 0x0000, fw: '0.3.1',
        },
        history: this._seedHistory(nowSec, 1.45, Number(threshold) || APP_CONFIG.DEFAULT_THRESHOLD, 'OK'),
      };
      this.mockDevices.push(dev);
      this._saveMockStorage();
      return dev;
    }
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.DEVICES_CREATE}`, {
      method: 'POST',
      headers: this._getAuthHeaders(),
      body: JSON.stringify({ id, name, nominal_rpm, threshold }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Не удалось добавить устройство');
    return data;
  }

  async updateDeviceMeta(deviceId, { name }) {
    if (APP_CONFIG.USE_MOCK_DATA) {
      await this._delay(150);
      const dev = this.mockDevices.find(d => d.id === deviceId);
      if (!dev) throw new Error('Устройство не найдено');
      dev.name = name;
      this._saveMockStorage();
      return dev;
    }
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.DEVICE_DETAIL(deviceId)}`, {
      method: 'PATCH',
      headers: this._getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    return res.json();
  }

  async sendCommand(deviceId, cmd, params = {}) {
    if (APP_CONFIG.USE_MOCK_DATA) {
      await this._delay(300);
      const dev = this.mockDevices.find(d => d.id === deviceId);
      if (!dev) throw new Error(`Устройство ${deviceId} не найдено`);
      const ts = Math.floor(Date.now() / 1000);

      switch (cmd) {
        case 'CALIBRATE': {
          if (dev.telemetry.status === 'CALIBRATING') {
            return { cmd, result: 'BUSY', source: 'MCU', ts, detail: 'Калибровка уже выполняется' };
          }
          dev.telemetry.status = 'CALIBRATING';
          setTimeout(() => {
            dev.telemetry.status = 'OK';
            dev.telemetry.d_m = 1.15;
            dev.telemetry.d_m_filtered = 1.12;
            dev.telemetry.fault_code &= ~0x0080;
            dev.model_source = 'MCU';
          }, 4000);
          return { cmd, result: 'OK', source: 'MCU', ts, detail: `Сбор окон (${params.duration_s || 30}с)` };
        }
        case 'SET_THRESHOLD': {
          const val = Number(params.threshold);
          if (isNaN(val) || val <= 0) throw new Error('Некорректный порог');
          dev.threshold = val;
          if (dev.telemetry.status !== 'SENSOR_FAULT' && dev.telemetry.status !== 'CALIBRATING') {
            dev.telemetry.status = dev.telemetry.d_m_filtered > val ? 'ALARM' : 'OK';
          }
          this._saveMockStorage();
          return { cmd, result: 'OK', source: 'MCU', ts, detail: `threshold = ${val} записан в NVS` };
        }
        case 'SET_RPM': {
          const rpm = Number(params.nominal_rpm);
          if (isNaN(rpm) || rpm < 0) throw new Error('Некорректный RPM');
          dev.nominal_rpm = rpm;
          this._saveMockStorage();
          return { cmd, result: 'OK', source: 'MCU', ts, detail: `nominal_rpm = ${rpm}` };
        }
        case 'CLEAR_FAULT': {
          dev.telemetry.fault_code = 0x0000;
          if (dev.telemetry.status === 'SENSOR_FAULT') {
            dev.telemetry.status = dev.telemetry.d_m_filtered > dev.threshold ? 'ALARM' : 'OK';
          }
          this._saveMockStorage();
          return { cmd, result: 'OK', source: 'MCU', ts, detail: 'Latch ошибок сброшен' };
        }
        case 'RESET': {
          dev.telemetry.status = 'OK';
          dev.telemetry.d_m = 1.2;
          dev.telemetry.d_m_filtered = 1.2;
          this._saveMockStorage();
          return { cmd, result: 'OK', source: 'MCU', ts, detail: 'ESP32-S3 перезагружен' };
        }
        default:
          throw new Error(`Неизвестная команда: ${cmd}`);
      }
    }
    const res = await fetch(`${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.DEVICE_CMD(deviceId)}`, {
      method: 'POST',
      headers: this._getAuthHeaders(),
      body: JSON.stringify({ cmd, params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Ошибка команды ${cmd}`);
    return data;
  }

  // ==========================================================================
  // TELEMETRY STREAM
  // ==========================================================================

  subscribeTelemetry(callback) {
    this.wsSubscribers.add(callback);

    if (APP_CONFIG.USE_MOCK_DATA) {
      if (!this.mockIntervalId) {
        this.mockIntervalId = setInterval(() => this._tickMockTelemetry(), APP_CONFIG.TELEMETRY_INTERVAL_MS);
      }
    } else if (!this.ws) {
      this._initWebSocket();
    }

    return () => {
      this.wsSubscribers.delete(callback);
      if (this.wsSubscribers.size === 0) {
        if (this.mockIntervalId) { clearInterval(this.mockIntervalId); this.mockIntervalId = null; }
        if (this.ws) { this.ws.close(); this.ws = null; }
      }
    };
  }

  // ==========================================================================
  // MOCK HELPERS
  // ==========================================================================

  _initMockStorage() {
    const saved = localStorage.getItem('gesteresis_mock_devices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length && parsed[0].telemetry) {
          this.mockDevices = parsed;
          return;
        }
      } catch (e) { /* ignore */ }
    }
    // Свежий стартовый набор
    const nowSec = Math.floor(Date.now() / 1000);
    this.mockDevices = [
      {
        id: 'unit_001',
        name: 'Токарный станок ЧПУ #1 (Шпиндель)',
        threshold: 3.5,
        nominal_rpm: 1500,
        model_source: 'SERVER',
        cond_number: 412.8,
        telemetry: { id: 'unit_001', ts: nowSec, d_m: 1.84, d_m_filtered: 1.79, status: 'OK', rms: 0.042, fault_code: 0x0000, fw: '0.3.1' },
        history: this._seedHistory(nowSec, 1.75, 3.5, 'OK'),
      },
      {
        id: 'unit_002',
        name: 'Фрезерный узел B-4 (Подшипник опоры)',
        threshold: 3.5,
        nominal_rpm: 2400,
        model_source: 'MCU',
        cond_number: 1840.2,
        telemetry: { id: 'unit_002', ts: nowSec, d_m: 4.38, d_m_filtered: 4.19, status: 'ALARM', rms: 0.168, fault_code: 0x0000, fw: '0.3.1' },
        history: this._seedHistory(nowSec, 4.1, 3.5, 'ALARM'),
      },
      {
        id: 'unit_005',
        name: 'Компрессорная станция #2 (Винтовой блок)',
        threshold: 3.2,
        nominal_rpm: 0,
        model_source: 'MCU',
        cond_number: 2.4e10,
        telemetry: { id: 'unit_005', ts: nowSec, d_m: 2.15, d_m_filtered: 2.12, status: 'CALIBRATING', rms: 0.031, fault_code: 0x0080, fw: '0.3.0' },
        history: this._seedHistory(nowSec, 2.1, 3.2, 'CALIBRATING'),
      },
    ];
    this._saveMockStorage();
  }

  _seedHistory(nowSec, baseDm, threshold, status) {
    const points = [];
    let filtered = baseDm;
    const N = APP_CONFIG.MAX_HISTORY_POINTS;
    for (let i = N - 1; i >= 0; i--) {
      const ts = nowSec - i * 5;
      const trend = status === 'ALARM' ? (N - i) * 0.035 : 0;
      const raw = Math.max(0.2, +(baseDm - 0.6 + trend + (Math.random() - 0.48) * 0.5).toFixed(3));
      filtered = +(filtered + 0.32 * (raw - filtered)).toFixed(3);
      points.push({ ts, d_m: raw, d_m_filtered: filtered });
    }
    return points;
  }

  _saveMockStorage() {
    localStorage.setItem('gesteresis_mock_devices', JSON.stringify(this.mockDevices));
  }

  _tickMockTelemetry() {
    const nowSec = Math.floor(Date.now() / 1000);
    this.mockDevices.forEach((dev) => {
      if (dev.telemetry.status === 'CALIBRATING') {
        // имитация прогрева — статус меняется в CALIBRATE
      } else {
        const prev = dev.telemetry;
        let rawDm;
        if (prev.status === 'ALARM') {
          rawDm = +(dev.threshold + 0.35 + (Math.random() - 0.35) * 0.9).toFixed(2);
        } else {
          const spike = Math.random() > 0.88 ? 0.65 : 0;
          rawDm = +(Math.max(0.4, dev.threshold * 0.5 + (Math.random() - 0.5) * 0.55 + spike)).toFixed(2);
        }
        const filtered = +(prev.d_m_filtered + 0.35 * (rawDm - prev.d_m_filtered)).toFixed(2);
        const rms = +(0.03 + filtered * 0.025 + (Math.random() - 0.5) * 0.008).toFixed(3);

        let nextStatus = prev.status;
        if (prev.status === 'OK' && filtered > dev.threshold) nextStatus = 'ALARM';
        else if (prev.status === 'ALARM' && filtered < dev.threshold * APP_CONFIG.HYSTERESIS_EXIT_RATIO) nextStatus = 'OK';

        dev.telemetry = { ...prev, ts: nowSec, d_m: rawDm, d_m_filtered: filtered, status: nextStatus, rms };
        dev.history.push({ ts: nowSec, d_m: rawDm, d_m_filtered: filtered });
        if (dev.history.length > APP_CONFIG.MAX_HISTORY_POINTS) dev.history.shift();
      }

      // Отдаём подписчикам сам объект устройства
      this.wsSubscribers.forEach(cb => cb(dev));
    });
    this._saveMockStorage();
  }

  _initWebSocket() {
    try {
      this.ws = new WebSocket(`${APP_CONFIG.WS_URL}?token=${encodeURIComponent(this.token || '')}`);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Бэкенд должен присылать сам объект устройства либо { data: device }
          const device = msg.data && msg.data.telemetry ? msg.data : msg;
          this.wsSubscribers.forEach(cb => cb(device));
        } catch (e) {
          console.error('WS parse error', e);
        }
      };
      this.ws.onerror = (err) => console.warn('WS error', err);
    } catch (e) {
      console.warn('WS init failed', e);
    }
  }

  _getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

window.api = new ApiService();