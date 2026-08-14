/**
 * `.env` 로 시세 제공자를 고른다.
 *
 * ```
 * QUOTE_PROVIDER=toss              # 먼저 시도할 제공자
 * QUOTE_PROVIDER_FALLBACK=kiwoom   # 키가 없거나 호출이 실패하면 넘어갈 제공자(쉼표로 여러 개)
 * ```
 *
 * 값을 바꾸면 서버를 다시 켜야 반영된다. `.env` 는 프로세스당 한 번만 읽고(`dev-env.ts`),
 * 메모리 캐시도 그때 같이 비워지므로 재기동이 곧 전환 경계다.
 */

import { loadDevelopmentEnvironment } from "../../dev-env";
import { kiwoomProvider } from "./kiwoom";
import { tossProvider } from "./toss";
import type { ProviderId, ProviderLimits, QuoteProvider } from "./types";

const PROVIDERS: Record<ProviderId, QuoteProvider> = {
  kiwoom: kiwoomProvider,
  toss: tossProvider,
};

const DEFAULT_ORDER: ProviderId[] = ["kiwoom", "toss"];

/** 제공자가 하나도 살아 있지 않을 때 쓰는 값. 키움 기준으로 가장 보수적으로 잡는다. */
const CONSERVATIVE_LIMITS: ProviderLimits = kiwoomProvider.limits;

function parseIds(value: string | undefined): ProviderId[] {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is ProviderId => entry in PROVIDERS);
}

/**
 * 시도 순서. 설정한 제공자 → 폴백 → 남은 제공자 순이며 중복은 접는다.
 *
 * 마지막에 남은 제공자까지 붙이는 이유는, `QUOTE_PROVIDER` 를 잘못 적었을 때 키가 있는
 * 제공자를 두고 픽스처로 떨어지는 상황을 막기 위해서다.
 */
export function providerOrder(): QuoteProvider[] {
  loadDevelopmentEnvironment();
  const ids = [
    ...parseIds(process.env.QUOTE_PROVIDER),
    ...parseIds(process.env.QUOTE_PROVIDER_FALLBACK),
    ...DEFAULT_ORDER,
  ];
  return Array.from(new Set(ids), (id) => PROVIDERS[id]);
}

/** 키가 채워진 제공자만, 시도 순서대로. */
export function availableProviders(): QuoteProvider[] {
  return providerOrder().filter((provider) => provider.hasCredentials());
}

/** 실시간 조회가 가능한 제공자가 하나라도 있는지. 없으면 보관 캔들·픽스처로 간다. */
export function hasQuoteCredentials() {
  return availableProviders().length > 0;
}

/** 지금 실제로 쓰이는 제공자의 조회 예산. 조회 주기·페이지 상한을 여기서 읽는다. */
export function activeLimits(): ProviderLimits {
  return availableProviders()[0]?.limits ?? CONSERVATIVE_LIMITS;
}

export type { ProviderId, ProviderLimits, QuoteProvider };
