import { RULES } from 'game';
import { Placeholder } from '@/components/ui/Placeholder';

export default function DeckPage() {
  return (
    <Placeholder
      title="덱 편집"
      owner="게임 트랙 (이재용·이호연)"
      todo={[
        `덱 ${RULES.DECK_SIZE}장 · 동일 종류 최대 ${RULES.MAX_COPIES}장 (기획서 §5)`,
        `종목카드 최소 ${RULES.MIN_STOCK_IN_DECK}장 — Q3 확정 시 변경`,
        'validateDeck()으로 검증 후 저장 (game/src/deck.ts)',
        '지금은 game/data/decks.ts의 STARTER_DECK을 양쪽이 공유한다',
      ]}
    />
  );
}
