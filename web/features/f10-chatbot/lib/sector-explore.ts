import { SECTORS, type SectorKey } from "../../../shared/data/sectors";
import { STOCKS } from "../../../shared/data/stocks";
import type {
  SectorExploreReply,
  SectorExploreTurn,
} from "../../../shared/types/chatbot";

function findSector(sectorId: string) {
  return SECTORS.find((sector) => sector.key === sectorId);
}

export function createSectorExploreTurn(sectorId: SectorKey): SectorExploreTurn {
  const sector = findSector(sectorId)!;
  return {
    sectorId,
    prompt: `우리 종목 유니버스에서 ${sector.label} 회사도 볼래요?`,
    choices: [
      { id: "yes", label: "응" },
      { id: "no", label: "아니" },
    ],
  };
}

export function resolveSectorExplore(reply: SectorExploreReply) {
  const sector = findSector(reply.sectorId);
  if (!sector) return null;
  if (reply.choiceId === "no") {
    return { text: "좋아요, 다른 섹터가 궁금하면 이름을 말해 주세요." };
  }
  const stocks = STOCKS.filter((stock) => stock.sector === sector.key);
  return {
    text: `${sector.label} 섹터에는 ${stocks.map((stock) => stock.name).join(", ")}이 있어요.`,
    uiAction: {
      type: "open_screen" as const,
      target: "stock" as const,
      sectorId: sector.key,
      label: `${sector.label} 회사 모아 보기`,
    },
  };
}
