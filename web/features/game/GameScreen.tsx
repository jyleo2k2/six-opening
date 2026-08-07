'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RULES } from 'game';
import { notoKr, rajdhani } from './fonts';
import { EndFlow } from './EndFlow';
import { CodexOverlay, InfoShop, NewsModal, TradeSheet } from './Overlays';
import { BottomBar, ChatScreen, EventScreen, FloatingEmotes, MarketScreen, RankScreen, TopBar } from './PlayScreens';
import { useGameRoom, type LobbyInfo } from './useGameRoom';

const KEYFRAMES = `
@keyframes ykPop{from{transform:translateY(16px) scale(.95);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
@keyframes ykSiren{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes ykFloat{from{transform:translateY(0) scale(1);opacity:1}to{transform:translateY(-240px) scale(1.4);opacity:0}}
@keyframes ykSpin{to{transform:rotate(360deg)}}
@keyframes ykPulse{0%,100%{box-shadow:0 0 16px rgba(77,200,255,.45)}50%{box-shadow:0 0 34px rgba(77,200,255,.85)}}
.yk input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(120,170,255,.25);outline:none}
.yk input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#4dc8ff;border:3px solid #0d1220;box-shadow:0 0 10px rgba(77,200,255,.8);cursor:pointer}
`;

/**
 * 대전 화면 — 서버가 viewFor()로 걸러 보낸 내 뷰만 그린다 (기획서 §9).
 * 판정 로직을 여기 쓰지 말 것 — game 패키지의 reduce()가 유일한 판정자다.
 */
