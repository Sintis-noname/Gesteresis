# GESTERESIS — Edge AI Predictive Diagnostics

![Version](https://img.shields.io/badge/version-0.6.6-blue)
![Protocol](https://img.shields.io/badge/protocol-v0.3-green)
![License](https://img.shields.io/badge/license-Proprietary-red)

Веб-панель для мониторинга и предиктивной диагностики промышленного оборудования на базе микроконтроллеров **ESP32-S3**. Система в реальном времени отслеживает состояние узлов через расстояние Махаланобиса (D_m), применяет фильтр Калмана (1D) и управляет моделями калибровки, хранящимися в NVS.

---

## 📋 Содержание

- [Возможности](#-возможности)
- [Архитектура](#-архитектура)
- [Технологический стек](#-технологический-стек)
- [Структура проекта](#-структура-проекта)
- [Быстрый старт](#-быстрый-старт)
- [Конфигурация](#-конфигурация)
- [MQTT-протокол](#-mqtt-протокол)
- [Дизайн-система](#-дизайн-система)
- [Роутинг (SPA)](#-роутинг-spa)
- [Лицензия](#-лицензия)
- [Контакты](#-контакты)

---

## 🚀 Возможности

### Мониторинг в реальном времени
- **KPI-панель** — сводная статистика по всем узлам: OK / ALARM / CALIBRATING / FAULT
- **Карточки устройств** — живой график D_m, статус, тренд, флаги ошибок
- **WebSocket / SSE / MQTT-стрим** — обновление телеметрии каждые 5 секунд (настраивается)

### Управление устройствами
- **Настройки узла** — переименование, смена порога D_m и номинала RPM
- **Автономная калибровка** — запуск `CALIBRATE` на MCU (сбор окон, расчёт µ, S⁻¹, threshold, запись `CalibrationBlob` в NVS)
- **Системные команды** — `CLEAR_FAULT` (сброс latch), `RESET` (перезагрузка ESP32)
- **Лог ответов** — `model_ack` / `status` от устройства в реальном времени

### Аутентификация и подписка
- Регистрация предприятия и вход инженера
- Управление подпиской Gesteresis Cloud (1 / 6 / 12 месяцев)
- Роли: администратор, инженер, наблюдатель

### UX / UI
- **Тёмная и светлая темы** (переключатель, сохранение в `localStorage`)
- **Адаптивная вёрстка** — от мобильных до широких мониторов
- **Toast-уведомления**, модальные окна, скелетоны загрузки
- **Юридические страницы** — privacy, terms, pd, cookies, security, contacts

---

## 🏗 Архитектура

```
┌─────────────────┐      MQTT (p11/gesteresis/+)      ┌──────────────────┐
│  ESP32-S3 узлы  │ ────────────────────────────────▶ │  MQTT-брокер     │
│  (Edge AI)      │ ◀──────────────────────────────── │  (Gesteresis)    │
└─────────────────┘        p11/gesteresis/<id>/cmd   └────────┬─────────┘
                                                               │
                                                     WebSocket / SSE
                                                               │
                                                     ┌─────────▼─────────┐
                                                     │  Web Dashboard    │
                                                     │  (этот репозиторий)│
                                                     └───────────────────┘
```

- **Edge (A1)** — расчёт D_m и фильтра Калмана выполняется **на MCU** (MCU-first)
- **Server (A2)** — опциональный Server-Refinement моделей (NumPy) для тарифов «Промышленный» и «Корпоративный»
- **Frontend** — SPA без фреймворков (vanilla JS + Tailwind CSS), общается с брокером через WebSocket

---

## 🛠 Технологический стек

| Слой | Технологии |
|------|-----------|
| **Разметка** | HTML5, семантические теги |
| **Стили** | Tailwind CSS (CDN), CSS-переменные, кастомные темы |
| **Шрифты** | Inter (UI), JetBrains Mono (код/данные) |
| **Логика** | Vanilla JavaScript (ES2020+), модульная структура |
| **Графики** | Canvas 2D API (кастомный рендер) |
| **Транспорт** | WebSocket, SSE, MQTT (fallback: mock-стрим) |
| **Хранение** | `localStorage` (тема, токены), NVS на устройстве |

---

## 📁 Структура проекта

```
gesteresis-dashboard/
├── index.html                  # Точка входа, SPA-viewport
├── css/
│   ├── tokens.css              # Дизайн-токены (цвета, радиусы, отступы)
│   ├── style.css               # Базовые стили, утилиты
│   └── themes/
│       ├── dark.css            # Тёмная тема
│       └── light.css           # Светлая тема
├── js/
│   ├── config.js               # Конфигурация (брокер, режимы, фичи)
│   ├── api.js                  # HTTP-клиент (auth, devices, subscription)
│   ├── app.js                  # Инициализация приложения
│   ├── router.js               # Хэш-роутер SPA
│   ├── theme.js                # Переключатель тем
│   ├── chart.js                # Рендер графиков D_m
│   ├── forms.js                # Обработчики форм и команд
│   ├── utils/
│   │   └── html.js             # Экранирование, шаблоны, хелперы
│   └── components/
│       ├── landing.js          # Лендинг
│       ├── device-card.js      # Карточка чипа
│       ├── device-detail.js    # Детальная страница устройства
│       ├── kpi-bar.js          # KPI-панель
│       ├── legal.js            # Юридические страницы
│       ├── profile.js          # Профиль пользователя
│       └── toast.js            # Toast-уведомления
└── README.md
```

---

## ⚡ Быстрый старт

### Требования
- Любой современный браузер (Chrome 90+, Firefox 88+, Safari 14+)
- Локальный HTTP-сервер (для корректной работы модулей и API)

### Запуск

```bash
# Клонируйте репозиторий
git clone https://github.com/your-org/gesteresis-dashboard.git
cd gesteresis-dashboard

# Запустите локальный сервер (любой из вариантов)
python3 -m http.server 8080
# или
npx serve .
# или
php -S localhost:8080
```

Откройте [http://localhost:8080](http://localhost:8080) в браузере.

> **Примечание:** без бэкенда приложение запускается в режиме `MOCK_STREAM` — генерирует демо-данные. Для подключения к реальному брокеру см. раздел [Конфигурация](#-конфигурация).

---

## ⚙️ Конфигурация

Все настройки сосредоточены в `js/config.js`:

```javascript
export const CONFIG = {
  // Режим работы: 'mock' | 'websocket' | 'sse' | 'mqtt'
  backendMode: 'mock',
  
  // MQTT-брокер
  mqtt: {
    url: 'wss://broker.gesteresis.ru/mqtt',
    topicPrefix: 'p11/gesteresis',
    telemetrySuffix: '/telemetry',
    cmdSuffix: '/cmd',
  },
  
  // WebSocket / SSE
  wsUrl: 'wss://api.gesteresis.ru/stream',
  sseUrl: 'https://api.gesteresis.ru/events',
  
  // HTTP API
  apiBase: 'https://api.gesteresis.ru/v1',
  
  // Интервал обновления телеметрии (мс)
  streamInterval: 5000,
  
  // Feature flags
  features: {
    serverRefinement: false,
    otaUpdates: false,
    auditMode: false,
  },
};
```

---

## 📡 MQTT-протокол

### Топики

| Направление | Топик | Назначение |
|-------------|-------|-----------|
| Device → Broker | `p11/gesteresis/<id>/telemetry` | Телеметрия (D_m, RPM, флаги) |
| Broker → Device | `p11/gesteresis/<id>/cmd` | Команды управления |
| Device → Broker | `p11/gesteresis/<id>/status` | Статус устройства |
| Device → Broker | `p11/gesteresis/<id>/model_ack` | Подтверждение команд модели |

### Формат телеметрии

```json
{
  "id": "unit_001",
  "ts": 1732345678901,
  "dm": 1.42,
  "rpm": 1485,
  "status": "OK",
  "flags": 0,
  "kalman": 1.38
}
```

### Команды

| Команда | Payload | Описание |
|---------|---------|----------|
| `SET_THRESHOLD` | `{"value": 3.5}` | Новый порог D_m (запись в NVS) |
| `SET_RPM` | `{"value": 1500}` | Номинал RPM (бины 9,10) |
| `CALIBRATE` | `{"duration": 30}` | Автономная калибровка (сек) |
| `CLEAR_FAULT` | `{}` | Сброс latch ошибки |
| `RESET` | `{}` | Перезагрузка ESP32 |

### Статусы

| Статус | Цвет | Значение |
|--------|------|----------|
| `OK` | 🟢 зелёный | D_m ≤ threshold |
| `ALARM` | 🔴 красный | D_m > threshold |
| `WARN` | 🟡 жёлтый | Калибровка / флаги |
| `CALIBRATING` | 🟡 жёлтый | Идёт сбор окон |
| `FAULT` | 🔴 красный | Аппаратная ошибка (latch) |

---

## 🎨 Дизайн-система

### Семантические токены

Все цвета определены через CSS-переменные в `css/tokens.css` и переопределяются в темах:

```css
--color-bg-canvas
--color-bg-surface
--color-bg-elevated
--color-border-subtle
--color-border-strong
--color-text-primary
--color-text-secondary
--color-text-muted
--color-accent-primary
--color-accent-danger
--color-status-ok
--color-status-alarm
--color-status-warn
--color-status-calib
```

### Tailwind-классы

В HTML используются только семантические классы:

```html
<div class="bg-bg-surface border border-border-subtle rounded-card">
  <span class="text-text-primary">...</span>
  <span class="text-status-ok">OK</span>
</div>
```

### Переключение темы

```javascript
// Программно
document.documentElement.setAttribute('data-theme', 'light');

// Пользователь — кнопка #btn-toggle-theme (js/theme.js)
```

---

## 🧭 Роутинг (SPA)

| Маршрут | View | Компонент |
|---------|------|-----------|
| `#/` | `landing` | `Landing.render()` |
| `#/dashboard` | `dashboard` | `KpiBar`, `DeviceCard` |
| `#/device/:id` | `device-detail` | `DeviceDetail.render()` |
| `#/profile` | `profile` | `Profile.render()` |
| `#/legal/privacy` | `legal` | `Legal.render('privacy')` |
| `#/legal/terms` | `legal` | `Legal.render('terms')` |
| `#/legal/pd` | `legal` | `Legal.render('pd')` |
| `#/legal/cookies` | `legal` | `Legal.render('cookies')` |
| `#/legal/security` | `legal` | `Legal.render('security')` |
| `#/legal/contacts` | `legal` | `Legal.render('contacts')` |

Роутер — хэш-базированный, без зависимостей (`js/router.js`).

---

## 🔐 Безопасность

- Все пользовательские данные экранируются через `js/utils/html.js` (защита от XSS)
- Токены авторизации хранятся в `localStorage` (не в cookies)
- Команды на устройство отправляются только аутентифицированным пользователем
- HTTPS/WSS обязательны для production
- `CalibrationBlob` (644 байта, NVS) не покидает устройство без явного запроса

---

## 🧪 Режимы работы

| Режим | `backendMode` | Описание |
|-------|---------------|----------|
| **Mock** | `'mock'` | Демо-данные, не требует бэкенда |
| **WebSocket** | `'websocket'` | Прямой стрим с API |
| **SSE** | `'sse'` | Server-Sent Events |
| **MQTT** | `'mqtt'` | Прямое подключение к брокеру |

Текущий режим отображается в бейдже `#backend-mode-badge` на дашборде.

---

## 🗺 Roadmap

- [x] **v0.6.6** — базовый дашборд, карточки, KPI, темы
- [ ] **v0.7.0** — реальный MQTT-клиент (`mqtt.js`), авторизация на брокере
- [ ] **v0.8.0** — Server-Refinement (A2) через NumPy-микросервис
- [ ] **v0.9.0** — OTA-обновления прошивок ESP32
- [ ] **v1.0.0** — сборка Tailwind (PostCSS), продакшен-бандл, e2e-тесты

---

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку: `git checkout -b feature/my-feature`
3. Закоммитьте изменения: `git commit -m 'feat: add my feature'`
4. Запушьте: `git push origin feature/my-feature`
5. Откройте Pull Request

**Стиль коммитов:** [Conventional Commits](https://www.conventionalcommits.org/ru/).

---

## 📄 Лицензия

**Proprietary.** © 2025 Gesteresis / ООО «ПРОЕКТ 11». Все права защищены.

Использование, копирование и распространение кода без письменного разрешения правообладателя запрещены.

---

## 📬 Контакты

- **Организация:** ООО «ПРОЕКТ 11»
- **ИНН:** 0272938548
- **Адрес:** 123456, г. Белебей, ул. Лесная, д. 12
- **Email:** [support@gesteresis.ru](mailto:support@gesteresis.ru)
- **Юридические документы:** [Политика конфиденциальности](#/legal/privacy) • [Пользовательское соглашение](#/legal/terms) • [Безопасность и SLA](#/legal/security)

---

<div align="center">

**GESTERESIS EDGE AI SYSTEM** • PROTOCOL v0.3 (ADR-0003 / ADR-0004)

`CALIBRATION BLOB: 644 BYTES (NVS)` • `DIM: 12 FEATURES`

</div>
