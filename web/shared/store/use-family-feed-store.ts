"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { gateComment } from "../engine/comment-filter";
import { FAMILY_SEED_TRADES } from "./family-trade-seed";
import type { FamilyMember, Trade, TradeComment } from "../types/trade";

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

// 시드는 상수라 `family-trade-seed` 가 소유한다. 차트도 같은 값을 읽어야 하는데
// 그 모듈만 import 하면 이 스토어가 차트 iframe 에서 또 생성되지 않는다.

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
      familyTrades: FAMILY_SEED_TRADES,
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