export function GameScreen({ roomId, mode }: { roomId: string; mode?: 'quick' | 'regular' }) {
  const [nickname, setNickname] = useState('');
  useEffect(() => {
    setNickname(sessionStorage.getItem('kk-nickname')?.trim() || '키우미');
  }, []);

  const room = useGameRoom(roomId, nickname);
  const isCreator = roomId === 'new';

  // 방 생성 직후 주소를 초대코드로 (리마운트 없이)
  useEffect(() => {
    if (isCreator && room.realRoomId) {
      window.history.replaceState(null, '', `/game/${room.realRoomId}${mode === 'quick' ? '?mode=quick' : ''}`);
    }
  }, [isCreator, room.realRoomId, mode]);

  // ⚡ 퀵 매치 — 매칭 연출 후 자동 시작 (서버가 봇을 채운다)
  const quickStarted = useRef(false);
  useEffect(() => {
    if (mode !== 'quick' || !isCreator || !room.realRoomId || quickStarted.current) return;
    quickStarted.current = true;
    const timer = setTimeout(() => room.start('quick'), 4600);
    return () => clearTimeout(timer);
  }, [mode, isCreator, room.realRoomId, room.start, room]);

  // 출발 연출 — 게임 시작 직후 1회
  const [departDone, setDepartDone] = useState(false);

  // 준비 페이즈 자동 뉴스 모달
  const [newsShownTurn, setNewsShownTurn] = useState(0);
  const [overlay, setOverlay] = useState<'news' | 'shop' | 'codex' | null>(null);
  const [sheetSector, setSheetSector] = useState<string | null>(null);
  useEffect(() => {
    if (room.view?.phase === 'prep' && room.view.turn !== newsShownTurn) {
      setOverlay('news');
      setNewsShownTurn(room.view.turn);
    }
  }, [room.view?.phase, room.view?.turn, newsShownTurn, room.view]);

  // 페이즈 전환 시 오버레이·준비 상태 정리
  const [readySent, setReadySent] = useState(false);
  useEffect(() => {
    setReadySent(false);
    setSheetSector(null);
    if (room.view?.phase !== 'prep') setOverlay(null);
  }, [room.view?.phase, room.view?.turn]);

  // 순위 변동 화살표용 — 직전 순위 스냅샷
  const prevRanksRef = useRef<Record<string, number> | null>(null);
  const [rankDeltaBase, setRankDeltaBase] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    if (room.view?.phase === 'rank') {
      setRankDeltaBase(prevRanksRef.current);
      prevRanksRef.current = Object.fromEntries(room.view.standings.map((s) => [s.playerId, s.rank]));
    }
  }, [room.view?.phase, room.view?.turn, room.view]);

  // 거부 토스트
  useEffect(() => {
    if (!room.rejected) return;
    const timer = setTimeout(room.clearRejected, 2500);
    return () => clearTimeout(timer);
  }, [room.rejected, room.clearRejected]);

  const sendReady = () => {
    room.ready();
    setReadySent(true);
  };

  const view = room.view;
  const totalSeconds =
    view?.phase === 'prep'
      ? view.turn === 1
        ? RULES.prepFirstSeconds
        : RULES.prepSeconds
      : view?.phase === 'chat'
        ? RULES.chatSeconds
        : view?.phase === 'event'
          ? RULES.eventSeconds
          : RULES.rankSeconds;

  return (
    <div className={`yk ${rajdhani.variable} ${notoKr.variable}`} style={{ position: 'fixed', inset: 0, zIndex: 40, background: '#04060c', color: '#e8eaf0', fontFamily: 'var(--font-kr),sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div style={{ position: 'relative', margin: '0 auto', maxWidth: 430, height: '100%', background: '#070a14', overflow: 'hidden' }}>
        {room.error ? (
          <ErrorScreen message={room.error} />
        ) : !view ? (
          mode === 'quick' ? (
            <MatchScene nickname={nickname} />
          ) : room.lobby ? (
            <WaitingRoom lobby={room.lobby} sessionId={room.sessionId} roomCode={room.realRoomId} onAddBot={room.addBot} onStart={() => room.start('regular')} />
          ) : (
            <p style={{ padding: 24, fontSize: 13, color: '#8b93a7' }}>서버에 접속하는 중…</p>
          )
        ) : view.phase === 'ended' && room.settled ? (
          <EndFlow view={view} settled={room.settled} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#0a0e1e,#070a14 40%)' }}>
            <TopBar view={view} secondsLeft={room.secondsLeft} totalSeconds={totalSeconds} onReady={sendReady} readySent={readySent} />
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {(view.phase === 'prep') && (
                <MarketScreen view={view} onOpenNews={() => setOverlay('news')} onOpenShop={() => setOverlay('shop')} onOpenSector={(s) => setSheetSector(s)} />
              )}
              {view.phase === 'chat' && <ChatScreen view={view} room={room} chats={room.chats} />}
              {view.phase === 'event' && <EventScreen view={view} onReady={sendReady} readySent={readySent} />}
              {view.phase === 'rank' && <RankScreen view={view} prevRanks={rankDeltaBase} emotes={room.emotes} room={room} secondsLeft={room.secondsLeft} />}
              {view.phase !== 'rank' && <FloatingEmotes emotes={room.emotes} />}
            </div>
            <BottomBar view={view} />
          </div>
        )}

        {view && !departDone && <DepartScene onDone={() => setDepartDone(true)} />}
        {view && view.phase === 'prep' && overlay === 'news' && <NewsModal view={view} onClose={() => setOverlay(null)} />}
        {view && view.phase === 'prep' && overlay === 'shop' && <InfoShop view={view} room={room} onClose={() => setOverlay(null)} />}
        {view && view.phase === 'prep' && sheetSector && <TradeSheet view={view} room={room} sectorId={sheetSector} onClose={() => setSheetSector(null)} />}
        {overlay === 'codex' && <CodexOverlay onClose={() => setOverlay(null)} />}

        {room.rejected && (
          <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 96, zIndex: 70, whiteSpace: 'nowrap', background: 'rgba(13,18,32,.95)', border: '1px solid rgba(255,77,107,.4)', borderRadius: 999, padding: '8px 16px', fontSize: 12 }}>
            {room.rejected}
          </p>
        )}
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
      <p style={{ fontWeight: 900, fontSize: 16 }}>방에 들어갈 수 없어요</p>
      <p style={{ fontSize: 12, color: '#8b93a7' }}>{message}</p>
      <p style={{ fontSize: 11, color: '#5c6682' }}>게임 서버가 켜져 있는지 확인하세요: <code>npm run server</code></p>
      <Link href="/game" style={{ textAlign: 'center', fontWeight: 900, padding: '13px 0', background: 'linear-gradient(90deg,#37b6ff,#4dd6ff)', color: '#06101f', clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)' }}>
        로비로 돌아가기
      </Link>
    </div>
  );
}

