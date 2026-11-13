/**
 * ============================================================================
 * GESTERESIS — Telemetry Chart Renderer (js/chart.js)
 * ============================================================================
 * Класс TelemetryChartRenderer отвечает за отрисовку интерактивного Canvas-графика
 * для каждой карточки чипа ESP32-S3.
 *
 * Что рисуется:
 *  - Сырой сигнал d_m (полупрозрачная голубая линия)
 *  - Сглаженный фильтром Калмана d_m_filtered (основная линия + градиентная заливка)
 *  - Линия порога тревоги threshold (пунктирная красная)
 *  - Линия гистерезиса возврата 0.8 * threshold (пунктирная жёлтая)
 *  - Опасная зона выше threshold (лёгкая красная заливка)
 *  - Сетка, подписи оси Y и временные метки оси X
 *  - Интерактивный crosshair-курсор и тултип при hoverIndex !== null
 *
 * Зависимости:
 *  - window.APP_CONFIG (js/config.js) — используется HYSTERESIS_EXIT_RATIO, DEFAULT_THRESHOLD
 *  - Объект device: { id, threshold, nominal_rpm, history: [{ ts, d_m, d_m_filtered }], telemetry: { status } }
 */

class TelemetryChartRenderer {
  /**
   * Основной метод отрисовки графика.
   *
   * @param {HTMLCanvasElement} canvas - целевой canvas-элемент карточки чипа
   * @param {Object} device - объект устройства с полями threshold, history, telemetry
   * @param {number|null} hoverIndex - индекс точки истории под курсором (или null)
   */
  static draw(canvas, device, hoverIndex = null) {
    if (!canvas || !device) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    const width = Math.max(260, rect.width);
    const height = 190;

    // Синхронизируем физический размер canvas с CSS-размером (с учётом DPR)
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Очистка фона
    ctx.clearRect(0, 0, width, height);

    const pad = { top: 18, right: 16, bottom: 26, left: 40 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const history = Array.isArray(device.history) ? device.history : [];
    const threshold = typeof device.threshold === 'number'
      ? device.threshold
      : (window.APP_CONFIG?.DEFAULT_THRESHOLD ?? 3.5);

    const hysteresisRatio = window.APP_CONFIG?.HYSTERESIS_EXIT_RATIO ?? 0.8;
    const hystLow = threshold * hysteresisRatio;

    // ---------------------------------------------------------------
    // 1. Определяем диапазон оси Y (с запасом над максимумом истории)
    // ---------------------------------------------------------------
    let maxVal = threshold * 1.25;
    history.forEach(p => {
      if (typeof p.d_m === 'number' && p.d_m > maxVal) maxVal = p.d_m * 1.12;
      if (typeof p.d_m_filtered === 'number' && p.d_m_filtered > maxVal) maxVal = p.d_m_filtered * 1.12;
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

    // ---------------------------------------------------------------
    // 2. Опасная зона выше threshold (лёгкая красная заливка)
    // ---------------------------------------------------------------
    const yThresh = getY(threshold);
    if (yThresh > pad.top) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
      ctx.fillRect(pad.left, pad.top, plotW, yThresh - pad.top);
    }

    // ---------------------------------------------------------------
    // 3. Горизонтальная сетка и подписи оси Y
    // ---------------------------------------------------------------
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const val = minVal + ((maxVal - minVal) / gridSteps) * i;
      const y = getY(val);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(1), pad.left - 6, y);
    }

    // ---------------------------------------------------------------
    // 4. Линия порога гистерезиса возврата (0.8 * threshold)
    // ---------------------------------------------------------------
    const yHyst = getY(hystLow);
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, yHyst);
    ctx.lineTo(pad.left + plotW, yHyst);
    ctx.stroke();
    ctx.restore();

    // ---------------------------------------------------------------
    // 5. Линия порога тревоги (threshold) + бейдж
    // ---------------------------------------------------------------
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, yThresh);
    ctx.lineTo(pad.left + plotW, yThresh);
    ctx.stroke();

    // Бейдж порога справа
    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`THR ${threshold.toFixed(1)}`, pad.left + plotW - 2, yThresh - 3);
    ctx.restore();

    // ---------------------------------------------------------------
    // 6. Кривые и метки (только если есть данные)
    // ---------------------------------------------------------------
    if (history.length > 0) {
      // 6.1. Кривая сырого d_m (полупрозрачный голубой)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1.5;
      history.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(pt.d_m);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 6.2. Градиентная заливка под кривой Калмана (d_m_filtered)
      const isAlarm = device.telemetry && device.telemetry.status === 'ALARM';
      const mainColor = isAlarm ? '#fb7185' : '#22d3ee';
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      grad.addColorStop(0, isAlarm ? 'rgba(244, 63, 94, 0.28)' : 'rgba(34, 211, 238, 0.25)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');

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

      // 6.3. Основная линия d_m_filtered (фильтр Калмана)
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

      // 6.4. Точка последнего актуального отсчёта
      const lastIdx = history.length - 1;
      const lastX = getX(lastIdx);
      const lastY = getY(history[lastIdx].d_m_filtered);
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 6.5. Временные метки по оси X (начало / середина / конец)
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelIndices = [0, Math.floor(history.length / 2), history.length - 1];
      labelIndices.forEach((idx) => {
        if (!history[idx]) return;
        const d = new Date(history[idx].ts * 1000);
        const timeStr = d.toTimeString().slice(0, 8);
        ctx.fillText(timeStr, getX(idx), pad.top + plotH + 7);
      });

      // ---------------------------------------------------------------
      // 7. Интерактивный курсор (crosshair) при наведении
      // ---------------------------------------------------------------
      if (hoverIndex !== null && history[hoverIndex]) {
        const pt = history[hoverIndex];
        const hx = getX(hoverIndex);
        const hy = getY(pt.d_m_filtered);

        // Вертикальный пунктир
        ctx.save();
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, pad.top);
        ctx.lineTo(hx, pad.top + plotH);
        ctx.stroke();
        ctx.restore();

        // Точка на графике
        ctx.beginPath();
        ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Тултип внутри графика
        const dStr = new Date(pt.ts * 1000).toTimeString().slice(0, 8);
        const tooltipText = `${dStr} | Kalman: ${pt.d_m_filtered.toFixed(2)} | Raw: ${pt.d_m.toFixed(2)}`;
        ctx.font = '10px "JetBrains Mono", monospace';
        const tw = ctx.measureText(tooltipText).width + 14;
        const tx = Math.min(Math.max(pad.left, hx - tw / 2), pad.left + plotW - tw);
        const ty = pad.top + 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // roundRect доступен в современных браузерах; fallback — обычный прямоугольник
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(tx, ty, tw, 20, 6);
        } else {
          ctx.rect(tx, ty, tw, 20);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tooltipText, tx + 7, ty + 10);
      }
    }

    ctx.restore();
  }
}

// Экспорт в глобальную область для доступа из app.js
window.TelemetryChartRenderer = TelemetryChartRenderer;