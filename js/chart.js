/**
 * ============================================================================
 * GESTERESIS — Telemetry Chart Renderer (js/chart.js)
 * ============================================================================
 * Что рисуется:
 *  - Сырой сигнал d_m (полупрозрачная линия)
 *  - Сглаженный фильтром Калмана d_m_filtered (основная линия + градиент)
 *  - Линия порога threshold (пунктирная)
 *  - Линия гистерезиса возврата 0.8 * threshold (пунктирная)
 *  - Опасная зона выше threshold (лёгкая заливка)
 *  - Сетка, подписи оси Y и временные метки оси X
 *  - Интерактивный crosshair-курсор и тултип при hoverIndex !== null
 *
 * ЦВЕТА: все значения берутся из CSS-переменных --chart-* (см. tokens.css
 * и themes/*.css). Никаких хардкод-цветов в этом файле быть не должно —
 * иначе тема сломается.
 *
 * Зависимости:
 *  - window.APP_CONFIG (js/config.js) — HYSTERESIS_EXIT_RATIO, DEFAULT_THRESHOLD
 *  - device: { id, threshold, nominal_rpm, history, telemetry: { status } }
 * ============================================================================
 */

// Геометрия и layout-константы графика.
// Вынесены сюда, чтобы не искать по коду "откуда взялось 190" через полгода.
const CHART = {
  HEIGHT: 190,
  MIN_WIDTH: 260,
  PADDING: { top: 18, right: 16, bottom: 26, left: 40 },
  GRID_STEPS: 4,
  Y_HEADROOM: 1.25,        // запас над threshold по оси Y
  Y_DATA_HEADROOM: 1.12,   // запас над фактическим максимумом данных
  POINT_RADIUS: 4,
  HOVER_POINT_RADIUS: 4.5,
  TOOLTIP_HEIGHT: 20,
  TOOLTIP_PADDING_X: 14,   // ширина = measureText + этот паддинг
  TOOLTIP_TEXT_OFFSET_X: 7,
  TOOLTIP_RADIUS: 6,
  FONT: '10px "JetBrains Mono", monospace',
};

class TelemetryChartRenderer {
  /**
   * Читает актуальные цвета из CSS-переменных.
   * Вызывается ОДИН РАЗ за draw() — не внутри циклов.
   *
   * @returns {Object} цвета, готовые к использованию в ctx.strokeStyle / fillStyle
   */
  static _getThemeColors() {
    const root = document.documentElement;
    const s = getComputedStyle(root);
    const get = (name, fallback = '#000000') => {
      const v = s.getPropertyValue(name).trim();
      return v || fallback;
    };
    return {
      grid:           get('--chart-grid', 'rgba(148,163,184,0.12)'),
      threshold:      get('--chart-threshold', '#f43f5e'),
      hysteresis:     get('--chart-hysteresis', 'rgba(251,191,36,0.45)'),
      main:           get('--chart-line-main', '#22d3ee'),
      mainAlarm:      get('--chart-line-main-alarm', '#fb7185'),
      fillMain:       get('--chart-fill-main', 'rgba(34,211,238,0.25)'),
      fillAlarm:      get('--chart-fill-alarm', 'rgba(244,63,94,0.28)'),
      crosshair:      get('--chart-crosshair', 'rgba(226,232,240,0.35)'),
      tooltipBg:      get('--chart-tooltip-bg', 'rgba(15,23,42,0.92)'),
      tooltipBorder:  get('--chart-tooltip-border', 'rgba(56,189,248,0.5)'),
      axisLabel:      get('--chart-axis-label', '#64748b'),
      textPrimary:    get('--color-text-primary', '#f8fafc'),
    };
  }