/** S2 매칭 연출 — 퀵 매치: 봇 슬롯이 차오르고 자동 시작 */
function MatchScene({ nickname }: { nickname: string }) {
  const [filled, setFilled] = useState(1);
  const [tipIndex, setTipIndex] = useState(0);
  const TIPS = [
    '정보소의 싼 정보는 대개 틀립니다. 비싼 정보도 100%는 아니에요.',
    '안 사는 것도 전략입니다. 무행동 페널티는 없어요.',
    '내 뉴스는 일부만 진짜 전조 — 남의 말은 더 의심하세요.',
    '잃지 않는 것도 이기는 것. 든든이 상이 있습니다.',
  ];
  useEffect(() => {
    const timers = [1, 2, 3].map((i) => setTimeout(() => setFilled(i + 1), 700 + i * 1000));
    timers.push(setTimeout(() => setTipIndex((v) => v + 1), 3200));
    return () => timers.forEach(clearTimeout);
  }, []);

  const slots = [
    { name: nickname || '키우미', color: '#4dc8ff', ch: '나' },
    { name: '미르봇', color: '#a78bfa', ch: '미' },
    { name: '수리봇', color: '#ff8fab', ch: '수' },
    { name: '한별봇', color: '#6ee7b7', ch: '한' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%,#131b36,#05070f 75%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '70px 24px 40px' }}>
      <div style={{ fontSize: 9, letterSpacing: 4, color: '#4dc8ff', fontWeight: 700 }}>MATCHING</div>
      <div style={{ fontWeight: 900, fontSize: 21, marginTop: 6 }}>대전 상대를 찾는 중…</div>
      <div style={{ fontSize: 11, color: '#7d87a3', marginTop: 4 }}>안 모이면 AI 봇이 들어와요</div>
      <div style={{ position: 'relative', width: 120, height: 120, margin: '34px 0' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(77,200,255,.15)' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#4dc8ff', animation: 'ykSpin 1.1s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: "#0d1220 url('/game/action.png') center/cover" }} />
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {slots.map((slot, i) => (
          <div key={slot.name} style={{ textAlign: 'center', opacity: i < filled ? 1 : 0.3, transition: 'opacity .5s' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: i === 0 ? "#1a2138 url('/game/avatar.png') center/cover" : i < filled ? slot.color : '#141a2b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#0b1020', boxShadow: `0 0 0 1.5px ${slot.color}, 0 0 14px ${i < filled ? 'rgba(77,200,255,.35)' : 'transparent'}` }}>
              {i === 0 ? '' : i < filled ? slot.ch : '?'}
            </div>
            <div style={{ fontSize: 10, color: '#aeb8d2', marginTop: 5, fontWeight: 700 }}>{slot.name}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', width: '100%', background: 'rgba(13,18,32,.85)', border: '1px solid rgba(120,170,255,.18)', padding: 14, clipPath: 'polygon(12px 0,100% 0,100% 100%,0 100%,0 12px)' }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: '#ffd166', fontWeight: 700 }}>💡 상식 카드</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 6, color: '#d5dcee' }}>{TIPS[tipIndex % TIPS.length]}</div>
      </div>
    </div>
  );
}

/** S2 출발 연출 — 타임머신: 2026 → 과거로 */
function DepartScene({ onDone }: { onDone: () => void }) {
  const [year, setYear] = useState('2026');
  useEffect(() => {
    const years = ['2025', '2023', '2019', '2016', '2013', '2011', '????'];
    const timers = years.map((y, i) => setTimeout(() => setYear(y), 320 + i * 340));
    timers.push(setTimeout(onDone, 320 + years.length * 340 + 700));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 65, background: '#020308', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 170, height: 170, borderRadius: '50%', border: '1px solid rgba(77,200,255,.25)', position: 'absolute', animation: 'ykSpin 6s linear infinite', borderTopColor: '#4dc8ff' }} />
      <div style={{ width: 210, height: 210, borderRadius: '50%', border: '1px dashed rgba(77,200,255,.15)', position: 'absolute', animation: 'ykSpin 11s linear infinite reverse' }} />
      <div style={{ fontSize: 9, letterSpacing: 5, color: '#4dc8ff', fontWeight: 700 }}>TIME MACHINE</div>
      <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 88, letterSpacing: 6, color: '#eaf4ff', textShadow: '0 0 30px rgba(77,200,255,.8)' }}>{year}</div>
      <div style={{ fontSize: 12, color: '#7d87a3', textAlign: 'center', lineHeight: 1.7 }}>2011년부터 2020년 사이,<br />실제로 있었던 일들이 벌어집니다</div>
    </div>
  );
}

/** 친구방 대기실 — 초대코드 + 봇 추가 + 정규전 시작 */
function WaitingRoom({ lobby, sessionId, roomCode, onAddBot, onStart }: { lobby: LobbyInfo; sessionId: string; roomCode: string; onAddBot: () => void; onStart: () => void }) {
  const isHost = lobby.hostId === sessionId;
  const seatsLeft = lobby.max - lobby.players.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '32px 18px' }}>
      <div>
        <span style={{ fontSize: 9, letterSpacing: 4, color: '#4dc8ff', fontWeight: 700 }}>FRIEND ROOM</span>
        <h1 style={{ fontWeight: 900, fontSize: 22, margin: '4px 0 0' }}>대기실</h1>
        <p style={{ fontSize: 12, color: '#8b93a7', marginTop: 4 }}>친구에게 초대코드를 알려주세요. {lobby.min}~{lobby.max}명 · 정규전 5라운드</p>
      </div>
      <button type="button" onClick={() => navigator.clipboard?.writeText(roomCode)} style={{ background: 'rgba(13,18,32,.85)', border: '1px dashed rgba(120,170,255,.35)', padding: '14px 0', color: '#fff', cursor: 'pointer' }}>
        <span style={{ display: 'block', fontSize: 10, color: '#8b93a7' }}>초대코드 (누르면 복사)</span>
        <span style={{ display: 'block', fontFamily: 'var(--font-num)', fontSize: 19, fontWeight: 700, letterSpacing: 4 }}>{roomCode}</span>
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lobby.players.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(13,18,32,.8)', border: '1px solid rgba(120,170,255,.14)', padding: '11px 14px' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>
              {p.nickname ?? `주주${i + 1}`}
              {p.id === sessionId && <span style={{ marginLeft: 6, fontSize: 10, color: '#5c6682' }}>(나)</span>}
            </span>
            <span style={{ fontSize: 10, color: p.isBot ? '#8b93a7' : '#ffd166' }}>{p.isBot ? '🤖 봇' : p.id === lobby.hostId ? '방장' : ''}</span>
          </div>
        ))}
      </div>
      {isHost ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          <button type="button" onClick={onAddBot} disabled={seatsLeft <= 0} style={{ padding: '12px 0', fontWeight: 900, fontSize: 13, background: 'rgba(13,18,32,.8)', border: '1px solid rgba(120,170,255,.25)', color: seatsLeft > 0 ? '#c9d2e8' : '#3a4152', cursor: 'pointer' }}>
            🤖 봇 추가 {seatsLeft > 0 ? `(${seatsLeft}자리)` : '(가득 참)'}
          </button>
          <button type="button" onClick={onStart} disabled={lobby.players.length < lobby.min} style={{ padding: '14px 0', fontWeight: 900, fontSize: 15, border: 'none', cursor: 'pointer', background: lobby.players.length >= lobby.min ? 'linear-gradient(90deg,#37b6ff,#4dd6ff)' : 'rgba(255,255,255,.06)', color: lobby.players.length >= lobby.min ? '#06101f' : '#5c6682', clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' }}>
            {lobby.players.length < lobby.min ? `${lobby.min}명부터 — 봇을 넣어도 돼요` : '게임 시작'}
          </button>
        </div>
      ) : (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#8b93a7' }}>방장이 시작하길 기다리는 중…</p>
      )}
      <Link href="/game" style={{ textAlign: 'center', fontSize: 11, color: '#5c6682' }}>← 로비로</Link>
    </div>
  );
}
