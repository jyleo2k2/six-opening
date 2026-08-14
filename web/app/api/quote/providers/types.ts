/**
 * 시세 제공자 계약. 키움·토스가 같은 모양으로 값을 돌려주게 만든다.
 *
 * 캐시·폴백 사다리·보관 DB 반영은 `../quotes.ts` 오케스트레이터가 갖고, 여기 구현체는
 * "한 종목의 현재가·캔들을 받아 온다"만 책임진다. 제공자마다 다른 것은 `limits` 로 뺀다.
 */

export type ChartPeriod = "minute" | "daily" | "weekly";

export type ChartPoint = {
  /** 초 단위 epoch. 캔들 렌더와 보관 키가 같은 축을 쓴다. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** 스파크라인 소비자와의 호환용 종가 별칭. */
  price: number;
};

export type ProviderId = "kiwoom" | "toss";

/**
 * 값의 출처. 제공자 이름이 아니라 "실시간이냐 아니냐"다.
 *
 * 예전에는 `"kiwoom" | "fixture"` 여서 소비자가 `source === "kiwoom"` 으로 실시간 여부를
 * 판단했다. 제공자가 둘이 되면 그 비교가 토스 실시간 값을 픽스처로 오인한다.
 * 어느 제공자였는지는 `provider` 필드로 따로 싣는다.
 */
export type QuoteSource = "live" | "fixture";

/** 제공자가 돌려주는 현재가. 종목명·출처 표기는 오케스트레이터가 붙인다. */
export type LiveQuote = {
  price: number;
  change: number;
  rate: number;
};

/**
 * 제공자별 조회 예산. 값이 다른 이유는 전부 초당 호출 제한 하나다.
 *
 * 키움은 초당 1건이라 요청 한 건이 2.6초짜리 대기다. 그래서 카드 폴링은 한 번에 한
 * 종목만 데우고, 분봉 페이지를 2장에서 끊고, 낡은 분봉 캐시를 10분까지 그냥 보여준다.
 * 제한이 느슨한 제공자에서는 이 우회로를 풀어야 실제로 빨라진다.
 */
export type ProviderLimits = {
  /** 요청 사이 최소 간격(ms). 0이면 큐가 대기 없이 흐른다. */
  requestIntervalMs: number;
  /** 카드 시세 폴링 한 번에 데울 종목 수. */
  refreshBatchSize: number;
  /** 분봉 연속조회 페이지 상한. */
  minuteMaxPages: number;
  /** 분봉을 낡은 채로 먼저 보여줄 수 있는 한계(ms). */
  minuteStaleMs: number;
};

export type QuoteProvider = {
  id: ProviderId;
  limits: ProviderLimits;
  /** 이 제공자의 키가 `.env` 에 채워져 있는지. 자리표시자(`your_...`)는 없는 것으로 본다. */
  hasCredentials(): boolean;
  /** `background` 는 카드 시세 폴링처럼 아무도 기다리지 않는 호출에 쓴다. */
  fetchQuote(symbol: string, background?: boolean): Promise<LiveQuote>;
  /** `stopAtTimestamp` 이전 구간은 이미 갖고 있으므로 더 받지 않는다 — 증분 조회. */
  fetchChart(
    symbol: string,
    period: ChartPeriod,
    stopAtTimestamp?: number,
    background?: boolean,
  ): Promise<ChartPoint[]>;
};
