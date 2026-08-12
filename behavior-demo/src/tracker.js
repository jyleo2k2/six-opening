// ============================================================
// 행동 수집 엔진
//  - 이벤트는 전부 메모리 버퍼에 쌓는다 (매 터치마다 네트워크 안 씀)
//  - 세션 종료(화면 이탈 / 종료 버튼) 시 한 번에 배치 전송
//  - 좌표는 화면 크기로 나눠 0~1로 정규화 → 기기 해상도 무관
//
// 이 데모의 핵심 질문:
//   "종목 이름만 보고 매수하나, 정보 탭을 열어보고 매수하나"
//   → 상세화면의 3개 섹션(차트 / 기업정보 / 관련뉴스) 각각의 '상세보기'를
//     눌렀는지를 종목별로 기록하고, 그 상태에서 내린 매수 결정과 짝지어 본다.
// ============================================================

import { supabase, hasSupabase } from './supabase.js'

const GRID_ROWS = 4
const GRID_COLS = 6

// 상세화면의 정보 섹션 3종. 화면 DOM 의 data-section 값과 1:1 로 대응한다.
const SECTIONS = [
  { key: 'chart', label: '차트' },
  { key: 'company', label: '기업정보' },
  { key: 'news', label: '관련뉴스' },
]
const SECTION_KEYS = SECTIONS.map((s) => s.key)
const SECTION_LABEL = Object.fromEntries(SECTIONS.map((s) => [s.key, s.label]))

// 탭 좌표를 어느 UI 덩어리에서 눌렀는지로 분류하는 값들 (data-section 전체 집합)
const TAP_ZONES = [...SECTION_KEYS, 'header', 'action', 'card', 'other']

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function deviceKey() {
  let k = localStorage.getItem('demo_user_key')
  if (!k) {
    k = 'anon_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('demo_user_key', k)
  }
  return k
}

