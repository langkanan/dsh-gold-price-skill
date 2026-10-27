window.__ModuleLoader__.load({
  id: 'dsh-gold-price-ticker',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useMemo, useState } = React

    const NS = 'goldPriceTicker'
    const ENDPOINT = '/plugins/gold-price-ticker/quote'
    const STORAGE_KEY = 'dsh.gold-price-ticker.history.v2'
    const POLL_MS = 10_000
    const HISTORY_MS = 24 * 60 * 60_000
    const MAX_SAMPLES = 5_760

    const EN = {
      title: 'Live gold price',
      live: 'Live',
      closed: 'Closed',
      cnyClosed: 'SGE closed',
      cnyName: 'Shanghai Gold',
      cnyUnit: 'CNY / gram',
      usdName: 'London spot',
      usdUnit: 'USD / troy oz',
      open: 'Open',
      vsOpen: 'vs open',
      chart: 'Today',
      chartUsd: 'London gold trend',
      high: 'High',
      low: 'Low',
      updated: 'Updated',
      loading: 'Fetching gold quotes…',
      error: 'Gold quote unavailable',
      errorHint: 'Check your network connection and try again.',
      retry: 'Retry',
      stale: 'Showing the latest available quote',
    }

    const ZH = {
      title: '实时金价',
      live: '实时',
      closed: '已收盘',
      cnyClosed: '沪金收盘',
      cnyName: '上海金',
      cnyUnit: '人民币/克',
      usdName: '伦敦金',
      usdUnit: '美元/盎司',
      open: '今开',
      vsOpen: '较今开',
      chart: '今日走势',
      chartUsd: '伦敦金走势',
      high: '高',
      low: '低',
      updated: '更新于',
      loading: '正在获取金价…',
      error: '金价暂不可用',
      errorHint: '请检查网络连接后重试。',
      retry: '重试',
      stale: '显示最近一次可用报价',
    }

    const CSS = `
      .gpt-root {
        --gpt-up: var(--dsw-alias-state-success-primary);
        --gpt-down: var(--dsw-alias-state-error-primary);
        width: 100%;
        min-width: 0;
        padding: 0 0 4px;
        box-sizing: border-box;
      }
      .gpt-root[data-updown="cn"] {
        --gpt-up: var(--dsw-alias-state-error-primary);
        --gpt-down: var(--dsw-alias-state-success-primary);
      }
      .gpt-card {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 10px;
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
        padding: 8px 9px 7px;
        font-size: 11px;
        line-height: 1.25;
      }
      .gpt-head {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .gpt-badge {
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--dsw-alias-state-warn-primary);
        color: #3b2600;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .gpt-title {
        font-weight: 600;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .gpt-change {
        margin-left: auto;
        flex: 0 0 auto;
        border-radius: 999px;
        padding: 2px 5px;
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-secondary);
        font-size: 9.5px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .gpt-change.up,
      .gpt-delta.up { color: var(--gpt-up); }
      .gpt-change.down,
      .gpt-delta.down { color: var(--gpt-down); }
      .gpt-meta {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        margin-top: 3px;
        color: var(--dsw-alias-label-secondary);
        font-size: 9.5px;
      }
      .gpt-live {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex: 0 0 auto;
        white-space: nowrap;
      }
      .gpt-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--dsw-alias-state-success-primary);
        animation: gpt-pulse 2s ease-in-out infinite;
      }
      .gpt-dot.warn {
        background: var(--dsw-alias-state-warn-primary);
        animation: none;
      }
      .gpt-dot.closed {
        background: var(--dsw-alias-label-secondary);
        animation: none;
        opacity: 0.65;
      }
      .gpt-meta-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .gpt-primary {
        margin-top: 7px;
        min-width: 0;
      }
      .gpt-label {
        display: flex;
        align-items: baseline;
        gap: 4px;
        min-width: 0;
        color: var(--dsw-alias-label-secondary);
        font-size: 9.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .gpt-unit {
        font-size: 9px;
        opacity: 0.85;
      }
      .gpt-market-tag {
        flex: 0 0 auto;
        padding: 1px 4px;
        border-radius: 4px;
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-secondary);
        font-size: 8.5px;
        line-height: 1.2;
      }
      .gpt-value-row {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin-top: 1px;
        min-width: 0;
      }
      .gpt-value {
        font-size: 20px;
        line-height: 1.05;
        font-weight: 600;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .gpt-delta {
        font-size: 10px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .gpt-sub {
        margin-top: 1px;
        color: var(--dsw-alias-label-secondary);
        font-size: 9.5px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .gpt-sub-delta {
        font-weight: 600;
      }
      .gpt-sub-delta.up { color: var(--gpt-up); }
      .gpt-sub-delta.down { color: var(--gpt-down); }
      .gpt-secondary {
        margin-top: 6px;
        min-width: 0;
      }
      .gpt-usd-row {
        display: flex;
        align-items: baseline;
        gap: 5px;
        margin-top: 1px;
        min-width: 0;
        white-space: nowrap;
      }
      .gpt-usd {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        font-variant-numeric: tabular-nums;
      }
      .gpt-chart-wrap {
        margin-top: 5px;
        padding-top: 4px;
        border-top: 1px solid var(--dsw-alias-border-l1);
      }
      .gpt-chart-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 4px;
        margin-bottom: 2px;
        color: var(--dsw-alias-label-secondary);
        font-size: 8.5px;
        white-space: nowrap;
      }
      .gpt-chart-unit {
        font-size: 8px;
        opacity: 0.8;
      }
      .gpt-chart {
        display: block;
        width: 100%;
        height: auto;
        color: var(--dsw-alias-label-secondary);
      }
      .gpt-chart.up { color: var(--gpt-up); }
      .gpt-chart.down { color: var(--gpt-down); }
      .gpt-axis {
        stroke: var(--dsw-alias-border-l2);
        stroke-width: 1;
      }
      .gpt-grid {
        stroke: var(--dsw-alias-border-l1);
        stroke-width: 1;
        stroke-dasharray: 2 3;
      }
      .gpt-axis-text {
        fill: var(--dsw-alias-label-secondary);
        font-size: 7.5px;
        font-variant-numeric: tabular-nums;
      }
      .gpt-chart-open {
        stroke: var(--dsw-alias-label-secondary);
        stroke-width: 1;
        stroke-dasharray: 3 3;
        opacity: 0.8;
      }
      .gpt-chart-area {
        fill: currentColor;
        opacity: 0.08;
      }
      .gpt-chart-line {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.6;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .gpt-chart-dot { fill: currentColor; }
      .gpt-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        margin-top: 2px;
        color: var(--dsw-alias-label-secondary);
        font-size: 9px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .gpt-loading,
      .gpt-error-body {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 7px;
        min-height: 20px;
        color: var(--dsw-alias-label-secondary);
        font-size: 10px;
      }
      .gpt-error-body {
        justify-content: space-between;
      }
      .gpt-error-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .gpt-retry {
        flex: 0 0 auto;
        border: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary);
        border-radius: 6px;
        padding: 2px 7px;
        font: inherit;
        font-size: 10px;
        cursor: pointer;
      }
      .gpt-retry:hover { border-color: var(--dsw-alias-border-l2); }
      .gpt-retry:focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary);
        outline-offset: 1px;
      }
      @keyframes gpt-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.45; transform: scale(0.82); }
      }
      @media (prefers-reduced-motion: reduce) {
        .gpt-dot { animation: none; }
      }
    `

    function readHistory() {
      try {
        if (typeof localStorage === 'undefined') return []
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        const cutoff = Date.now() - HISTORY_MS
        return parsed
          .filter(
            (sample) =>
              sample &&
              Number.isFinite(sample.t) &&
              Number.isFinite(sample.u) &&
              Number.isFinite(sample.c) &&
              sample.t >= cutoff,
          )
          .slice(-MAX_SAMPLES)
      } catch {
        return []
      }
    }

    function saveHistory(history) {
      try {
        if (typeof localStorage === 'undefined') return
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
      } catch {
        // Storage is only a chart cache; it must never break the quote.
      }
    }

    function appendSample(quote, history) {
      const stamp = Date.now()
      const last = history[history.length - 1]
      const samePrice =
        last &&
        Math.abs(last.u - quote.usdPerOunce) < 1e-9 &&
        Math.abs(last.c - quote.cnyPerGram) < 1e-9
      if (samePrice && Math.abs(stamp - last.t) < 60_000) {
        return history
      }
      const next = [...history, { t: stamp, u: quote.usdPerOunce, c: quote.cnyPerGram }]
        .filter((sample) => sample.t >= Date.now() - HISTORY_MS)
        .slice(-MAX_SAMPLES)
      saveHistory(next)
      return next
    }

    function normalizeQuote(payload) {
      const usdPerOunce = positiveNumber(payload?.usdPerOunce)
      const cnyPerGram = positiveNumber(payload?.cnyPerGram)
      if (usdPerOunce === null || cnyPerGram === null) return null

      const usdOpen = positiveNumber(payload?.usdOpen)
      const cnyOpen = positiveNumber(payload?.cnyOpen)
      return {
        usdPerOunce,
        cnyPerGram,
        usdOpen,
        cnyOpen,
        usdHigh: positiveNumber(payload?.usdHigh),
        usdLow: positiveNumber(payload?.usdLow),
        cnyHigh: positiveNumber(payload?.cnyHigh),
        cnyLow: positiveNumber(payload?.cnyLow),
        usdChangePct:
          finiteNumber(payload?.usdChangePct) ??
          (usdOpen ? ((usdPerOunce - usdOpen) / usdOpen) * 100 : null),
        cnyChangePct:
          finiteNumber(payload?.cnyChangePct) ??
          (cnyOpen ? ((cnyPerGram - cnyOpen) / cnyOpen) * 100 : null),
        cnyInstrument:
          typeof payload?.cnyInstrument === 'string' && payload.cnyInstrument
            ? payload.cnyInstrument
            : 'Au99.99',
        usdCny: positiveNumber(payload?.usdCny),
        marketOpen: payload?.marketOpen !== false,
        cnyMarketOpen: payload?.cnyMarketOpen !== false,
        quoteAgeSeconds: finiteNumber(payload?.quoteAgeSeconds),
        cnyQuoteAgeSeconds: finiteNumber(payload?.cnyQuoteAgeSeconds),
        updatedAt:
          typeof payload?.updatedAt === 'string'
            ? payload.updatedAt
            : new Date().toISOString(),
        stale: payload?.stale === true,
        warning:
          typeof payload?.warning === 'string' && payload.warning
            ? payload.warning
            : null,
      }
    }

    function createStore() {
      let state = {
        phase: 'loading',
        quote: null,
        history: readHistory(),
        error: null,
        warning: null,
      }
      const listeners = new Set()
      let poll = null
      let inflight = false

      function publish(patch) {
        state = { ...state, ...patch }
        for (const listener of listeners) listener()
      }

      function subscribe(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      }

      async function refresh() {
        if (inflight) return
        inflight = true
        try {
          const response = await fetch(ENDPOINT, {
            cache: 'no-store',
            headers: { accept: 'application/json' },
            signal:
              typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
                ? AbortSignal.timeout(12_000)
                : undefined,
          })
          const payload = await response.json().catch(() => null)
          if (!response.ok || !payload || payload.ok !== true) {
            throw new Error(payload?.error || `HTTP ${response.status}`)
          }
          const quote = normalizeQuote(payload)
          if (!quote) throw new Error('The quote response was incomplete')

          const nextHistory =
            !quote.marketOpen && state.history.length
              ? state.history
              : appendSample(quote, state.history)

          publish({
            phase: 'ready',
            quote,
            history: nextHistory,
            error: null,
            warning: quote.warning,
          })
        } catch (error) {
          const message = messageOf(error)
          if (state.quote) {
            publish({ phase: 'ready', error: message, warning: message })
          } else {
            publish({ phase: 'error', error: message })
          }
        } finally {
          inflight = false
        }
      }

      function start() {
        refresh()
        poll = setInterval(() => {
          if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
            refresh()
          }
        }, POLL_MS)

        const onVisible = () => {
          if (document.visibilityState === 'visible') refresh()
        }
        const onOnline = () => refresh()

        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', onVisible)
        }
        if (typeof window !== 'undefined') {
          window.addEventListener('online', onOnline)
        }

        return () => {
          if (poll) clearInterval(poll)
          if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', onVisible)
          }
          if (typeof window !== 'undefined') {
            window.removeEventListener('online', onOnline)
          }
        }
      }

      return {
        start,
        refresh,
        subscribe,
        getSnapshot: () => state,
      }
    }

    function useStore(store) {
      const [snapshot, setSnapshot] = useState(() => store.getSnapshot())
      useEffect(() => store.subscribe(() => setSnapshot(store.getSnapshot())), [store])
      return snapshot
    }

    function useLocale(ctx) {
      const [snapshot, setSnapshot] = useState(() => ctx.locale.getLocale())
      useEffect(() => ctx.locale.subscribe(() => setSnapshot(ctx.locale.getLocale())), [ctx])
      return snapshot
    }

    function localeTag(active) {
      return String(active || 'en').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
    }

    function formatNumber(value, tag, digits) {
      if (!Number.isFinite(value)) return '—'
      try {
        return new Intl.NumberFormat(tag, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(value)
      } catch {
        return value.toFixed(digits)
      }
    }

    function formatSigned(value, tag, digits) {
      const sign = value > 0 ? '+' : value < 0 ? '−' : ''
      return `${sign}${formatNumber(Math.abs(value), tag, digits)}`
    }

    function formatPercent(value, tag) {
      if (!Number.isFinite(value)) return '—'
      return `${formatSigned(value, tag, 2)}%`
    }

    function formatTime(value, tag) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '—'
      try {
        return new Intl.DateTimeFormat(tag, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(date)
      } catch {
        return date.toLocaleTimeString()
      }
    }

    function formatClock(timestamp, tag) {
      const date = new Date(timestamp)
      if (Number.isNaN(date.getTime())) return '—'
      try {
        return new Intl.DateTimeFormat(tag, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date)
      } catch {
        return date.toLocaleTimeString()
      }
    }

    function startOfLocalDay(timestamp) {
      const date = new Date(timestamp)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    }

    function downsample(samples, limit) {
      if (samples.length <= limit) return samples
      const step = (samples.length - 1) / (limit - 1)
      const result = []
      for (let index = 0; index < limit; index += 1) {
        result.push(samples[Math.round(index * step)])
      }
      return result
    }

    function computeChart(history) {
      if (!history.length) return []
      const dayStart = startOfLocalDay(Date.now())
      const today = history.filter((sample) => sample.t >= dayStart)
      return downsample(today.length ? today : history, 140)
    }

    function PriceChart({ points, open, direction, field, symbol, tag, t }) {
      if (!points.length) return null

      const width = 244
      const height = 88
      const left = 42
      const right = 8
      const top = 8
      const bottom = 18
      const plotWidth = width - left - right
      const plotHeight = height - top - bottom

      const values = points.map((point) => point[field])
      if (Number.isFinite(open)) values.push(open)
      let min = Math.min(...values)
      let max = Math.max(...values)
      if (!Number.isFinite(min) || !Number.isFinite(max)) return null
      if (max - min < 0.01) {
        const pad = Math.max(0.5, Math.abs(max) * 0.001)
        min -= pad
        max += pad
      }

      const y = (value) => top + ((max - value) / (max - min)) * plotHeight
      const x = (index) =>
        points.length <= 1
          ? left + plotWidth / 2
          : left + (index / (points.length - 1)) * plotWidth

      const line = points
        .map(
          (point, index) =>
            `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(point[field]).toFixed(1)}`,
        )
        .join(' ')
      const area = `${line} L${x(points.length - 1).toFixed(1)} ${(
        top + plotHeight
      ).toFixed(1)} L${x(0).toFixed(1)} ${(top + plotHeight).toFixed(1)} Z`

      const yTicks = [max, (max + min) / 2, min]
      const xIndices =
        points.length >= 3
          ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
          : points.length === 2
            ? [0, 1]
            : [0]
      const uniqueXIndices = [...new Set(xIndices)]

      const openY = Number.isFinite(open) ? y(open) : null
      const openLabelY =
        openY === null ? null : Math.min(Math.max(openY - 3, top + 7), top + plotHeight - 2)

      const children = []

      children.push(
        h('line', {
          key: 'y-axis',
          className: 'gpt-axis',
          x1: left,
          y1: top,
          x2: left,
          y2: top + plotHeight,
        }),
        h('line', {
          key: 'x-axis',
          className: 'gpt-axis',
          x1: left,
          y1: top + plotHeight,
          x2: left + plotWidth,
          y2: top + plotHeight,
        }),
      )

      for (const [index, tick] of yTicks.entries()) {
        const tickY = y(tick)
        children.push(
          h('line', {
            key: `grid-${index}`,
            className: 'gpt-grid',
            x1: left,
            y1: tickY,
            x2: left + plotWidth,
            y2: tickY,
          }),
          h(
            'text',
            {
              key: `y-label-${index}`,
              className: 'gpt-axis-text',
              x: left - 4,
              y: tickY + 2.8,
              textAnchor: 'end',
            },
            `${symbol}${formatNumber(tick, tag, 2)}`,
          ),
        )
      }

      if (openY !== null) {
        children.push(
          h('line', {
            key: 'open-line',
            className: 'gpt-chart-open',
            x1: left,
            y1: openY,
            x2: left + plotWidth,
            y2: openY,
          }),
          h(
            'text',
            {
              key: 'open-label',
              className: 'gpt-axis-text',
              x: left + plotWidth - 2,
              y: openLabelY,
              textAnchor: 'end',
            },
            t('open'),
          ),
        )
      }

      if (points.length >= 2) {
        children.push(
          h('path', { key: 'area', className: 'gpt-chart-area', d: area }),
          h('path', { key: 'line', className: 'gpt-chart-line', d: line }),
        )
      }

      children.push(
        h('circle', {
          key: 'last-dot',
          className: 'gpt-chart-dot',
          cx: x(points.length - 1),
          cy: y(points[points.length - 1][field]),
          r: 2.1,
        }),
      )

      for (const [index, pointIndex] of uniqueXIndices.entries()) {
        const point = points[pointIndex]
        const textAnchor =
          points.length <= 1
            ? 'middle'
            : pointIndex === 0
              ? 'start'
              : pointIndex === points.length - 1
                ? 'end'
                : 'middle'
        children.push(
          h(
            'text',
            {
              key: `x-label-${index}`,
              className: 'gpt-axis-text',
              x: x(pointIndex),
              y: height - 4,
              textAnchor,
            },
            formatClock(point.t, tag),
          ),
        )
      }

      return h(
        'svg',
        {
          className: `gpt-chart ${direction}`,
          viewBox: `0 0 ${width} ${height}`,
          role: 'img',
          'aria-label': `${t('chartUsd')} ${symbol}${formatNumber(
            min,
            tag,
            2,
          )} – ${symbol}${formatNumber(max, tag, 2)}`,
        },
        children,
      )
    }

    function GoldTickerView({ store, ctx, wide }) {
      const snapshot = useStore(store)
      const locale = useLocale(ctx)
      const t = ctx.locale.bind(NS)
      const tag = localeTag(locale.active)
      const points = useMemo(() => computeChart(snapshot.history), [snapshot.history])
      const quote = snapshot.quote

      if (wide === false) return null

      const style = h('style', null, CSS)

      if (!quote) {
        const failed = snapshot.phase === 'error'
        return h(
          'section',
          {
            className: 'gpt-root',
            'aria-label': t('title'),
            'data-gold-price-ticker': '',
            'data-updown': tag === 'zh-CN' ? 'cn' : 'intl',
          },
          style,
          h(
            'div',
            { className: 'gpt-card' },
            h(
              'div',
              { className: 'gpt-head' },
              h('span', { className: 'gpt-badge', 'aria-hidden': 'true' }, 'Au'),
              h('span', { className: 'gpt-title' }, t('title')),
            ),
            h(
              'div',
              { className: 'gpt-meta' },
              h(
                'span',
                { className: 'gpt-live' },
                h('span', { className: `gpt-dot${failed ? ' warn' : ''}` }),
                failed ? t('error') : t('live'),
              ),
            ),
            failed
              ? h(
                  'div',
                  { className: 'gpt-error-body' },
                  h(
                    'span',
                    {
                      className: 'gpt-error-text',
                      title: snapshot.error || '',
                    },
                    `${t('error')} · ${t('errorHint')}`,
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'gpt-retry',
                      onClick: () => store.refresh(),
                    },
                    t('retry'),
                  ),
                )
              : h('div', { className: 'gpt-loading' }, t('loading')),
          ),
        )
      }

      const cnyDirection =
        quote.cnyChangePct == null
          ? 'flat'
          : quote.cnyChangePct > 0.0001
            ? 'up'
            : quote.cnyChangePct < -0.0001
              ? 'down'
              : 'flat'
      const usdDirection =
        quote.usdChangePct == null
          ? 'flat'
          : quote.usdChangePct > 0.0001
            ? 'up'
            : quote.usdChangePct < -0.0001
              ? 'down'
              : 'flat'

      const chartDirection =
        points.length >= 2
          ? points[points.length - 1].u > points[0].u + 1e-9
            ? 'up'
            : points[points.length - 1].u < points[0].u - 1e-9
              ? 'down'
              : 'flat'
          : usdDirection

      const cnyDelta =
        quote.cnyOpen == null ? null : quote.cnyPerGram - quote.cnyOpen
      const usdDelta =
        quote.usdOpen == null ? null : quote.usdPerOunce - quote.usdOpen
      const chartHigh =
        quote.usdHigh ??
        (points.length ? Math.max(...points.map((point) => point.u)) : null)
      const chartLow =
        quote.usdLow ??
        (points.length ? Math.min(...points.map((point) => point.u)) : null)

      const updated = formatTime(quote.updatedAt, tag)
      const usdChangeText =
        quote.usdChangePct == null
          ? `${t('vsOpen')} —`
          : `${t('vsOpen')} ${formatPercent(quote.usdChangePct, tag)}`

      return h(
        'section',
        {
          className: 'gpt-root',
          'aria-label': t('title'),
          'data-gold-price-ticker': '',
          'data-updown': tag === 'zh-CN' ? 'cn' : 'intl',
        },
        style,
        h(
          'div',
          { className: 'gpt-card' },
          h(
            'div',
            { className: 'gpt-head' },
            h('span', { className: 'gpt-badge', 'aria-hidden': 'true' }, 'Au'),
            h('span', { className: 'gpt-title' }, t('title')),
            h(
              'span',
              {
                className: `gpt-change ${usdDirection}`,
                title: usdChangeText,
              },
              usdChangeText,
            ),
          ),
          h(
            'div',
            { className: 'gpt-meta' },
            h(
              'span',
              { className: 'gpt-live' },
              h(
                'span',
                {
                  className: `gpt-dot${
                    snapshot.warning
                      ? ' warn'
                      : quote.marketOpen
                        ? ''
                        : ' closed'
                  }`,
                },
              ),
              quote.marketOpen ? t('live') : t('closed'),
            ),
            h('span', { className: 'gpt-meta-text' }, `${t('updated')} ${updated}`),
            snapshot.warning
              ? h(
                  'span',
                  {
                    className: 'gpt-dot warn',
                    title: snapshot.warning,
                    'aria-label': t('stale'),
                  },
                )
              : null,
          ),
          h(
            'div',
            { className: 'gpt-primary' },
            h(
              'div',
              { className: 'gpt-label' },
              `${t('cnyName')} ${quote.cnyInstrument}`,
              h('span', { className: 'gpt-unit' }, t('cnyUnit')),
              quote.cnyMarketOpen
                ? null
                : h(
                    'span',
                    { className: 'gpt-market-tag' },
                    t('cnyClosed'),
                  ),
            ),
            h(
              'div',
              { className: 'gpt-value-row' },
              h(
                'span',
                { className: 'gpt-value' },
                `¥${formatNumber(quote.cnyPerGram, tag, 2)}`,
              ),
              cnyDelta == null
                ? null
                : h(
                    'span',
                    { className: `gpt-delta ${cnyDirection}` },
                    formatSigned(cnyDelta, tag, 2),
                  ),
            ),
            h(
              'div',
              { className: 'gpt-sub' },
              `${t('open')} ${
                quote.cnyOpen == null
                  ? '—'
                  : `¥${formatNumber(quote.cnyOpen, tag, 2)}`
              }`,
              quote.cnyChangePct == null
                ? null
                : h(
                    'span',
                    { className: `gpt-sub-delta ${cnyDirection}` },
                    ` · ${formatPercent(quote.cnyChangePct, tag)}`,
                  ),
            ),
          ),
          h(
            'div',
            { className: 'gpt-secondary' },
            h(
              'div',
              { className: 'gpt-label' },
              t('usdName'),
              h('span', { className: 'gpt-unit' }, t('usdUnit')),
            ),
            h(
              'div',
              { className: 'gpt-usd-row' },
              h(
                'span',
                { className: 'gpt-usd' },
                `$${formatNumber(quote.usdPerOunce, tag, 2)}`,
              ),
              usdDelta == null
                ? null
                : h(
                    'span',
                    { className: `gpt-delta ${usdDirection}` },
                    formatSigned(usdDelta, tag, 2),
                  ),
            ),
            h(
              'div',
              { className: 'gpt-sub' },
              `${t('open')} ${
                quote.usdOpen == null
                  ? '—'
                  : `$${formatNumber(quote.usdOpen, tag, 2)}`
              }`,
            ),
          ),
          h(
            'div',
            { className: 'gpt-chart-wrap' },
            h(
              'div',
              { className: 'gpt-chart-head' },
              h('span', null, t('chartUsd')),
              h('span', { className: 'gpt-chart-unit' }, 'USD / oz'),
            ),
            h(PriceChart, {
              points,
              open: quote.usdOpen,
              direction: chartDirection,
              field: 'u',
              symbol: '$',
              tag,
              t,
            }),
          ),
          h(
            'div',
            { className: 'gpt-foot' },
            h(
              'span',
              null,
              `${t('high')} ${
                chartHigh == null ? '—' : `$${formatNumber(chartHigh, tag, 2)}`
              }`,
            ),
            h(
              'span',
              null,
              `${t('low')} ${
                chartLow == null ? '—' : `$${formatNumber(chartLow, tag, 2)}`
              }`,
            ),
          ),
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const disposers = [
            ctx.locale.register(NS, 'en', EN),
            ctx.locale.register(NS, 'zh-CN', ZH),
            ctx.locale.register(NS, 'zh', ZH),
          ]
          return () => {
            for (const dispose of disposers) dispose()
          }
        })

        const store = createStore()
        ctx.effect(() => store.start())

        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            {
              name: 'sidebar.footer.action',
              id: 'gold-price-ticker',
              order: 2,
              label: () => ctx.locale.bind(NS)('title'),
            },
            (props) =>
              h(GoldTickerView, {
                store,
                ctx,
                wide: props?.wide,
              }),
          ),
        )
      },
    }

    function positiveNumber(value) {
      if (value === null || value === undefined || value === '') return null
      const parsed = Number(value)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null
    }

    function finiteNumber(value) {
      if (value === null || value === undefined || value === '') return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    function messageOf(error) {
      if (error instanceof Error && error.message) return error.message
      return String(error ?? 'Unknown error')
    }
  },
})
