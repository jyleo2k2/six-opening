"use client";

import { useState } from "react";
import type { ReasonRecord, TradeSide } from "@/shared/types";
import { Button, Chip, ConfidenceSelector } from "@/shared/ui";

const buyReasons = [
  "뉴스에서 봤어",
  "차트가 좋아 보여",
  "친구·가족이 추천했어",
  "이 회사(제품)를 잘 알아",
  "그냥 느낌이 좋아",
];

const sellReasons = [
  "목표한 만큼 올랐어",
  "더 떨어질까 봐 걱정돼",
  "다른 종목이 더 좋아 보여",
  "그냥 불안해",
  "기타",
];

export function ReasonForm({ side, onSubmit }: { side: TradeSide; onSubmit: (record: ReasonRecord) => void }) {
  const [reason, setReason] = useState("");
  const [confidence, setConfidence] = useState<25 | 50 | 75 | 100>();
  const [memo, setMemo] = useState("");
  const isBuy = side === "buy";
  const valid = Boolean(reason) && (!isBuy || confidence !== undefined);

  return (
    <form className="flex flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); if (valid) onSubmit({ side, reason, confidence: isBuy ? confidence : undefined, memo }); }}>
      <section className="space-y-6 px-4 py-6">
        <div>
          <h2 className="text-xl font-extrabold">왜 {isBuy ? "사고" : "팔려고"} 해?</h2>
          <p className="mt-2 text-sm text-ink opacity-60">이유를 남겨두면 다음에 키웅이와 같이 돌아볼 수 있어</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(isBuy ? buyReasons : sellReasons).map((item) => <Chip key={item} type="button" selected={reason === item} onClick={() => setReason(item)}>{item}</Chip>)}
        </div>
        {isBuy && <ConfidenceSelector value={confidence} onChange={setConfidence} />}
        <label className="block text-xs font-bold text-ink">내 생각 한 줄 (선택)
          <input value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-gray bg-white px-4 text-sm font-normal outline-none focus:border-magenta" placeholder={isBuy ? "어떤 점을 눈여겨봤는지 적어볼까?" : "왜 정리하는지 적어볼까?"} />
        </label>
      </section>
      <div className="mt-auto p-4"><Button type="submit" disabled={!valid}>{isBuy ? "매수하기" : "매도하기"}</Button></div>
    </form>
  );
}
