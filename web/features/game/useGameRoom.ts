'use client';

import { Client, type Room } from '@colyseus/sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Emote, GameView, Phase } from 'game';

/**
 * Colyseus 룸 접속 훅 — 서버가 viewFor()로 걸러 보낸 내 뷰만 받는다.
 * 판정·가격 계산을 여기서 재구현하지 않는다 (web/AGENTS.md).
 */
const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'ws://localhost:2567';
const ROOM_NAME = 'kids-kiwoom';

export interface LobbyInfo {
  hostId: string;
  min: number;
  max: number;
  players: { id: string; nickname?: string; isBot?: boolean }[];
}

export interface PhaseInfo {
  phase: Phase;
  turn: number;
  seconds: number | null;
}

export interface FeedLine {
  id: number;
  playerId: string;
  nickname?: string;
  /** 채팅 본문. 이모티콘이면 undefined */
  text?: string;
  emote?: Emote;
}

export function useGameRoom(roomId: string, nickname: string) {
  const roomRef = useRef<Room | null>(null);
  const feedSeq = useRef(0);

  const [sessionId, setSessionId] = useState('');
  const [realRoomId, setRealRoomId] = useState('');
  const [lobby, setLobby] = useState<LobbyInfo | null>(null);
  const [view, setView] = useState<GameView | null>(null);
  const [phase, setPhase] = useState<PhaseInfo | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nickname) return;
    let disposed = false;
    const client = new Client(SERVER_URL);
    const joining =
      roomId === 'new'
        ? client.create(ROOM_NAME, { nickname })
        : client.joinById(roomId, { nickname });

    joining
      .then((room) => {
        if (disposed) {
          room.leave();
          return;
        }
        roomRef.current = room;
        setSessionId(room.sessionId);
        setRealRoomId(room.roomId);

        room.onMessage('lobby', (payload: LobbyInfo) => setLobby(payload));
        room.onMessage('state', (payload: GameView) => setView(payload));
        room.onMessage('phase', (payload: PhaseInfo) => {
          setPhase(payload);
          setSecondsLeft(payload.seconds);
        });
        room.onMessage('chat', (msg: { playerId: string; nickname?: string; text: string }) => {
          setFeed((prev) => [...prev.slice(-99), { id: feedSeq.current++, ...msg }]);
        });
        room.onMessage('emote', (msg: { playerId: string; kind: Emote }) => {
          setFeed((prev) => [
            ...prev.slice(-99),
            { id: feedSeq.current++, playerId: msg.playerId, emote: msg.kind },
          ]);
        });
        room.onMessage('rejected', (msg: { reason: string }) => setRejected(msg.reason));
        room.onMessage('settled', () => {}); // 최종 상태는 state(phase: ended)로도 온다
        room.onMessage('player-left', (msg: { playerId: string }) => {
          setFeed((prev) => [
            ...prev.slice(-99),
            { id: feedSeq.current++, playerId: msg.playerId, text: '(연결이 끊겼어요)' },
          ]);
        });
        room.onError((code, message) => setError(message ?? `연결 오류 (${code})`));
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : '방에 들어갈 수 없어요');
      });

    return () => {
      disposed = true;
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, [roomId, nickname]);

  // 남은 시간 카운트다운 — 권위는 서버 타이머, 표시만 한다
  useEffect(() => {
    if (secondsLeft === null) return;
    const timer = setInterval(
      () => setSecondsLeft((s) => (s === null || s <= 0 ? s : s - 1)),
      1000,
    );
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const send = useCallback((type: string, payload?: unknown) => {
    roomRef.current?.send(type, payload);
  }, []);

  return {
    sessionId,
    realRoomId,
    lobby,
    view,
    phase,
    secondsLeft,
    feed,
    rejected,
    error,
    clearRejected: useCallback(() => setRejected(null), []),
    start: useCallback(() => send('start'), [send]),
    addBot: useCallback(() => send('addBot'), [send]),
    ready: useCallback(() => send('ready'), [send]),
    chat: useCallback((text: string) => send('chat', { text }), [send]),
    emote: useCallback((kind: Emote) => send('emote', { kind }), [send]),
    buy: useCallback(
      (companyId: string, qty: number) =>
        send('action', { type: 'buy', playerId: roomRef.current?.sessionId, companyId, qty }),
      [send],
    ),
    sell: useCallback(
      (companyId: string, qty: number) =>
        send('action', { type: 'sell', playerId: roomRef.current?.sessionId, companyId, qty }),
      [send],
    ),
    buyInfo: useCallback(
      (tier: 1 | 2 | 3) =>
        send('action', { type: 'buyInfo', playerId: roomRef.current?.sessionId, tier }),
      [send],
    ),
  };
}
