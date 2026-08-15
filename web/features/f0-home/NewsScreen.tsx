"use client";

import { useEffect, useState } from "react";
import { formatNewsDate, validNewsItem, type NewsItem } from "./lib/stock-news";
import {
  BuyCtaFooter,
  SUB_PAGE,
  SUB_SCROLL,
  SubScreenHeader,
} from "./lib/stock-chrome";
import { styleFromCss } from "./lib/css-style";

const HERO = styleFromCss(
  "background:#FDEFF5;border-radius:28px;padding:18px 20px;box-shadow:0 2px 10px rgba(90,25,70,0.06)",
);
const KICKER = styleFromCss("font-size:13px;font-weight:700;color:#D5327A");
const HEADLINE = styleFromCss(
  "font-size:21px;font-weight:800;color:#01185A;line-height:1.45;margin-top:9px;letter-spacing:-0.02em;text-wrap:pretty",
);
const SUMMARY_CARD = styleFromCss(
  "background:#FFFFFF;border-radius:26px;padding:17px 19px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);
const LINE_NUM = styleFromCss(
  "width:22px;height:22px;flex:none;border-radius:999px;display:flex;align-items:center;justify-content:center;" +
    "font-size:13px;font-weight:700;color:#fff;background:#F5327F;box-shadow:0 4px 8px -2px rgba(214,54,124,0.4)",
);
const LINE_TEXT = styleFromCss(
  "flex:1;font-size:14px;font-weight:500;color:#5C6280;line-height:1.6;padding-top:2px",
);
const SOURCE_ROW = styleFromCss(
  "display:flex;align-items:center;justify-content:space-between;gap:12px;background:#FFFFFF;border-radius:22px;padding:14px 16px;" +
    "box-shadow:0 10px 24px rgba(35,25,80,0.08),inset 0 0 0 1px rgba(255,255,255,0.7)",
);
const NOTICE = styleFromCss(
  "display:flex;align-items:flex-start;gap:10px;background:#ECEDF7;border-radius:22px;padding:14px 16px;box-shadow:inset 0 0 0 1px #E4E6F1",
);

/**
 * 뉴스 상세 화면. `ui-src/screens/news.html` 을 그대로 옮겨 왔다.
 *
 * 목록에서 받은 항목을 먼저 그리고, `/api/news/{newsId}` 로 최신본을 다시 받아
 * **같은 뉴스일 때만** 갈아끼운다 — `app.html` 의 `openNewsItem` 과 같은 판정이다.
 */
export function NewsScreen({
  code,
  stockName,
  item,
  locked,
  onBack,
  onStartBuy,
}: {
  code: string;
  stockName: string;
  item: NewsItem;
  locked: boolean;
  onBack: () => void;
  onStartBuy: () => void;
}) {
  const [news, setNews] = useState<NewsItem>(item);

  useEffect(() => {
    let alive = true;
    setNews(item);
    fetch(`/api/news/${encodeURIComponent(String(item.newsId))}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("news detail lookup failed");
        return r.json();
      })
      .then((data: { item?: unknown } | null) => {
        const fresh = data?.item;
        if (!alive || !validNewsItem(fresh, code)) return;
        if (fresh.newsId !== item.newsId || fresh.articleId !== item.articleId) return;
        setNews(fresh);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [item, code]);

  const openSource = () => {
    if (!validNewsItem(news, code)) return;
    // app.html 은 iframe 안에서 원문으로 이동했지만, 여기서 그대로 이동하면 앱이
    // 통째로 떠난다. 새 탭으로 연다.
    window.open(news.sourceUrl, "_blank", "noopener");
  };

  return (
    <div style={SUB_PAGE}>
      <SubScreenHeader onBack={onBack} title="요즘 무슨 일이" />
      <div style={SUB_SCROLL}>
        <div style={HERO}>
          <div style={KICKER}>{stockName ? `${stockName} 이야기` : "기업 이야기"}</div>
          <div style={HEADLINE}>{news.headline}</div>
        </div>

        <div style={SUMMARY_CARD}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: "#01185A" }}>3줄 요약</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 13 }}>
            {news.summaryLines.map((line, index) => (
              <div key={index} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={LINE_NUM}>{index + 1}</div>
                <div style={LINE_TEXT}>{line}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={SOURCE_ROW}>
          <div style={styleFromCss("min-width:0;font-size:13px;font-weight:500;color:#8E93A8;line-height:1.5")}>
            {news.publisher} · {formatNewsDate(news.sourcePublishedAt)}
          </div>
          <div
            onClick={openSource}
            style={styleFromCss(
              "flex:none;font-size:13.5px;font-weight:800;color:#D5327A;cursor:pointer;padding:8px 2px 8px 10px;white-space:nowrap",
            )}
          >
            원문 보기 ↗
          </div>
        </div>

        <div style={NOTICE}>
          <div
            style={styleFromCss(
              "flex:1;font-size:13.5px;font-weight:500;color:#5C6280;line-height:1.65;text-wrap:pretty",
            )}
          >
            이건 이 회사가 좋다 나쁘다는 이야기가 아니야. 무슨 일이 있었는지만 알려주는 거야.
          </div>
        </div>
      </div>
      <BuyCtaFooter locked={locked} onStartBuy={onStartBuy} />
    </div>
  );
}