function median(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export class Tracker {
  constructor(onEvent) {
    this.sessionId = uuid()
    this.userKey = deviceKey()
    this.startedAt = new Date()
    this.t0 = performance.now()
    this.events = []
    this.onEvent = onEvent || (() => {})
    this.sent = false
  }

  now() {
    return Math.round(performance.now() - this.t0)
  }

  // 모든 수집은 이 한 곳을 통과한다
  push(type, payload = {}) {
    const e = {
      session_id: this.sessionId,
      user_key: this.userKey,
      ts: this.now(),
      type,
      screen: payload.screen ?? null,
      ticker: payload.ticker ?? null,
      section: payload.section ?? null, // chart | company | news | header | action | card
      choice: payload.choice ?? null, // buy | pass
      x: payload.x ?? null,
      y: payload.y ?? null,
      direction: payload.direction ?? null,
      velocity: payload.velocity ?? null,
      duration_ms: payload.duration_ms ?? null,
      depth: payload.depth ?? null,
      meta: payload.meta ?? null,
    }
    this.events.push(e)
    this.onEvent(e)
    return e
  }

  // --- 개별 수집 API -----------------------------------------

  // ① 스와이프: 방향 + 속도 + 판단시간 (제스처 자체의 물리량)
  trackSwipe({ ticker, direction, dx, dy, duration_ms, x, y }) {
    const dist = Math.hypot(dx, dy)
    return this.push('swipe', {
      screen: 'deck',
      section: 'card',
      ticker,
      direction,
      velocity: duration_ms > 0 ? +(dist / duration_ms).toFixed(3) : 0,
      duration_ms,
      x,
      y,
    })
  }

  // ② 스크롤: 콘텐츠를 몇 % 까지 읽었는지
  trackScroll({ ticker, depth }) {
    return this.push('scroll', {
      screen: 'detail',
      ticker,
      depth: +depth.toFixed(3),
    })
  }

  // ③ 히트맵: 화면 어디를 만졌는지 (정규화 좌표 + 어느 섹션인지)
  trackTap({ screen, ticker, section, x, y }) {
    return this.push('tap', { screen, ticker, section: section ?? 'other', x, y })
  }

  trackCardView({ ticker }) {
    return this.push('card_view', { screen: 'deck', section: 'card', ticker })
  }

  trackDetailOpen({ ticker }) {
    return this.push('detail_open', { screen: 'detail', ticker })
  }

  trackDwell({ screen, ticker, duration_ms }) {
    return this.push('dwell', { screen, ticker, duration_ms })
  }

  // ④ 섹션 '상세보기' 를 폄 — order 는 이 종목에서 몇 번째로 연 섹션인지
  trackSectionOpen({ ticker, section, order }) {
    return this.push('section_open', {
      screen: 'detail',
      ticker,
      section,
      meta: { order },
    })
  }

  // ⑤ 섹션을 다시 접음 — 펼쳐둔 시간이 곧 그 정보를 본 시간
  trackSectionClose({ ticker, section, duration_ms }) {
    return this.push('section_close', {
      screen: 'detail',
      ticker,
      section,
      duration_ms,
    })
  }

  // ⑥ 매수/패스 결정 — 그 시점까지 이 종목에서 무슨 정보를 봤는지 함께 박아둔다.
  //    이 이벤트 하나만 봐도 "이름만 보고 질렀나"를 판정할 수 있게 하는 게 목적.
  trackDecision({ ticker, choice, source, sectionsOpened, msSinceView }) {
    const list = sectionsOpened || []
    return this.push('decision', {
      screen: source === 'detail' ? 'detail' : 'deck',
      ticker,
      choice,
      duration_ms: msSinceView ?? null,
      meta: {
        source, // deck_swipe | detail_button
        sections_opened: list.length,
        sections_list: list,
        informed: list.length > 0,
      },
    })
  }

  // --- 집계 --------------------------------------------------
  // 원본 좌표를 그대로 서버에 쌓지 않고, 그리드 밀도 + 섹션 비율로 압축

  summarize() {
    const ev = this.events
    const swipes = ev.filter((e) => e.type === 'swipe')
    const scrolls = ev.filter((e) => e.type === 'scroll')
    const taps = ev.filter((e) => e.type === 'tap' && e.x != null)
    const views = ev.filter((e) => e.type === 'card_view')
    const dwells = ev.filter((e) => e.type === 'dwell')
    const detailOpenEvents = ev.filter((e) => e.type === 'detail_open')
    const secOpens = ev.filter((e) => e.type === 'section_open')
    const secCloses = ev.filter((e) => e.type === 'section_close')
    const decisions = ev.filter((e) => e.type === 'decision')

    const swipeTimes = swipes.map((s) => s.duration_ms).filter((v) => v != null)
    const depths = scrolls.map((s) => s.depth)

    // 그리드 밀도 (4행 x 6열), 전체 탭 수로 나눠 정규화
    const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0))
    taps.forEach((t) => {
      const r = Math.min(GRID_ROWS - 1, Math.floor(t.y * GRID_ROWS))
      const c = Math.min(GRID_COLS - 1, Math.floor(t.x * GRID_COLS))
      grid[r][c] += 1
    })
    const total = taps.length || 1
    const gridDensity = grid.map((row) => row.map((v) => +(v / total).toFixed(4)))

    // 어느 UI 덩어리를 눌렀나 — y좌표 추정이 아니라 실제 DOM 섹션 기준
    const sectionShare = {}
    TAP_ZONES.forEach((z) => {
      const n = taps.filter((t) => (t.section ?? 'other') === z).length
      if (n) sectionShare[z] = +(n / total).toFixed(4)
    })

    // --- 섹션별 열람 통계 -------------------------------------
    const sectionOpens = {} // 섹션별 '상세보기' 누른 횟수
    const sectionDwellMs = {} // 섹션별 펼쳐둔 총 시간
    const sectionTickers = {} // 섹션별 열어본 종목 수 (중복 제거)
    SECTION_KEYS.forEach((k) => {
      sectionOpens[k] = secOpens.filter((e) => e.section === k).length
      sectionDwellMs[k] = secCloses
        .filter((e) => e.section === k)
        .reduce((a, b) => a + (b.duration_ms || 0), 0)
      sectionTickers[k] = new Set(
        secOpens.filter((e) => e.section === k).map((e) => e.ticker),
      ).size
    })

    // 가장 먼저 여는 섹션 = 이 사용자가 제일 먼저 궁금해하는 정보
    const firstPicks = {}
    secOpens.forEach((e) => {
      if (e.meta?.order === 1) firstPicks[e.section] = (firstPicks[e.section] || 0) + 1
    })
    const firstSection =
      Object.entries(firstPicks).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    // 가장 오래 본 섹션
    const topSection =
      Object.entries(sectionDwellMs)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    // --- 이름만 보고 샀나 vs 정보 보고 샀나 --------------------
    const buys = decisions.filter((d) => d.choice === 'buy')
    const passes = decisions.filter((d) => d.choice === 'pass')
    const buysInformed = buys.filter((d) => (d.meta?.sections_opened || 0) > 0).length
    const buysNameOnly = buys.length - buysInformed
    const decidedTotal = decisions.length || 1

    const nameOnlyBuyRate = buys.length ? +(buysNameOnly / buys.length).toFixed(3) : null
    const informedBuyRate = buys.length ? +(buysInformed / buys.length).toFixed(3) : null
    const avgSectionsBeforeBuy = buys.length
      ? +(buys.reduce((a, b) => a + (b.meta?.sections_opened || 0), 0) / buys.length).toFixed(2)
      : null
    // 전체 결정 중 정보를 한 번이라도 열어본 비율
    const infoUseRate = +(
      decisions.filter((d) => (d.meta?.sections_opened || 0) > 0).length / decidedTotal
    ).toFixed(3)

    const avgSwipeMs = swipeTimes.length
      ? swipeTimes.reduce((a, b) => a + b, 0) / swipeTimes.length
      : null
    const avgDepth = depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : null
    const maxDepth = depths.length ? Math.max(...depths) : null
    const readMs = dwells
      .filter((d) => d.screen === 'detail')
      .reduce((a, b) => a + (b.duration_ms || 0), 0)

    // --- 파생 지표 --------------------------------------------
    // 확신도: 판단이 빠르고 정보를 덜 열어볼수록 높음
    // 탐색도: 판단이 느리고 정보를 많이/깊게 볼수록 높음
    const detailOpens = new Set(detailOpenEvents.map((e) => e.ticker)).size
    const viewCount = views.length || 1
    const speedScore = avgSwipeMs == null ? 0.5 : clamp01(1 - (avgSwipeMs - 300) / 2000)
    const depthScore = avgDepth == null ? 0 : clamp01(avgDepth)
    const openRate = clamp01(detailOpens / viewCount)
    // 종목당 평균 몇 개 섹션을 여는지 (3개 만점)
    const sectionScore = clamp01((avgSectionsBeforeBuy ?? 0) / SECTION_KEYS.length)

    // 결정이 최소 3건은 있어야 유형을 매긴다. 그 전엔 판정 보류.
    const enough = decisions.length >= 3
    const confidence = enough
      ? +(0.45 * speedScore + 0.3 * (1 - openRate) + 0.25 * (1 - infoUseRate)).toFixed(3)
      : null
    const exploration = enough
      ? +(0.35 * depthScore + 0.25 * openRate + 0.25 * sectionScore + 0.15 * (1 - speedScore)).toFixed(3)
      : null

    let behaviorType = null
    if (enough) {
      if (confidence >= 0.6 && exploration < 0.4) behaviorType = '즉단형'
      else if (exploration >= 0.6) behaviorType = '탐색형'
      else if (confidence < 0.4 && exploration < 0.4) behaviorType = '산만형'
      else behaviorType = '신중형'
    }

    // 매수 판단의 근거가 이름인지 정보인지 — 이 데모의 결론 지표
    let decisionStyle = null
    if (buys.length >= 2) {
      if (nameOnlyBuyRate >= 0.7) decisionStyle = '이름형'
      else if (nameOnlyBuyRate <= 0.3) decisionStyle = '정보형'
      else decisionStyle = '혼합형'
    }

    const endedAt = new Date()

    return {
      session_id: this.sessionId,
      user_key: this.userKey,
      started_at: this.startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: this.now(),

      cards_viewed: views.length,
      swipe_right: swipes.filter((s) => s.direction === 'right').length,
      swipe_left: swipes.filter((s) => s.direction === 'left').length,
      avg_swipe_ms: avgSwipeMs == null ? null : +avgSwipeMs.toFixed(1),
      median_swipe_ms: median(swipeTimes),
      avg_swipe_vel: swipes.length
        ? +(swipes.reduce((a, b) => a + (b.velocity || 0), 0) / swipes.length).toFixed(3)
        : null,

      detail_opens: detailOpens,
      avg_scroll_depth: avgDepth == null ? null : +avgDepth.toFixed(3),
      max_scroll_depth: maxDepth == null ? null : +maxDepth.toFixed(3),
      read_ms_total: readMs,

      // 섹션(정보 탭) 열람
      section_opens: sectionOpens,
      section_dwell_ms: sectionDwellMs,
      section_tickers: sectionTickers,
      first_section: firstSection,
      top_section: topSection,

      // 결정 ↔ 정보 노출
      decisions_total: decisions.length,
      buys_total: buys.length,
      passes_total: passes.length,
      buys_name_only: buysNameOnly,
      buys_informed: buysInformed,
      name_only_buy_rate: nameOnlyBuyRate,
      informed_buy_rate: informedBuyRate,
      avg_sections_before_buy: avgSectionsBeforeBuy,
      info_use_rate: infoUseRate,

      grid_density: gridDensity,
      section_share: sectionShare,
      taps_total: taps.length,

      confidence_index: confidence,
      exploration_index: exploration,
      behavior_type: behaviorType,
      decision_style: decisionStyle,
    }
  }

  // 종목 단위로 "무슨 정보를 보고 무슨 결정을 했나"를 표로 뽑는다 (화면 표시용)
  perTicker() {
    const map = new Map()
    const get = (t) => {
      if (!map.has(t)) map.set(t, { ticker: t, opened: [], choice: null, ms: null })
      return map.get(t)
    }
    this.events.forEach((e) => {
      if (!e.ticker) return
      if (e.type === 'card_view') get(e.ticker)
      if (e.type === 'section_open') {
        const r = get(e.ticker)
        if (!r.opened.includes(e.section)) r.opened.push(e.section)
      }
      if (e.type === 'decision') {
        const r = get(e.ticker)
        r.choice = e.choice
        r.ms = e.duration_ms
      }
    })
    return [...map.values()]
  }

  // --- 전송 --------------------------------------------------

  async flush() {
    if (this.sent) return { skipped: true }
    this.sent = true

    const summary = this.summarize()

    if (!hasSupabase) {
      return { ok: false, reason: 'no-supabase', summary, rawCount: this.events.length }
    }

    const raw = this.events.map(({ ...e }) => e)
    const r1 = await supabase.from('behavior_events').insert(raw)
    const r2 = await supabase.from('session_summary').insert(summary)

    return {
      ok: !r1.error && !r2.error,
      errors: [r1.error, r2.error].filter(Boolean).map((e) => e.message),
      summary,
      rawCount: raw.length,
    }
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

export { GRID_ROWS, GRID_COLS, SECTIONS, SECTION_KEYS, SECTION_LABEL }