  /**
   * Основной метод отрисовки.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {Object} device
   * @param {number|null} hoverIndex
   */
  static draw(canvas, device, hoverIndex = null) {
    if (!canvas || !device) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    const width = Math.max(CHART.MIN_WIDTH, rect.width);
    const height = CHART.HEIGHT;

    // Синхронизация физического размера canvas с CSS-размером (DPR)
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // ── Цвета темы читаем ОДИН раз за кадр ──
    const C = this._getThemeColors();

    const pad = CHART.PADDING;
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const history = Array.isArray(device.history) ? device.history : [];
    const threshold = typeof device.threshold === 'number'
      ? device.threshold
      : (window.APP_CONFIG?.DEFAULT_THRESHOLD ?? 3.5);

    const hysteresisRatio = window.APP_CONFIG?.HYSTERESIS_EXIT_RATIO ?? 0.8;
    const hystLow = threshold * hysteresisRatio;

    // ── 1. Диапазон оси Y ──
    let maxVal = threshold * CHART.Y_HEADROOM;
    history.forEach(p => {
      if (typeof p.d_m === 'number' && p.d_m > maxVal) maxVal = p.d_m * CHART.Y_DATA_HEADROOM;
      if (typeof p.d_m_filtered === 'number' && p.d_m_filtered > maxVal) maxVal = p.d_m_filtered * CHART.Y_DATA_HEADROOM;
    });
    const minVal = 0;

    const getX = (idx) => {
      if (history.length <= 1) return pad.left;
      return pad.left + (idx / (history.length - 1)) * plotW;
    };
    const getY = (val) => {
      const ratio = (val - minVal) / (maxVal - minVal || 1);
      return pad.top + plotH - ratio * plotH;
    };

    // ── 2. Опасная зона выше threshold ──
    const yThresh = getY(threshold);
    if (yThresh > pad.top) {
      // Заливка = цвет заливки тревоги, но очень прозрачный (0.08 α поверх неё).
      // Используем globalAlpha, чтобы не зависеть от формата токена (rgba/hex).
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = C.fillAlarm;
      ctx.fillRect(pad.left, pad.top, plotW, yThresh - pad.top);
      ctx.restore();
    }

    // ── 3. Сетка и подписи оси Y ──
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.font = CHART.FONT;
    ctx.fillStyle = C.axisLabel;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= CHART.GRID_STEPS; i++) {
      const val = minVal + ((maxVal - minVal) / CHART.GRID_STEPS) * i;
      const y = getY(val);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(1), pad.left - 6, y);
    }

    // ── 4. Линия гистерезиса (0.8 * threshold) ──
    const yHyst = getY(hystLow);
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = C.hysteresis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, yHyst);
    ctx.lineTo(pad.left + plotW, yHyst);
    ctx.stroke();
    ctx.restore();

    // ── 5. Линия threshold + бейдж ──
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = C.threshold;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, yThresh);
    ctx.lineTo(pad.left + plotW, yThresh);
    ctx.stroke();

    ctx.fillStyle = C.threshold;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`THR ${threshold.toFixed(1)}`, pad.left + plotW - 2, yThresh - 3);
    ctx.restore();

    // ── 6. Кривые (только если есть данные) ──
    if (history.length > 0) {
      // 6.1. Сырой d_m
      ctx.beginPath();
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = C.main;
      ctx.lineWidth = 1.5;
      history.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(pt.d_m);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();

      // 6.2. Градиент под кривой Калмана
      const isAlarm = device.telemetry && device.telemetry.status === 'ALARM';
      const mainColor = isAlarm ? C.mainAlarm : C.main;
      const fillColor = isAlarm ? C.fillAlarm : C.fillMain;

      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      grad.addColorStop(0, fillColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      history.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(pt.d_m_filtered);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(getX(history.length - 1), pad.top + plotH);
      ctx.lineTo(getX(0), pad.top + plotH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // 6.3. Основная линия d_m_filtered
      ctx.beginPath();
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      history.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(pt.d_m_filtered);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 6.4. Точка последнего отсчёта
      const lastIdx = history.length - 1;
      const lastX = getX(lastIdx);
      const lastY = getY(history[lastIdx].d_m_filtered);
      ctx.beginPath();
      ctx.arc(lastX, lastY, CHART.POINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 6.5. Метки времени оси X (начало / середина / конец)
      ctx.fillStyle = C.axisLabel;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelIndices = [0, Math.floor(history.length / 2), history.length - 1];
      labelIndices.forEach((idx) => {
        if (!history[idx]) return;
        const d = new Date(history[idx].ts * 1000);
        const timeStr = d.toTimeString().slice(0, 8);
        ctx.fillText(timeStr, getX(idx), pad.top + plotH + 7);
      });

      // ── 7. Crosshair при наведении ──
      if (hoverIndex !== null && history[hoverIndex]) {
        const pt = history[hoverIndex];
        const hx = getX(hoverIndex);
        const hy = getY(pt.d_m_filtered);

        // Вертикальный пунктир
        ctx.save();
        ctx.strokeStyle = C.crosshair;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, pad.top);
        ctx.lineTo(hx, pad.top + plotH);
        ctx.stroke();
        ctx.restore();

        // Точка на графике
        ctx.beginPath();
        ctx.arc(hx, hy, CHART.HOVER_POINT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = C.textPrimary;
        ctx.fill();

        // Тултип
        const dStr = new Date(pt.ts * 1000).toTimeString().slice(0, 8);
        const tooltipText = `${dStr} | Kalman: ${pt.d_m_filtered.toFixed(2)} | Raw: ${pt.d_m.toFixed(2)}`;
        ctx.font = CHART.FONT;
        const tw = ctx.measureText(tooltipText).width + CHART.TOOLTIP_PADDING_X;
        const tx = Math.min(Math.max(pad.left, hx - tw / 2), pad.left + plotW - tw);
        const ty = pad.top + 2;

        ctx.fillStyle = C.tooltipBg;
        ctx.strokeStyle = C.tooltipBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(tx, ty, tw, CHART.TOOLTIP_HEIGHT, CHART.TOOLTIP_RADIUS);
        } else {
          ctx.rect(tx, ty, tw, CHART.TOOLTIP_HEIGHT);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = C.textPrimary;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tooltipText, tx + CHART.TOOLTIP_TEXT_OFFSET_X, ty + CHART.TOOLTIP_HEIGHT / 2);
      }
    }

    ctx.restore();
  }
}

// Экспорт в глобальную область для доступа из app.js
window.TelemetryChartRenderer = TelemetryChartRenderer;
