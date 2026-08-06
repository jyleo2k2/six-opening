import type { GameEvent, GameState } from '@engine/types.ts';
import { manwon, signedManwon } from './format.ts';

export type FeedbackTone = 'good' | 'bad' | 'mitigated' | 'neutral' | 'combo' | 'warning';

export interface FeedbackLine {
  tone: FeedbackTone;
  text: string;
}

/** 이벤트 하나가 어느 플레이어의 행동으로 발생했는지 태그. null = 정산(marketPhase) 자동 발생. */
export interface TaggedEvent {
  event: GameEvent;
  actingPlayer: 0 | 1 | null;
}

function who(player: 0 | 1, viewer: 0 | 1): string {
  return player === viewer ? '내' : 'AI';
}

function stockName(game: GameState, stockId: string): string {
  return game.stocks.find((s) => s.id === stockId)?.name ?? stockId;
}

function signed(n: number): string {
  return signedManwon(n);
}

/**
 * 엔진의 GameEvent 로그(숫자·식별자만)를 한 줄 한국어 피드백으로 옮긴다.
 * 문구는 전부 이벤트 필드값에서 그대로 도출한다 — 근사치·추정 없음.
 */
export function describeEvents(tagged: TaggedEvent[], game: GameState, viewer: 0 | 1 = 0): FeedbackLine[] {
  const lines: FeedbackLine[] = [];

  for (const { event: e, actingPlayer } of tagged) {
    switch (e.type) {
      case 'stopLossTriggered': {
        const w = who(e.player, viewer);
        lines.push({
          tone: e.player === viewer ? 'good' : 'neutral',
          text: `${w} 손절 예약 발동 — ${stockName(game, e.stockId)} ${manwon(e.savedAmount)} 지켰다`,
        });
        break;
      }
      case 'sectorHit': {
        const sectorPctText = `${e.sector} ${e.pct >= 0 ? '+' : ''}${(e.pct * 100).toFixed(0)}%`;
        for (const impact of e.impacts) {
          const w = who(impact.player, viewer);
          const exposurePct = Math.round(impact.exposureRatio * 100);
          // 관전자(viewer) 관점 톤: 내가 손해면 나쁨, 상대가 손해면 좋음.
          const favorsViewer = impact.player === viewer ? impact.pnlAmount >= 0 : impact.pnlAmount <= 0;
          const selfInflicted =
            viewer === impact.player &&
            actingPlayer === viewer &&
            e.source.kind === 'card' &&
            e.pct < 0;
          if (impact.exposureRatio === 0 && impact.pnlAmount === 0) {
            // AI가 무피해인 경우는 조용히 넘긴다 — 나(viewer)에게만 무피해를 알려준다.
            if (impact.player === viewer && e.pct < 0) {
              lines.push({ tone: 'neutral', text: `${e.sector} ${e.pct >= 0 ? '+' : ''}${(e.pct * 100).toFixed(0)}% — ${w} 무피해 (그 섹터 없음)` });
            }
            continue;
          }
          if (selfInflicted) {
            lines.push({
              tone: 'bad',
              text: `앗, 내가 낸 카드에 나도 맞았다 — ${sectorPctText} (${manwon(impact.pnlAmount)}, 노출 ${exposurePct}%)`,
            });
          } else if (e.pct < 0 && impact.exposureRatio >= 1) {
            lines.push({
              tone: favorsViewer ? 'good' : 'bad',
              text: `${sectorPctText} — ${w} 그대로 직격 (${manwon(impact.pnlAmount)}, 노출 ${exposurePct}%)`,
            });
          } else if (e.pct < 0 && impact.exposureRatio > 0) {
            // 손실은 났지만 분산 덕분에 완전 노출보다 덜 맞은 상태 — bad도 good도 아닌 별도 톤.
            const tone: FeedbackTone = impact.player === viewer ? 'mitigated' : favorsViewer ? 'good' : 'bad';
            lines.push({
              tone,
              text: `${sectorPctText} — 분산 덕분에 ${w} ${manwon(impact.pnlAmount)} (노출 ${exposurePct}%)`,
            });
          } else if (e.pct > 0 && impact.exposureRatio > 0) {
            lines.push({
              tone: favorsViewer ? 'good' : 'bad',
              text: `${sectorPctText} — ${w} 보유 종목 호재 ${manwon(impact.pnlAmount)}`,
            });
          }
        }
        break;
      }
      case 'shortClosed': {
        const w = who(e.player, viewer);
        const favorsViewer = e.player === viewer ? e.pnl >= 0 : e.pnl <= 0;
        if (e.pnl > 0 && e.player === viewer) {
          lines.push({ tone: 'combo', text: `${w} 콤보! 공매도 청산 ${manwon(e.pnl)}` });
        } else if (e.pnl !== 0) {
          lines.push({
            tone: favorsViewer ? 'good' : 'bad',
            text: `${w} 공매도 청산 ${signed(e.pnl)}`,
          });
        }
        break;
      }
      case 'insiderCaught': {
        const w = who(e.player, viewer);
        lines.push({
          tone: e.player === viewer ? 'warning' : 'good',
          text: `${w} 금감원 조사 적발! ${manwon(e.fineAmount)} 몰수`,
        });
        break;
      }
      case 'forcedSale': {
        const w = who(e.player, viewer);
        lines.push({
          tone: e.player === viewer ? 'bad' : 'neutral',
          text: `${w} 생활비 부족 — ${stockName(game, e.stockId)} ${e.shares.toFixed(1)}주 강제 매도 (${manwon(e.proceeds)})`,
        });
        break;
      }
      case 'worldEventTriggered':
      case 'gameOver':
        // 헤드라인은 정산 리포트에서 별도로 보여주고, 게임오버는 결과 화면이 전담한다.
        break;
    }
  }

  return lines;
}
