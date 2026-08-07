'use client';

import { Client, type Room } from '@colyseus/sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Awards, ChatVerb, Emote, GameView, InfoTab, Phase, Sector, Standing } from 'game';

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

export interface ChatLine {
  id: number;
  playerId: string;
  nickname: string;
  color: string;
  ch: string;
  text: string;
}

export interface EmoteEvent {
  id: number;
  playerId: string;
  kind: Emote;
}

export interface Settled {
  standings: Standing[];
  awards: Awards;
}

export function useGameRoom(roomId: string, nickname: string) {
  const roomRef = useRef<Room | null>(null);
  const seq = useRef(0);

  const [sessionId, setSessionId] = useState('');
  const [realRoomId, setRealRoomId] = useState('');
  const [lobby, setLobby] = useState<LobbyInfo | null>(null);
  const [view, setView] = useState<GameView | null>(null);
  const [phase, setPhase] = useState<PhaseInfo | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [chats, setChats] = useState<ChatLine[]>([]);
  const [emotes, setEmotes] = useState<EmoteEvent[]>([]);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nickname) return;
    // 방이 바뀌면(한 판 더 등) 이전 판 상태를 비운다
    setView(null);
    setLobby(null);
    setSettled(null);
    setPhase(null);
    setSecondsLeft(null);
    setChats([]);
    setEmotes([]);
    setError(null);

    let disposed = false;
    const client = new Client(SERVER_URL);
    const joining =
      roomId === 'new' ? client.create(ROOM_NAME, { nickname }) : client.joinById(roomId, { nickname });

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
        room.onMessage('chat', (msg: Omit<ChatLine, 'id'>) => {
          setChats((prev) => [...prev.slice(-99), { id: seq.current++, ...msg }]);
        });
        room.onMessage('emote', (msg: { playerId: string; kind: Emote }) => {
          setEmotes((prev) => [...prev.slice(-19), { id: seq.current++, ...msg }]);
        });
        room.onMessage('settled', (payload: Settled) => setSettled(payload));
        room.onMessage('rejected', (msg: { reason: string }) => setRejected(msg.reason));
        room.onMessage('player-left', () => {});
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

  // 남은 시간 카운트다운 — 권위는 서버, 표시만
  useEffect(() => {
    if (secondsLeft === null) return;
    const timer = setInterval(() => setSecondsLeft((s) => (s === null || s <= 0 ? s : s - 1)), 1000);
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
    chats,
    emotes,
    settled,
    rejected,
    error,
    clearRejected: useCallback(() => setRejected(null), []),
    start: useCallback((mode: 'quick' | 'regular') => send('start', { mode }), [send]),
    addBot: useCallback(() => send('addBot'), [send]),
    ready: useCallback(() => send('ready'), [send]),
    chat: useCallback(
      (subject: string, sector: Sector, verb: ChatVerb) => send('chat', { subject, sector, verb }),
      [send],
    ),
    shareNews: useCallback(() => send('shareNews'), [send]),
    emote: useCallback((kind: Emote) => send('emote', { kind }), [send]),
    buy: useCallback(
      (companyId: string, amount: number) =>
        send('action', { type: 'buy', playerId: roomRef.current?.sessionId, companyId, amount }),
      [send],
    ),
    sell: useCallback(
      (companyId: string, amount: number) =>
        send('action', { type: 'sell', playerId: roomRef.current?.sessionId, companyId, amount }),
      [send],
    ),
    buyInfo: useCallback(
      (tab: InfoTab, tier: 1 | 2 | 3) =>
        send('action', { type: 'buyInfo', playerId: roomRef.current?.sessionId, tab, tier }),
      [send],
    ),
  };
}

export type GameRoomApi = ReturnType<typeof useGameRoom>;
