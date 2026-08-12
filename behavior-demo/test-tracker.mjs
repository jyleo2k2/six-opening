import assert from 'node:assert/strict'
import test from 'node:test'

let clock = 1_000
let uuidSequence = 0
const storage = new Map()

Object.defineProperties(globalThis, {
  performance: {
    configurable: true,
    value: { now: () => clock++ },
  },
  localStorage: {
    configurable: true,
    value: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
  },
  crypto: {
    configurable: true,
    value: {
      randomUUID: () => `00000000-0000-4000-8000-${String(++uuidSequence).padStart(12, '0')}`,
    },
  },
})

const { Tracker } = await import('./src/tracker.js')

function addDecision(tracker, ticker, sectionsOpened) {
  tracker.trackDecision({
    ticker,
    choice: 'buy',
    source: sectionsOpened.length ? 'detail_button' : 'deck_swipe',
    sectionsOpened,
    msSinceView: 300,
  })
}

function summaryForNameOnlyRatio(nameOnlyCount, informedCount) {
  const tracker = new Tracker()

  for (let index = 0; index < nameOnlyCount; index += 1) {
    addDecision(tracker, `NAME-${index}`, [])
  }
  for (let index = 0; index < informedCount; index += 1) {
    addDecision(tracker, `INFO-${index}`, ['chart'])
  }

  return tracker.summarize()
}

test('정보를 열지 않은 세션은 이름형·즉단형으로 요약한다', () => {
  const tracker = new Tracker()

  for (let index = 0; index < 3; index += 1) {
    const ticker = `FAST-${index}`
    tracker.trackCardView({ ticker })
    tracker.trackSwipe({
      ticker,
      direction: 'right',
      dx: 100,
      dy: 0,
      duration_ms: 300,
      x: 0.5,
      y: 0.5,
    })
    addDecision(tracker, ticker, [])
  }

  const summary = tracker.summarize()

  assert.equal(summary.decisions_total, 3)
  assert.equal(summary.buys_name_only, 3)
  assert.equal(summary.buys_informed, 0)
  assert.equal(summary.name_only_buy_rate, 1)
  assert.equal(summary.informed_buy_rate, 0)
  assert.equal(summary.avg_sections_before_buy, 0)
  assert.equal(summary.info_use_rate, 0)
  assert.equal(summary.decision_style, '이름형')
  assert.equal(summary.confidence_index, 1)
  assert.equal(summary.exploration_index, 0)
  assert.equal(summary.behavior_type, '즉단형')
})

test('매번 세 섹션을 열고 결정한 세션은 정보형·탐색형으로 요약한다', () => {
  const tracker = new Tracker()
  const sections = ['chart', 'company', 'news']

  for (let index = 0; index < 3; index += 1) {
    const ticker = `DEEP-${index}`
    tracker.trackCardView({ ticker })
    tracker.trackDetailOpen({ ticker })
    tracker.trackScroll({ ticker, depth: 1 })
    sections.forEach((section, sectionIndex) => {
      tracker.trackSectionOpen({ ticker, section, order: sectionIndex + 1 })
    })
    addDecision(tracker, ticker, sections)
  }

  const summary = tracker.summarize()

  assert.equal(summary.decisions_total, 3)
  assert.equal(summary.buys_name_only, 0)
  assert.equal(summary.buys_informed, 3)
  assert.equal(summary.name_only_buy_rate, 0)
  assert.equal(summary.informed_buy_rate, 1)
  assert.equal(summary.avg_sections_before_buy, 3)
  assert.equal(summary.info_use_rate, 1)
  assert.equal(summary.decision_style, '정보형')
  assert.equal(summary.confidence_index, 0.225)
  assert.equal(summary.exploration_index, 0.925)
  assert.equal(summary.behavior_type, '탐색형')
})

test('decision_style은 0.7과 0.3 경계값을 포함한다', () => {
  assert.equal(summaryForNameOnlyRatio(7, 3).decision_style, '이름형')
  assert.equal(summaryForNameOnlyRatio(6, 4).decision_style, '혼합형')
  assert.equal(summaryForNameOnlyRatio(4, 6).decision_style, '혼합형')
  assert.equal(summaryForNameOnlyRatio(3, 7).decision_style, '정보형')
})

test('확신도·탐색도의 중간값과 낮은 값은 신중형·산만형으로 나눈다', () => {
  const careful = new Tracker()
  const scattered = new Tracker()
  const allSections = ['chart', 'company', 'news']

  for (let index = 0; index < 4; index += 1) {
    const ticker = `MID-${index}`
    careful.trackCardView({ ticker })
    scattered.trackCardView({ ticker })
    scattered.trackSwipe({
      ticker,
      direction: 'right',
      dx: 100,
      dy: 0,
      duration_ms: 2300,
      x: 0.5,
      y: 0.5,
    })

    if (index < 2) {
      careful.trackDetailOpen({ ticker })
      careful.trackScroll({ ticker, depth: 0.5 })
      allSections.forEach((section, sectionIndex) => {
        careful.trackSectionOpen({ ticker, section, order: sectionIndex + 1 })
      })
      addDecision(careful, ticker, allSections)

      scattered.trackDetailOpen({ ticker })
      scattered.trackSectionOpen({ ticker, section: 'chart', order: 1 })
      addDecision(scattered, ticker, ['chart'])
    } else {
      addDecision(careful, ticker, [])
      addDecision(scattered, ticker, [])
    }
  }

  const carefulSummary = careful.summarize()
  assert.equal(carefulSummary.confidence_index, 0.5)
  assert.equal(carefulSummary.exploration_index, 0.5)
  assert.equal(carefulSummary.behavior_type, '신중형')

  const scatteredSummary = scattered.summarize()
  assert.equal(scatteredSummary.confidence_index, 0.275)
  assert.equal(scatteredSummary.exploration_index, 0.317)
  assert.equal(scatteredSummary.behavior_type, '산만형')
})

test('표본 미달이면 각 판정을 정해진 최소 건수까지 유보한다', () => {
  const oneBuy = summaryForNameOnlyRatio(1, 0)
  assert.equal(oneBuy.decision_style, null)
  assert.equal(oneBuy.confidence_index, null)
  assert.equal(oneBuy.exploration_index, null)
  assert.equal(oneBuy.behavior_type, null)

  const twoBuys = summaryForNameOnlyRatio(2, 0)
  assert.equal(twoBuys.decision_style, '이름형')
  assert.equal(twoBuys.confidence_index, null)
  assert.equal(twoBuys.exploration_index, null)
  assert.equal(twoBuys.behavior_type, null)
})
