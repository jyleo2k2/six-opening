import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cards from './cards.json'
import { Tracker, GRID_ROWS, GRID_COLS, SECTIONS, SECTION_KEYS, SECTION_LABEL } from './tracker'
import { hasSupabase } from './supabase'
import './App.css'

const SWIPE_THRESHOLD = 90 // px — 이만큼 끌면 스와이프로 인정
const TAP_SLOP = 10 // px — 이 안쪽 움직임은 탭으로 간주

const pct = (v) => (v == null ? '—' : (v * 100).toFixed(1) + '%')
const num = (v, d = 2) => (v == null ? '—' : Number(v).toFixed(d))

export default function App() {
  const [log, setLog] = useState([])
  const [idx, setIdx] = useState(0)
  const [detail, setDetail] = useState(null) // 열려있는 종목
  const [open, setOpen] = useState([]) // 지금 펼쳐진 섹션 key 목록
  const [result, setResult] = useState(null)
  const [drag, setDrag] = useState({ dx: 0, dy: 0, active: false })

  const trackerRef = useRef(null)
  const frameRef = useRef(null)
  const pressRef = useRef(null)
  const detailOpenAt = useRef(0)
  const cardShownAt = useRef(0)
  const maxDepthRef = useRef(0)
  const secOpenAt = useRef({}) // section key -> 펼친 시각
  const openedByTicker = useRef(new Map()) // ticker -> 지금까지 연 섹션 목록
  const logEndRef = useRef(null)

  // 세션 1개 = Tracker 1개
  if (!trackerRef.current) {
    trackerRef.current = new Tracker((e) => setLog((L) => [...L.slice(-199), e]))
  }
  const tracker = trackerRef.current

  const card = cards[idx]

  // 카드가 바뀔 때마다 노출 기록
  useEffect(() => {
    if (card && !result) {
      cardShownAt.current = performance.now()
      tracker.trackCardView({ ticker: card.ticker })
    }
  }, [idx]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' })
  }, [log.length])

  const openedFor = (ticker) => openedByTicker.current.get(ticker) ?? []

  // ③ 히트맵 — 프레임 안의 모든 터치를 정규화 좌표 + 눌린 섹션으로 기록
  const onFramePointerDown = useCallback(
    (ev) => {
      if (result) return
      const r = frameRef.current.getBoundingClientRect()
      const zone = ev.target?.closest?.('[data-section]')?.dataset.section ?? 'other'
      tracker.trackTap({
        screen: detail ? 'detail' : 'deck',
        ticker: detail?.ticker ?? card?.ticker ?? null,
        section: zone,
        x: +((ev.clientX - r.left) / r.width).toFixed(4),
        y: +((ev.clientY - r.top) / r.height).toFixed(4),
      })
    },
    [detail, card, result, tracker],
  )

  // ① 스와이프 — pointerdown/move/up 으로 방향·속도·시간 계산
  const onCardDown = (ev) => {
    ev.currentTarget.setPointerCapture?.(ev.pointerId)
    pressRef.current = { x: ev.clientX, y: ev.clientY, t: performance.now() }
    setDrag({ dx: 0, dy: 0, active: true })
  }

  const onCardMove = (ev) => {
    if (!pressRef.current) return
    setDrag({
      dx: ev.clientX - pressRef.current.x,
      dy: ev.clientY - pressRef.current.y,
      active: true,
    })
  }

  const onCardUp = (ev) => {
    const p = pressRef.current
    if (!p) return
    pressRef.current = null

    const dx = ev.clientX - p.x
    const dy = ev.clientY - p.y
    const dt = Math.round(performance.now() - p.t)
    setDrag({ dx: 0, dy: 0, active: false })

    // 거의 안 움직였으면 탭 → 상세 열기
    if (Math.hypot(dx, dy) < TAP_SLOP) {
      openDetail(card)
      return
    }

    if (Math.abs(dx) < SWIPE_THRESHOLD) return // 되돌아감, 기록 안 함

    const direction = dx > 0 ? 'right' : 'left'
    const r = frameRef.current.getBoundingClientRect()
    tracker.trackSwipe({
      ticker: card.ticker,
      direction,
      dx,
      dy,
      duration_ms: dt,
      x: +((ev.clientX - r.left) / r.width).toFixed(4),
      y: +((ev.clientY - r.top) / r.height).toFixed(4),
    })
    decide(card, direction === 'right' ? 'buy' : 'pass', 'deck_swipe')
  }

  // 매수/패스 결정 — 그때까지 이 종목에서 연 섹션을 같이 기록
  const decide = (c, choice, source) => {
    if (!c) return
    tracker.trackDecision({
      ticker: c.ticker,
      choice,
      source,
      sectionsOpened: openedFor(c.ticker),
      msSinceView: Math.round(performance.now() - cardShownAt.current),
    })
    setIdx((i) => Math.min(i + 1, cards.length))
  }

  const openDetail = (c) => {
    if (!c) return
    detailOpenAt.current = performance.now()
    maxDepthRef.current = 0
    secOpenAt.current = {}
    setOpen([])
    tracker.trackDetailOpen({ ticker: c.ticker })
    setDetail(c)
  }

  // 펼쳐진 섹션들을 닫으면서 각각의 열람 시간을 기록
  const flushSections = (ticker, keys) => {
    keys.forEach((k) => {
      const t = secOpenAt.current[k]
      if (t == null) return
      tracker.trackSectionClose({
        ticker,
        section: k,
        duration_ms: Math.round(performance.now() - t),
      })
      delete secOpenAt.current[k]
    })
  }

  const closeDetail = () => {
    if (!detail) return
    flushSections(detail.ticker, open)
    setOpen([])
    tracker.trackDwell({
      screen: 'detail',
      ticker: detail.ticker,
      duration_ms: Math.round(performance.now() - detailOpenAt.current),
    })
    setDetail(null)
  }

  // ④⑤ 섹션 '상세보기' 토글 — 이 데모의 핵심 수집 지점
  const toggleSection = (key) => {
    if (!detail) return
    const t = detail.ticker
    if (open.includes(key)) {
      flushSections(t, [key])
      setOpen((o) => o.filter((k) => k !== key))
      return
    }
    const already = openedFor(t)
    if (!already.includes(key)) openedByTicker.current.set(t, [...already, key])
    secOpenAt.current[key] = performance.now()
    tracker.trackSectionOpen({
      ticker: t,
      section: key,
      order: openedFor(t).indexOf(key) + 1,
    })
    setOpen((o) => [...o, key])
  }

  // 상세화면에서 바로 결정 → 정보를 본 직후의 선택이 그대로 남는다
  const decideFromDetail = (choice) => {
    if (!detail) return
    const c = detail
    flushSections(c.ticker, open)
    setOpen([])
    tracker.trackDwell({
      screen: 'detail',
      ticker: c.ticker,
      duration_ms: Math.round(performance.now() - detailOpenAt.current),
    })
    setDetail(null)
    decide(c, choice, 'detail_button')
  }

  // ② 스크롤 — 도달 비율이 갱신될 때만 기록 (5% 단위)
  const onDetailScroll = (ev) => {
    const el = ev.currentTarget
    const denom = el.scrollHeight - el.clientHeight
    const depth = denom > 0 ? el.scrollTop / denom : 1
    if (depth > maxDepthRef.current + 0.05) {
      maxDepthRef.current = depth
      tracker.trackScroll({ ticker: detail.ticker, depth })
    }
  }

  const endSession = async () => {
    closeDetail()
    const r = await tracker.flush()
    setResult(r)
  }

  const deckDone = idx >= cards.length

  return (
    <div className="wrap">
      {/* ---------------- 왼쪽: 앱 화면 ---------------- */}
      <div className="phoneCol">
        <div className="phone" ref={frameRef} onPointerDown={onFramePointerDown}>
          <div className="statusbar" data-section="header">
            <span>KIDS 종목 카드</span>
            <span>
              {Math.min(idx + 1, cards.length)} / {cards.length}
            </span>
          </div>

          {!deckDone && !detail && (
            <div className="deck">
              {cards
                .slice(idx, idx + 3)
                .map((c, i) => {
                  const top = i === 0
                  const style = top
                    ? {
                        transform: `translate(${drag.dx}px, ${drag.dy * 0.3}px) rotate(${drag.dx / 18}deg)`,
                        transition: drag.active ? 'none' : 'transform .25s ease',
                        zIndex: 10,
                      }
                    : {
                        transform: `translateY(${i * 10}px) scale(${1 - i * 0.04})`,
                        zIndex: 10 - i,
                        opacity: 0.85,
                      }
                  return (
                    <div
                      key={c.ticker}
                      className="card"
                      data-section="card"
                      style={style}
                      onPointerDown={top ? onCardDown : undefined}
                      onPointerMove={top ? onCardMove : undefined}
                      onPointerUp={top ? onCardUp : undefined}
                      onPointerCancel={top ? onCardUp : undefined}
                    >
                      {top && drag.dx > 40 && <div className="stamp like">관심</div>}
                      {top && drag.dx < -40 && <div className="stamp nope">패스</div>}
                      <div className="cardTop">
                        <div className="brand">{c.brand}</div>
                        <div className="meta">
                          {c.name} · {c.ticker} · {c.category}
                        </div>
                      </div>
                      <div className="tier">{c.tier}</div>
                      {/* 카드 앞면에는 이름/등급만. 숫자를 보려면 상세로 들어가야 한다.
                          → "이름만 보고 샀나"를 구분하려면 앞면이 정보를 주면 안 됨. */}
                      <div className="cardBlank">
                        <div className="blankIcon">?</div>
                        <div className="blankTxt">
                          수익률 · 변동성 · 뉴스는
                          <br />
                          탭해서 상세보기에서
                        </div>
                      </div>
                      <div className="hint">← 패스 · 탭하면 상세 · 관심 →</div>
                    </div>
                  )
                })
                .reverse()}
            </div>
          )}

          {deckDone && !detail && (
            <div className="done">
              <div className="doneTitle">카드 다 봤어</div>
              <div className="doneSub">아래 "세션 종료"를 누르면 배치 전송돼</div>
            </div>
          )}

          {detail && (
            <div className="detail" onScroll={onDetailScroll}>
              <div className="detailHead" data-section="header">
                <div>
                  <div className="brand sm">{detail.brand}</div>
                  <div className="meta">
                    {detail.name} · {detail.ticker} · {detail.tier}
                  </div>
                </div>
                <button className="close" onClick={closeDetail}>
                  닫기
                </button>
              </div>

              {SECTIONS.map((s) => (
                <InfoSection
                  key={s.key}
                  sec={s}
                  card={detail}
                  open={open.includes(s.key)}
                  onToggle={() => toggleSection(s.key)}
                />
              ))}

              <div className="decideBar" data-section="action">
                <button className="dPass" onClick={() => decideFromDetail('pass')}>
                  패스
                </button>
                <button className="dBuy" onClick={() => decideFromDetail('buy')}>
                  관심 (매수)
                </button>
              </div>
              <div className="endmark">— 여기까지 읽음 (스크롤 100%) —</div>
            </div>
          )}
        </div>

        <button className="endBtn" onClick={endSession} disabled={!!result}>
          {result ? '전송 완료' : '세션 종료 → Supabase 배치 전송'}
        </button>
        <div className="conn">
          {hasSupabase ? '● Supabase 연결됨' : '○ 로컬 전용 (.env.local 미설정)'}
        </div>
      </div>

      {/* ---------------- 오른쪽: 수집 현황 ---------------- */}
      <div className="panel">
        <h2>이름만 보고 샀나 / 정보 보고 샀나</h2>
        <BuyBasis tracker={tracker} log={log} />

        <h2>섹션별 "상세보기" 열람</h2>
        <SectionBars tracker={tracker} log={log} />

        <h2>종목별 결정 ↔ 열어본 정보</h2>
        <PerTicker tracker={tracker} log={log} />

        <h2>실시간 수집 로그</h2>
        <div className="counts">
          <Badge n={log.filter((e) => e.type === 'swipe').length} t="swipe" />
          <Badge n={log.filter((e) => e.type === 'section_open').length} t="section" />
          <Badge n={log.filter((e) => e.type === 'decision').length} t="decision" />
          <Badge n={log.filter((e) => e.type === 'scroll').length} t="scroll" />
          <Badge n={log.filter((e) => e.type === 'tap').length} t="tap" />
          <Badge n={log.filter((e) => e.type === 'card_view').length} t="view" />
          <Badge n={log.filter((e) => e.type === 'dwell').length} t="dwell" />
        </div>

        <div className="logbox">
          {log.length === 0 && <div className="empty">카드를 탭하거나 스와이프해봐. 여기 바로 찍혀.</div>}
          {log.slice(-60).map((e, i) => (
            <div className={'row r_' + e.type} key={i}>
              <span className="ts">{String(e.ts).padStart(6, ' ')}ms</span>
              <span className="ty">{e.type}</span>
              <span className="dt">{describe(e)}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        <h2>히트맵 (4×6 그리드 압축)</h2>
        <Heatmap events={log} />

        <h2>세션 집계 (미리보기)</h2>
        <Summary tracker={tracker} log={log} />

        {result && (
          <div className={'result ' + (result.ok ? 'ok' : 'fail')}>
            <b>
              {result.ok
                ? `전송 성공 — behavior_events ${result.rawCount}건 + session_summary 1건`
                : result.reason === 'no-supabase'
                  ? '.env.local 에 키가 없어 전송은 건너뜀 (집계는 아래에 그대로 계산됨)'
                  : '전송 실패: ' + (result.errors || []).join(' / ')}
            </b>
            <pre>{JSON.stringify(result.summary, null, 1)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------- 상세화면의 정보 섹션 (접힌 상태 = 제목만) ----------------

function InfoSection({ sec, card, open, onToggle }) {
  return (
    <div className={'infoSec' + (open ? ' isOpen' : '')} data-section={sec.key}>
      <div className="secHead">
        <div className="secTitle">
          <span className={'secDot d_' + sec.key} />
          {sec.label}
        </div>
        <button className="expandBtn" onClick={onToggle}>
          {open ? '접기' : '상세보기'}
        </button>
      </div>
      <div className="secTeaser">{TEASER[sec.key](card)}</div>
      {open && <div className="secBody">{BODY[sec.key](card)}</div>}
    </div>
  )
}

// 접힌 상태에서 보이는 한 줄 — 숫자는 안 준다. 열어야 나온다.
const TEASER = {
  chart: () => '최근 2년 주가 흐름 · 수익률 · 낙폭',
  company: () => '무슨 회사인지 · 밸류에이션 · 배당',
  news: () => '최근 이슈 3건 요약',
}

const BODY = {
  chart: (c) => (
    <>
      <Spark card={c} />
      <div className="statsRow">
        <Stat label="연수익률" v={pct(c.cagr)} />
        <Stat label="변동성" v={pct(c.vol)} />
        <Stat label="최대낙폭" v={pct(c.mdd)} />
        <Stat label="샤프" v={num(c.sharpe)} />
      </div>
      <p>
        최근 2년 연환산 수익률은 {pct(c.cagr)}. 같은 기간 최대낙폭은 {pct(c.mdd)}였어. 낙폭은
        "제일 많이 떨어졌을 때 얼마나 떨어졌나"를 뜻해. 연 변동성 {pct(c.vol)}는 숫자가 클수록
        가격이 위아래로 크게 출렁인다는 뜻이야.
      </p>
    </>
  ),
  company: (c) => (
    <>
      <div className="statsRow">
        <Stat label="PER" v={num(c.per, 1) + '배'} />
        <Stat label="PBR" v={num(c.pbr, 2) + '배'} />
        <Stat label="배당" v={num(c.div, 2) + '%'} />
        <Stat label="친밀도" v={c.familiarity + '점'} />
      </div>
      <p>
        {c.brand}는 {c.category} 분야의 {c.name}이 만든 브랜드야. 친밀도 {c.familiarity}점 — 아이가
        일상에서 자주 마주치는 정도를 뜻해.
      </p>
      <p>
        PER {num(c.per, 1)}배는 회사가 1년에 버는 돈 대비 가격이 몇 배인지야. 낮을수록 싸게 사는
        셈이지만, 싼 데는 이유가 있을 수도 있어. 배당수익률 {num(c.div, 2)}%는 주식을 갖고만 있어도
        매년 이만큼을 현금으로 돌려준다는 뜻이고.
      </p>
      <p className="warn">이 종목은 {c.tier}으로 분류됐어. 안정성 + 품질 점수를 합친 등급이야.</p>
    </>
  ),
  news: (c) => (
    <>
      {news(c).map((n, i) => (
        <div className="newsItem" key={i}>
          <div className="newsTop">
            <span className="newsTag">{n.tag}</span>
            <span className="newsDate">{n.date}</span>
          </div>
          <div className="newsTitle">{n.title}</div>
          <div className="newsBody">{n.body}</div>
        </div>
      ))}
      <p className="warn">
        데모용으로 지표에서 자동 생성한 문장이야. 실제 뉴스가 아니고 투자 권유도 아니야.
      </p>
    </>
  ),
}

function Stat({ label, v }) {
  return (
    <div className="stat">
      <div className="sl">{label}</div>
      <div className="sv">{v}</div>
    </div>
  )
}

// 티커로 시드를 고정해 매번 같은 모양이 나오는 데모용 주가 곡선
function Spark({ card }) {
  const d = useMemo(() => {
    let h = 2166136261
    for (const ch of card.ticker) {
      h ^= ch.charCodeAt(0)
      h = Math.imul(h, 16777619)
    }
    const rnd = () => {
      h ^= h << 13
      h ^= h >>> 17
      h ^= h << 5
      return ((h >>> 0) % 10000) / 10000 - 0.5
    }
    const n = 48
    const drift = card.cagr / n
    const pts = []
    let v = 1
    for (let i = 0; i < n; i++) {
      v *= 1 + drift + rnd() * card.vol * 0.28
      pts.push(v)
    }
    const lo = Math.min(...pts)
    const hi = Math.max(...pts)
    const span = hi - lo || 1
    return pts
      .map((p, i) => `${(i / (n - 1)) * 100},${38 - ((p - lo) / span) * 34}`)
      .join(' ')
  }, [card.ticker, card.cagr, card.vol])

  const up = card.cagr >= 0
  return (
    <svg className="spark" viewBox="0 0 100 40" preserveAspectRatio="none">
      <polyline points={d} fill="none" stroke={up ? '#34d399' : '#f87171'} strokeWidth="1.2" />
    </svg>
  )
}

function news(c) {
  const up = c.cagr >= 0
  return [
    {
      tag: '실적',
      date: '3일 전',
      title: `${c.name}, 최근 2년 연환산 ${pct(c.cagr)} ${up ? '상승' : '하락'}`,
      body: `${c.category} 업황 영향으로 주가가 ${up ? '우상향' : '약세'} 흐름을 보였어. 같은 기간 최대낙폭은 ${pct(c.mdd)}.`,
    },
    {
      tag: '밸류',
      date: '1주 전',
      title: `PER ${num(c.per, 1)}배 — 업종 평균 대비 ${c.per < 12 ? '낮은' : '높은'} 수준`,
      body: `PBR ${num(c.pbr, 2)}배. ${c.pbr < 1 ? '장부가보다 싸게 거래되고 있어.' : '장부가보다 비싸게 평가받고 있어.'}`,
    },
    {
      tag: '배당',
      date: '2주 전',
      title: `배당수익률 ${num(c.div, 2)}% 유지`,
      body: `변동성 ${pct(c.vol)} 수준에서 ${c.div > 3 ? '배당 매력이 부각되는' : '배당보다 성장에 무게가 실리는'} 구간이라는 평가.`,
    },
  ]
}

// ---------------- 오른쪽 패널 ----------------

function Badge({ n, t }) {
  return (
    <div className={'badge b_' + t}>
      <b>{n}</b>
      <span>{t}</span>
    </div>
  )
}

// 이 데모의 결론 화면: 매수 결정이 이름 기반이었나 정보 기반이었나
function BuyBasis({ tracker, log }) {
  const s = useMemo(() => tracker.summarize(), [log.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const buys = s.buys_total
  const nameOnly = s.buys_name_only
  const informed = s.buys_informed
  const w = buys ? (nameOnly / buys) * 100 : 0

  return (
    <div className="basis">
      <div className="basisBar">
        <div className="bName" style={{ width: w + '%' }}>
          {nameOnly > 0 && `이름만 ${nameOnly}`}
        </div>
        <div className="bInfo" style={{ width: 100 - w + '%' }}>
          {informed > 0 && `정보보고 ${informed}`}
        </div>
      </div>
      <div className="basisRow">
        <div className="bk">매수(관심)</div>
        <div className="bv">{buys}건</div>
        <div className="bk">패스</div>
        <div className="bv">{s.passes_total}건</div>
      </div>
      <div className="basisRow">
        <div className="bk">이름만 보고 매수</div>
        <div className="bv hot">
          {s.name_only_buy_rate == null ? '—' : pct(s.name_only_buy_rate)}
        </div>
        <div className="bk">매수 전 평균 열람 섹션</div>
        <div className="bv">{s.avg_sections_before_buy ?? '—'} / 3</div>
      </div>
      <div className="basisRow">
        <div className="bk">판단 유형</div>
        <div className="bv hl">{s.decision_style ?? '판정보류 (매수 2건 필요)'}</div>
        <div className="bk">먼저 보는 정보</div>
        <div className="bv">{s.first_section ? SECTION_LABEL[s.first_section] : '—'}</div>
      </div>
    </div>
  )
}

function SectionBars({ tracker, log }) {
  const s = useMemo(() => tracker.summarize(), [log.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(1, ...SECTION_KEYS.map((k) => s.section_opens[k]))
  return (
    <table className="secTable">
      <thead>
        <tr>
          <th>섹션</th>
          <th>상세보기 클릭</th>
          <th>열어본 종목</th>
          <th>총 열람시간</th>
        </tr>
      </thead>
      <tbody>
        {SECTION_KEYS.map((k) => (
          <tr key={k}>
            <td>
              <span className={'secDot d_' + k} />
              {SECTION_LABEL[k]}
            </td>
            <td>
              <div className="miniBar">
                <div
                  className={'miniFill f_' + k}
                  style={{ width: (s.section_opens[k] / max) * 100 + '%' }}
                />
                <span>{s.section_opens[k]}</span>
              </div>
            </td>
            <td>{s.section_tickers[k]}</td>
            <td>{(s.section_dwell_ms[k] / 1000).toFixed(1)}s</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PerTicker({ tracker, log }) {
  const rows = useMemo(() => tracker.perTicker(), [log.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const decided = rows.filter((r) => r.choice)
  if (!decided.length) return <div className="empty pad">아직 결정한 종목이 없어.</div>
  return (
    <table className="ptTable">
      <thead>
        <tr>
          <th>종목</th>
          <th>열어본 정보</th>
          <th>결정</th>
          <th>걸린시간</th>
        </tr>
      </thead>
      <tbody>
        {decided.slice(-12).map((r) => (
          <tr key={r.ticker}>
            <td>{r.ticker}</td>
            <td>
              {r.opened.length === 0 ? (
                <span className="noneTag">없음 (이름만)</span>
              ) : (
                r.opened.map((k) => (
                  <span className={'openTag t_' + k} key={k}>
                    {SECTION_LABEL[k]}
                  </span>
                ))
              )}
            </td>
            <td className={r.choice === 'buy' ? 'cBuy' : 'cPass'}>
              {r.choice === 'buy' ? '매수' : '패스'}
            </td>
            <td>{r.ms == null ? '—' : (r.ms / 1000).toFixed(1) + 's'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function describe(e) {
  switch (e.type) {
    case 'swipe':
      return `${e.direction === 'right' ? '관심→' : '←패스'} ${e.ticker} · ${e.duration_ms}ms · ${e.velocity}px/ms`
    case 'scroll':
      return `${e.ticker} 읽기 깊이 ${(e.depth * 100).toFixed(0)}%`
    case 'tap':
      return `${e.screen}/${e.section} (x=${e.x.toFixed(2)}, y=${e.y.toFixed(2)})`
    case 'card_view':
      return `${e.ticker} 노출`
    case 'detail_open':
      return `${e.ticker} 상세 진입`
    case 'section_open':
      return `${e.ticker} · ${SECTION_LABEL[e.section] ?? e.section} 상세보기 (${e.meta?.order}번째)`
    case 'section_close':
      return `${e.ticker} · ${SECTION_LABEL[e.section] ?? e.section} 접음 · ${e.duration_ms}ms 열람`
    case 'decision':
      return `${e.ticker} ${e.choice === 'buy' ? '매수' : '패스'} · 열람 ${e.meta?.sections_opened ?? 0}개${
        e.meta?.sections_opened ? ' (' + e.meta.sections_list.map((k) => SECTION_LABEL[k]).join(',') + ')' : ' → 이름만'
      }`
    case 'dwell':
      return `${e.ticker} 상세 체류 ${e.duration_ms}ms`
    default:
      return ''
  }
}

function Heatmap({ events }) {
  const grid = useMemo(() => {
    const g = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0))
    events
      .filter((e) => e.type === 'tap' && e.x != null)
      .forEach((t) => {
        const r = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(t.y * GRID_ROWS)))
        const c = Math.min(GRID_COLS - 1, Math.max(0, Math.floor(t.x * GRID_COLS)))
        g[r][c] += 1
      })
    return g
  }, [events])

  const max = Math.max(1, ...grid.flat())
  return (
    <div className="heat">
      {grid.map((row, r) => (
        <div className="hrow" key={r}>
          {row.map((v, c) => (
            <div
              className="hcell"
              key={c}
              style={{ background: `rgba(239,68,68,${(v / max) * 0.85})` }}
            >
              {v || ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Summary({ tracker, log }) {
  const s = useMemo(() => tracker.summarize(), [log.length]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <table className="sum">
      <tbody>
        <Row k="본 카드 수" v={s.cards_viewed} />
        <Row k="관심 / 패스" v={`${s.buys_total} / ${s.passes_total}`} />
        <Row k="평균 판단시간" v={s.avg_swipe_ms ? s.avg_swipe_ms + 'ms' : '—'} />
        <Row k="상세 진입 종목수" v={s.detail_opens} />
        <Row k="정보 열람률" v={pct(s.info_use_rate)} />
        <Row k="평균 읽기 깊이" v={s.avg_scroll_depth == null ? '—' : pct(s.avg_scroll_depth)} />
        <Row k="상세 총 체류" v={s.read_ms_total + 'ms'} />
        <Row k="섹션 열람" v={JSON.stringify(s.section_opens)} />
        <Row k="탭 위치 비율" v={JSON.stringify(s.section_share)} />
        <Row k="가장 오래 본 섹션" v={s.top_section ? SECTION_LABEL[s.top_section] : '—'} />
        <Row k="이름만 매수 비율" v={s.name_only_buy_rate == null ? '—' : pct(s.name_only_buy_rate)} hl />
        <Row k="판단 유형" v={s.decision_style ?? '—'} hl />
        <Row k="확신 지수" v={s.confidence_index ?? '판정보류 (결정 3건 필요)'} hl />
        <Row k="탐색 지수" v={s.exploration_index ?? '—'} hl />
        <Row k="행동 유형" v={s.behavior_type ?? '—'} hl />
      </tbody>
    </table>
  )
}

function Row({ k, v, hl }) {
  return (
    <tr className={hl ? 'hl' : ''}>
      <td>{k}</td>
      <td>{v}</td>
    </tr>
  )
}
