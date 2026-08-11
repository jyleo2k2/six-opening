import { StockDetailScreen } from "./StockDetailScreen";

export async function TradePage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <StockDetailScreen symbol={symbol} />;
}
