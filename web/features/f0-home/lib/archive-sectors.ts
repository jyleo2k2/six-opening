import { SECTORS } from "../../../shared/data/sectors";
import { STOCKS } from "../../../shared/data/stocks";
import { won, type Holding } from "./portfolio-view";

/**
 * 아카이브 수익률 탭의 `보유 종목 · 섹터별` 레일 값.
 *
 * 원래 `app.html` 의 `buildArchive.js` 가 `secGroups`·`retSectors` 로 만들던 것이다.
 * 아카이브를 React 로 옮길 때(PR #238) 이 레일만 함께 오지 못했고, 그 레일이 열던
 * 섹터 상세(`secModal*`)는 도달 불가가 돼 같이 지워졌다.
 *
 * 되살리면서 **상세는 만들지 않는다.** 아카이브에는 이미 자리가 넷(성향·수익률·카드
 * 모아보기·가족 비교) 있고, 레일에서 섹터별 수익률이 보이면 이 화면이 답하려던 질문
 * ("어느 분야에서 벌고 잃었나")은 끝난다.
 *
 * 종목 → 섹터 매핑과 이모지 규칙은 `portfolio-view` 와 같은 원본을 쓴다. 두 화면이
 * 같은 보유를 다르게 분류하면 안 된다.
 */

const UP = "#E8322E";
const DOWN = "#1668DC";

const STOCK_BY_CODE = new Map(STOCKS.map((stock) => [stock.symbol, stock]));
const SECTOR_LABEL = new Map(SECTORS.map((sector) => [sector.key, sector.label]));

export type SectorCard = {
  id: string;
  name: string;
  /** 섹터 이미지가 없으므로 라벨 첫 글자를 쓴다 — `portfolio-view.holdingCards` 와 같은 규칙이다. */
  emoji: string;
  countText: string;
  valueText: string;
  pctText: string;
  pctColor: string;
  positive: boolean;
};

export function sectorCards(
  holdings: Holding[],
  prices: Record<string, number>,
): SectorCard[] {
  const groups = new Map<string, { name: string; count: number; value: number; cost: number }>();

  for (const holding of holdings) {
    const stock = STOCK_BY_CODE.get(holding.code);
    // 유니버스에 없는 종목은 세지 않는다. 이름도 섹터도 댈 수 없어 어느 칸에도 못 넣는다.
    if (!stock) continue;
    const label = SECTOR_LABEL.get(stock.sector);
    if (!label) continue;
    const group = groups.get(stock.sector) ?? { name: label, count: 0, value: 0, cost: 0 };
    group.count += 1;
    group.value += holding.qty * (prices[holding.code] ?? 0);
    group.cost += holding.qty * holding.avg;
    groups.set(stock.sector, group);
  }

  return (
    [...groups.entries()]
      // 많이 담은 분야부터 보여 준다. 금액이 같으면 이름순이라 순서가 렌더마다 흔들리지 않는다.
      .sort(([, a], [, b]) => b.value - a.value || a.name.localeCompare(b.name, "ko-KR"))
      .map(([id, group]) => {
        // 원금이 0 이면 수익률도 0 이다 — 0 으로 나누지 않는다.
        const pct = group.cost > 0 ? ((group.value - group.cost) / group.cost) * 100 : 0;
        const positive = pct >= 0;
        return {
          id,
          name: group.name,
          emoji: group.name.charAt(0),
          countText: `${group.count}개 종목`,
          valueText: won(group.value),
          pctText: `${positive ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`,
          pctColor: positive ? UP : DOWN,
          positive,
        };
      })
  );
}
