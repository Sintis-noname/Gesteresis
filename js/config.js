/**
 * ============================================================================
 * GESTERESIS — Application Configuration & Domain Constants (js/config.js)
 * ============================================================================
 */

window.APP_CONFIG = Object.freeze({
  USE_MOCK_DATA: true,
  API_BASE_URL: 'http://localhost:8000/api/v1',
  WS_URL: 'ws://localhost:8000/ws/telemetry',
  TELEMETRY_INTERVAL_MS: 5000,
  MAX_HISTORY_POINTS: 36,          // ← добавлено: буфер истории для графика
  DEFAULT_THRESHOLD: 3.5,
  HYSTERESIS_EXIT_RATIO: 0.8,
  FEATURE_DIM: 12,
  MODEL_VERSION: 1,
  CALIBRATION_BLOB_SIZE: 644,

  ENDPOINTS: Object.freeze({
    AUTH_LOGIN: '/auth/login',
    AUTH_REGISTER: '/auth/register',
    AUTH_ME: '/auth/me',
    SUBSCRIPTION_PAY: '/billing/subscribe',
    DEVICES_LIST: '/devices',
    DEVICES_CREATE: '/devices',
    DEVICE_DETAIL: (id) => `/devices/${encodeURIComponent(id)}`,
    DEVICE_TELEMETRY_HISTORY: (id) => `/devices/${encodeURIComponent(id)}/telemetry`,
    DEVICE_CMD: (id) => `/devices/${encodeURIComponent(id)}/cmd`,
  }),
});

/**
 * Глобальный массив fault-кодов (для decodeFaultMask и рендеринга бейджей).
 * Совместим с битовой маской fault_code из interfaces.md §7.2.
 */
const FAULT_CODES = [
  { mask: 0x0001, name: 'SENSOR_FROZEN',         label: 'Сигнал не меняется > 2с',         severity: 'fault' },
  { mask: 0x0002, name: 'SENSOR_NOISE_ZERO',     label: 'Нулевая дисперсия (обрыв)',       severity: 'fault' },
  { mask: 0x0004, name: 'SENSOR_OUT_OF_RANGE',   label: 'Выход за ±16 g',                  severity: 'fault' },
  { mask: 0x0008, name: 'WIFI_DOWN',             label: 'Wi-Fi отключён > 30с',            severity: 'warn'  },
  { mask: 0x0010, name: 'NVS_CORRUPT',           label: 'Ошибка CRC/magic в NVS',          severity: 'fault' },
  { mask: 0x0020, name: 'MQTT_DOWN',             label: 'MQTT отключён > 60с',             severity: 'warn'  },
  { mask: 0x0040, name: 'OTA_IN_PROGRESS',       label: 'Идёт OTA-обновление',             severity: 'info'  },
  { mask: 0x0080, name: 'MODEL_ILL_CONDITIONED', label: 'Плохая обусловленность S (A1)',   severity: 'diag'  },
  { mask: 0x0100, name: 'MODEL_DEGENERATE',      label: 'Вырожденная матрица S (trace≈0)', severity: 'diag'  },
  { mask: 0x0200, name: 'CALIB_REJECTED',        label: 'Серверная модель отклонена (A2)', severity: 'diag'  },
];

/**
 * Схема 12 признаков вектора x[12] (interfaces.md §1).
 * Используется на странице детальной диагностики (#/device/{id}).
 */
const FEATURE_SCHEMA_X12 = [
  { idx: 0,  key: 'rms_x',     desc: 'RMS по оси X',                        unit: 'g'  },
  { idx: 1,  key: 'rms_y',     desc: 'RMS по оси Y',                        unit: 'g'  },
  { idx: 2,  key: 'rms_z',     desc: 'RMS по оси Z',                        unit: 'g'  },
  { idx: 3,  key: 'cf_x',      desc: 'Crest Factor по оси X (Peak / RMS)',  unit: '—'  },
  { idx: 4,  key: 'cf_y',      desc: 'Crest Factor по оси Y',               unit: '—'  },
  { idx: 5,  key: 'cf_z',      desc: 'Crest Factor по оси Z',               unit: '—'  },
  { idx: 6,  key: 'kurt_x',    desc: 'Kurtosis по оси X',                   unit: '—'  },
  { idx: 7,  key: 'kurt_y',    desc: 'Kurtosis по оси Y',                   unit: '—'  },
  { idx: 8,  key: 'kurt_z',    desc: 'Kurtosis по оси Z',                   unit: '—'  },
  { idx: 9,  key: 'amp_1x',    desc: 'Амплитуда в бине 1×RPM',              unit: 'g'  },
  { idx: 10, key: 'amp_2_3x',  desc: 'Сумма амплитуд в бинах 2× и 3×RPM',   unit: 'g'  },
  { idx: 11, key: 'energy_hf', desc: 'Энергия в полосе 2–5 кГц',            unit: 'g²' },
];

/**
 * Декодирует битовую маску fault_code в массив активных ошибок.
 */
function decodeFaultMask(faultCode) {
  if (!faultCode || faultCode === 0) return [];
  return FAULT_CODES.filter(fc => (faultCode & fc.mask) !== 0);
}