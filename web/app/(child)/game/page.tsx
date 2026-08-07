'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RULES } from 'game';
import { CodexOverlay } from '@/features/game/Overlays';
import { notoKr, rajdhani } from '@/features/game/fonts';

/**
 * 영웅키움 로비 (컴프 S1) — ⚡퀵 매치(봇 자동) · 정규전 · 친구방(초대코드).
 * 레벨·재화·미션 등 메타는 시연용 정적 장식 (기획서 §10), 도감은 실데이터.
 */
const clip = (px: number) => ({ clipPath: `polygon(${px}px 0,100% 0,100% 100%,0 100%,0 ${px}px)` });
const banner = { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, padding: '8px 12px 8px 10px', clipPath: 'polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)' } as const;

export default function GameLobbyPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('키우미');
  const [code, setCode] = useState('');
  const [codexOpen, setCodexOpen] = useState(false);
  const [heroOk, setHeroOk] = useState(true);
  const [countdown, setCountdown] = useState(89_672);

  useEffect(() => {
    setNickname(sessionStorage.getItem('kk-nickname')?.trim() || '키우미');
    const timer = setInterval(() => setCountdown((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const go = (path: string) => {
    sessionStorage.setItem('kk-nickname', nickname.trim() || '키우미');
    router.push(path);
  };
  const editName = () => {
    const next = window.prompt('닉네임 (10자까지)', nickname);
    if (next?.trim()) {
      const v = next.trim().slice(0, 10);
      setNickname(v);
      sessionStorage.setItem('kk-nickname', v);
    }
  };
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className={`${rajdhani.variable} ${notoKr.variable}`} style={{ position: 'relative', minHeight: 640, height: 'calc(100vh - 140px)', overflow: 'hidden', background: '#070a14', color: '#e8eaf0', fontFamily: 'var(--font-kr),sans-serif' }}>
      {/* 배경 — 성운 그라디언트 + 하단 딥 */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#232a55 0%,#3a2a5e 34%,#1a1f3a 62%,#0a0d1c 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 30%,rgba(255,140,200,.16) 0 24px,transparent 60px),radial-gradient(circle at 78% 22%,rgba(120,200,255,.14) 0 18px,transparent 50px),radial-gradient(circle at 60% 38%,rgba(255,210,120,.1) 0 14px,transparent 40px)', filter: 'blur(6px)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: 'linear-gradient(0deg,#05070f 20%,transparent)', opacity: 0.9 }} />
      {heroOk && (
        <>
          <div style={{ position: 'absolute', left: 8, bottom: 120, width: 220, height: 380, background: 'radial-gradient(ellipse at 50% 55%,rgba(77,200,255,.28),transparent 68%)', filter: 'blur(8px)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/game/hero.png" alt="키우미" onError={() => setHeroOk(false)} style={{ position: 'absolute', left: 2, bottom: 112, height: 420, filter: 'drop-shadow(0 0 22px rgba(77,200,255,.35))' }} />
        </>
      )}

      {/* 프로필 (닉네임 = 탭해서 변경) */}
      <button type="button" onClick={editName} style={{ position: 'absolute', top: 12, left: 10, display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: '#e8eaf0', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ width: 44, height: 44, borderRadius: 8, background: "#1a2138 url('/game/avatar.png') center/cover", boxShadow: '0 0 0 1.5px #4dc8ff,0 0 12px rgba(77,200,255,.5)' }} />
        <span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 900, fontSize: 14 }}>{nickname}</span>
            <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 11, color: '#0b1020', background: '#4dc8ff', padding: '0 6px', borderRadius: 3 }}>LV.1</span>
          </span>
          <span style={{ display: 'block', fontSize: 9, color: '#7d87a3', letterSpacing: 0.4 }}>탭해서 닉네임 변경</span>
        </span>
      </button>

      {/* 재화 pills — 시연 정적 */}
      <div style={{ position: 'absolute', top: 64, left: 10, right: 10, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {[['💠', '12,480'], ['📖', '8/56'], ['🏅', '1']].map(([e, v]) => (
          <span key={e} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(10,14,26,.8)', border: '1px solid rgba(120,170,255,.18)', borderRadius: 20, padding: '3px 9px' }}>
            <span style={{ fontSize: 11 }}>{e}</span>
            <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 13 }}>{v}</span>
          </span>
        ))}
      </div>

      {/* 좌측 배너 — 정적 장식 */}
      <div style={{ position: 'absolute', top: 112, left: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ ...banner, background: 'linear-gradient(90deg,#2b8fe0,#4dc8ff)', color: '#07101f', fontWeight: 900 }}>🎪 이벤트</div>
        <div style={{ ...banner, background: 'rgba(13,18,32,.78)', border: '1px solid rgba(120,170,255,.16)', color: '#aeb8d2' }}>📅 캘린더</div>
        <div style={{ ...banner, background: 'rgba(13,18,32,.78)', border: '1px solid rgba(120,170,255,.16)', color: '#aeb8d2' }}>🗓 출석</div>
      </div>

      {/* 우측 카드 스택 */}
      <div style={{ position: 'absolute', top: 112, right: 10, width: 162, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" onClick={() => setCodexOpen(true)} style={{ textAlign: 'left', background: 'rgba(13,18,32,.82)', backdropFilter: 'blur(10px)', border: '1px solid rgba(120,170,255,.2)', padding: 10, color: '#e8eaf0', cursor: 'pointer', ...clip(12) }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, letterSpacing: 2, color: '#4dc8ff', fontWeight: 700 }}>CODEX</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4d6b', boxShadow: '0 0 6px #ff4d6b' }} />
          </span>
          <span style={{ display: 'block', fontWeight: 900, fontSize: 14, marginTop: 6 }}>섹터 도감</span>
          <span style={{ display: 'block', fontSize: 9.5, color: '#8b93a7', lineHeight: 1.35 }}>이기고 싶으면<br />도감부터</span>
        </button>
        <div style={{ background: 'rgba(13,18,32,.82)', border: '1px solid rgba(120,170,255,.2)', padding: '9px 10px', display: 'flex', alignItems: 'center', gap: 8, ...clip(12) }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 900, fontSize: 12.5 }}>미션</span>
            <span style={{ display: 'block', fontSize: 9.5, color: '#8b93a7' }}>진실의 눈 5회 도전</span>
          </span>
          <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 10, color: '#ffd166', border: '1px solid rgba(255,209,102,.5)', borderRadius: 3, padding: '0 4px' }}>D-3</span>
        </div>
        <button type="button" onClick={() => go('/game/new?mode=regular')} style={{ position: 'relative', textAlign: 'left', background: 'linear-gradient(135deg,rgba(40,26,64,.9),rgba(13,18,32,.85))', border: '1px solid rgba(167,139,250,.35)', padding: 10, color: '#e8eaf0', cursor: 'pointer', ...clip(12) }}>
          <span style={{ position: 'absolute', top: 0, right: 0, background: '#ff4d6b', color: '#fff', fontSize: 8.5, fontWeight: 900, padding: '2px 7px', clipPath: 'polygon(0 0,100% 0,100% 100%,8px 100%)' }}>{RULES.turnsRegular}R</span>
          <span style={{ display: 'block', fontWeight: 900, fontSize: 14, color: '#d6c8ff' }}>정규전 · 친구방</span>
          <span style={{ display: 'block', fontSize: 9.5, color: '#9a8fc4', marginTop: 2 }}>{RULES.turnsRegular}라운드 · 초대코드</span>
        </button>
      </div>

      {/* 시즌 카드 + CTA */}
      <div style={{ position: 'absolute', left: 10, bottom: 150, width: 158, background: 'linear-gradient(120deg,rgba(64,24,84,.88),rgba(20,14,44,.88))', border: '1px solid rgba(200,120,255,.3)', padding: 10, clipPath: 'polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)' }}>
        <div style={{ fontSize: 8.5, letterSpacing: 2, color: '#d09aff', fontWeight: 700 }}>SEASON</div>
        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 2 }}>2011 ~ 2020</div>
        <div style={{ fontSize: 9.5, color: '#b39ad0' }}>실제로 있었던 일들</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ background: '#ff4d6b', color: '#fff', fontSize: 8.5, fontWeight: 900, padding: '1px 5px', borderRadius: 2 }}>기간한정</span>
          <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 13, color: '#ffd6e8' }}>{pad(Math.floor(countdown / 3600))}:{pad(Math.floor(countdown / 60) % 60)}:{pad(countdown % 60)}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 10, bottom: 150, display: 'flex', flexDirection: 'column', gap: 8, width: 174 }}>
        <button type="button" onClick={() => go('/game/new?mode=quick')} style={{ textAlign: 'left', background: 'linear-gradient(90deg,#37b6ff,#4dd6ff)', color: '#06101f', border: 'none', padding: '13px 16px', cursor: 'pointer', animation: 'lbPulse 2.4s ease-in-out infinite', clipPath: 'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)' }}>
          <span style={{ display: 'block', fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>⚡ 퀵 매치</span>
          <span style={{ display: 'block', fontSize: 10, fontWeight: 700, opacity: 0.75 }}>{RULES.turnsQuick}라운드 · 봇과 바로 시작</span>
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="초대코드" style={{ flex: 1, minWidth: 0, height: 40, background: 'rgba(13,18,32,.8)', border: '1px solid rgba(120,170,255,.2)', color: '#e8eaf0', padding: '0 10px', fontFamily: 'var(--font-num)', fontSize: 13 }} />
          <button type="button" disabled={!code.trim()} onClick={() => go(`/game/${code.trim()}`)} style={{ height: 40, padding: '0 12px', fontWeight: 900, fontSize: 12, background: code.trim() ? 'rgba(77,200,255,.18)' : 'rgba(255,255,255,.05)', color: code.trim() ? '#4dc8ff' : '#5c6682', border: '1px solid rgba(120,170,255,.25)', cursor: 'pointer' }}>
            입장
          </button>
        </div>
      </div>

      {/* 하단 아이콘 바 — 도감만 동작, 나머지는 준비 중 */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 34, display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
        {[['📖', '도감', true], ['🏆', '전당', false], ['👥', '친구', false], ['🎁', '상점', false], ['🏅', '칭호', false], ['⚙️', '설정', false]].map(([e, label, on]) => (
          <button key={label as string} type="button" onClick={on ? () => setCodexOpen(true) : undefined} style={{ textAlign: 'center', opacity: on ? 1 : 0.55, background: 'transparent', border: 'none', color: '#aeb8d2', cursor: on ? 'pointer' : 'default' }}>
            <span style={{ display: 'block', fontSize: 19 }}>{e}</span>
            <span style={{ display: 'block', fontSize: 9, marginTop: 1 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* 공지 티커 */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 24, background: 'rgba(5,8,16,.85)', borderTop: '1px solid rgba(120,170,255,.12)', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <div style={{ whiteSpace: 'nowrap', fontSize: 10, color: '#7d87a3', animation: 'lbTick 14s linear infinite' }}>
          [공지] 영웅키움 — 2011~2020년 사이, 실제로 있었던 일들이 벌어집니다 · 등락률은 감이 아니라 실제 데이터 기반 · 내 뉴스는 일부만 진짜 전조
        </div>
      </div>

      {codexOpen && <CodexOverlay onClose={() => setCodexOpen(false)} />}
      <style dangerouslySetInnerHTML={{ __html: '@keyframes lbTick{from{transform:translateX(420px)}to{transform:translateX(-105%)}}@keyframes lbPulse{0%,100%{box-shadow:0 0 16px rgba(77,200,255,.45)}50%{box-shadow:0 0 34px rgba(77,200,255,.85)}}' }} />
    </div>
  );
}
