"use client";

import { useEffect, useRef, useState } from "react";
import splashHero from "./front UI/assets/splash-hero.png";
// 프레임·상태바·홈 막대는 로그인 화면과 같은 컴포넌트가 그린다. 배경이 짙으므로
// 상태바만 흰 아이콘(`light`)으로 바꾼다 — 이 화면은 그 안쪽만 그린다.
import { PhoneFrame } from "../features/f0-home/PhoneFrame";
import { BOOT_STEP_COUNT, prefetchBoot } from "../features/f0-home/lib/prefetch-boot";

/**
 * 로그인이 끝나고 앱이 뜨기까지의 화면.
 *
 * **막대가 도는 동안 홈과 아카이브가 읽을 것을 미리 받아 둔다**(`prefetch-boot`). 예전에는
 * 로그인 직후 곧바로 `router.refresh()` 를 불러, 홈은 시드 지갑을 한 번 그렸다 서버 계좌로
 * 바뀌고 아카이브는 `기록을 불러오고 있어요` 부터 시작했다. 기다림을 없앨 수 없다면 기다리는
 * 곳을 한 군데로 모으는 편이 낫다.
 *
 * 진행률은 **시간과 조회 중 늦은 쪽**을 따른다. 시간만 보면 아직 못 받은 채로 100% 가 되고,
 * 조회만 보면 캐시가 더운 재로그인에서 막대가 순식간에 지나가 깜빡임으로만 보인다.
 */

/** 최소 노출 시간. 이보다 빨리 끝나도 막대가 여기까지는 찬다. */
const MIN_MS = 1600;
/**
 * 여기를 넘기면 조회가 덜 끝났어도 100% 로 본다. 서버가 늦다고 로그인한 사람을 로딩
 * 화면에 가둘 수는 없다 — 못 받은 것은 화면이 뜬 뒤 각 훅이 다시 읽는다.
 */
const MAX_MS = 8000;
/** 100% 를 알린 뒤 이만큼 지나도 화면이 안 바뀌면 주소를 새로 연다. */
const STUCK_MS = 12000;

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    let filled = 0;
    let settled = false;
    void prefetchBoot(() => {
      filled += 1;
    }).then(() => {
      settled = true;
    });

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const byTime = (elapsed / MIN_MS) * 100;
      const byData = settled || elapsed >= MAX_MS ? 100 : (filled / BOOT_STEP_COUNT) * 100;
      const next = Math.min(100, Math.floor(Math.min(byTime, byData)));
      // 막대는 뒤로 가지 않는다 — 칸이 차는 속도보다 시간이 앞서면 잠시 멈춰 있을 뿐이다.
      setPct((current) => (next > current ? next : current));
    }, 60);
    return () => clearInterval(timer);
  }, []);

  /**
   * 100% 는 한 번만 알린다. `onDone` 은 서버 렌더를 다시 부르는데(`router.refresh()`),
   * 그 응답이 오기 전까지 이 화면은 그대로 남아 있어 타이머가 계속 돈다.
   *
   * 그 렌더가 끝내 앱 화면을 주지 못하면(세션 조회 실패 등) 이 화면이 100% 인 채로 남는다.
   * 로그인 화면과 달리 여기에는 사용자가 누를 것이 없으므로 막다른 골목이 된다 — 한참
   * 기다려도 안 바뀌면 주소를 새로 열어 서버에게 다시 묻는다. 쿠키가 멀쩡하면 앱으로,
   * 아니면 로그인 화면으로 떨어져 어느 쪽이든 계속 갈 수 있다.
   */
  const announced = useRef(false);
  useEffect(() => {
    if (pct < 100 || announced.current) return;
    announced.current = true;
    onDone();
    const escape = setTimeout(() => window.location.assign("/"), STUCK_MS);
    return () => clearTimeout(escape);
  }, [pct, onDone]);

  return (
    <PhoneFrame statusBar="light">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          overflow: "hidden",
          fontFamily: "'Pretendard','Segoe UI','Malgun Gothic',sans-serif",
          background:
            "radial-gradient(120% 70% at 50% 62%,#123A6B 0%,#101A44 38%,#0B0A25 72%,#080617 100%)",
        }}
      >
        <div
          style={{
            flex: "none",
            marginTop: 200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            textAlign: "center",
            width: "100%",
            padding: "0 24px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontWeight: 500, fontSize: 17, color: "rgba(255,255,255,0.7)", letterSpacing: "-0.01em" }}>
            우리 아이 주식 첫걸음
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: 44,
              lineHeight: 1.1,
              letterSpacing: "-0.045em",
              color: "#fff",
              textShadow: "0 6px 20px rgba(120,60,255,0.4)",
            }}
          >
            영웅<span style={{ color: "#FF4FA0" }}>키움</span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "14px 22px 0",
            boxSizing: "border-box",
          }}
        >
          <img
            alt="영웅이와 키웅이"
            src={splashHero.src}
            style={{
              display: "block",
              width: "100%",
              maxWidth: 250,
              height: "auto",
              animation: "kwFloat 5s ease-in-out infinite",
              filter: "drop-shadow(0 22px 34px rgba(0,0,0,0.45))",
            }}
          />
        </div>

        <img
          alt="키움증권"
          src="/ui/assets/kiwoom-wordmark.png"
          style={{
            flex: "none",
            display: "block",
            marginBottom: 96,
            width: 104,
            height: "auto",
            objectFit: "contain",
            opacity: 0.95,
          }}
        />

        <div style={{ flex: "none", width: "100%", padding: "0 0 40px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 18px 7px" }}>
            <span style={{ font: "600 13px ui-monospace,Menlo,monospace", color: "rgba(255,255,255,0.72)" }}>
              Ver.1.6.0
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.86)" }}>
              {pct >= 100 ? "실행 준비중 입니다." : ""}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 18px" }}>
            <div
              style={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg,#2C6BFF 0%,#8B4FE8 55%,#FF4FA0 100%)",
                  // 0% 라도 눈금 하나는 보인다 — 빈 막대는 멈춘 것으로 읽힌다.
                  width: `${Math.max(2, pct)}%`,
                }}
              />
            </div>
            <span
              style={{
                flex: "none",
                minWidth: 42,
                textAlign: "right",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {pct}%
            </span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
