"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { gateComment } from "@/shared/engine/comment-filter";
import type { FamilyMember, Trade, TradeComment } from "@/shared/types";

/**
 * 가족 거래 피드 상태. 통합문서 v2.7 §11.4
 *
 * 부모와 자녀가 서로의 거래 기록을 보고 코멘트로 대화한다. 상호 열람이 원칙이며
 * 단방향이면 감시가 되고, 감시로 인식되는 순간 아이의 근거 태깅이 방어적으로 바뀐다.
 */

export const MEMBER_LABEL: Record<FamilyMember, string> = {
  child: "민지",
  parent: "엄마",
};

type Store = {
  /** 현재 보고 있는 계정. 데모의 민지↔엄마 스위처가 바꾼다. */
  viewer: FamilyMember;
  /** 본인 외 구성원의 거래. 본인 거래는 투자 스토어가 소유한다. */
  familyTrades: Trade[];
  comments: TradeComment[];
  setViewer: (viewer: FamilyMember) => void;
  addComment: (
    trade: Trade,
    body: string,
  ) => { ok: true } | { ok: false; message: string };
};

/** 데모 시드 — 엄마의 2주치 거래. 자녀 계정에서 피드가 비어 보이지 않게 한다. */
const seedParentTrades: Trade[] = [
  {
    id: "seed-parent-1",
    member: "parent",
    symbol: "005930",
    side: "buy",
    quantity: 2,
    price: 70800,
    reason: "이 회사(제품)를 잘 알아",
    confidence: 75,
    memo: "갤럭시를 오래 써서 사업을 이해하기 쉬웠어.",
    tradedAt: "2026-08-04T01:12:00.000Z",
  },
  {
    id: "seed-parent-2",
    member: "parent",
    symbol: "003230",
    side: "buy",
    quantity: 5,
    price: 62400,
    reason: "뉴스에서 봤어",
    confidence: 50,
    memo: "해외 매출 기사를 봤는데 확신까지는 아니었어.",
    tradedAt: "2026-08-06T04:35:00.000Z",
  },
  {
    id: "seed-parent-3",
    member: "parent",
    symbol: "005930",
    side: "sell",
    quantity: 1,
    price: 73900,
    reason: "목표한 만큼 올랐어",
    memo: "처음 생각한 만큼 와서 절반만 정리했어.",
    tradedAt: "2026-08-08T05:02:00.000Z",
  },
];

const seedComments: TradeComment[] = [
  {
    id: "seed-comment-1",
    tradeId: "seed-parent-2",
    author: "child",
    body: "엄마는 왜 확신이 50이야? 뉴스 봤으면 더 확신 있는 거 아니야?",
    createdAt: "2026-08-06T09:20:00.000Z",
  },
  {
    id: "seed-comment-2",
    tradeId: "seed-parent-2",
    author: "parent",
    body: "기사 하나만 보고 정한 거라서 그래. 민지는 어떤 걸 보고 정했어?",
    createdAt: "2026-08-06T11:41:00.000Z",
  },
];

export const useFamilyFeedStore = create<Store>()(
  persist(
    (set, get) => ({
      viewer: "child",
      familyTrades: seedParentTrades,
      comments: seedComments,
      setViewer: (viewer) => set({ viewer }),
      addComment: (trade, body) => {
        const author = get().viewer;
        const gate = gateComment({ body, author, target: trade.member });
        if (!gate.ok) return { ok: false, message: gate.message };

        set((state) => ({
          comments: [
            ...state.comments,
            {
              id: crypto.randomUUID(),
              tradeId: trade.id,
              author,
              body: gate.body,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return { ok: true };
      },
    }),
    {
      name: "kiwoom-family-feed",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
