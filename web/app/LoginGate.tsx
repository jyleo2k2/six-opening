"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Jua } from "next/font/google";
import iconChild from "./front UI/assets/icon-child.png";
import iconParents from "./front UI/assets/icon-parents.png";
import splashHero from "./front UI/assets/splash-hero.png";
import { LoadingScreen } from "./LoadingScreen";
// 폰 프레임은 로그인도 로그인 뒤 화면과 같은 것을 쓴다. 무대(`.phone-stage`)·배율·상태바·
// 홈 막대가 전부 딸려 오므로 이 파일은 화면 안쪽만 그린다.
import { PhoneFrame } from "../features/f0-home/PhoneFrame";
import { SignupWizard } from "./SignupWizard";

const jua = Jua({ weight: "400", subsets: ["latin"], preload: false });

type Screen = "splash" | "signin" | "soon" | "loading";

export const CTA_ON: React.CSSProperties = {
  borderRadius: 999,
  padding: 19,
  textAlign: "center",
  fontSize: 19,
  fontWeight: 800,
  color: "#fff",
  letterSpacing: "-0.01em",
  cursor: "pointer",
  border: "none",
  width: "100%",
  background: "linear-gradient(180deg,#FFA0C6 0%,#FC7DAF 34%,#F663A1 66%,#EE4A8E 100%)",
  boxShadow: "0 16px 26px -9px rgba(214,54,124,0.4), inset 0 -6px 12px -6px rgba(255,255,255,0.35)",
  textShadow: "0 1px 2px rgba(170,30,95,0.22)",
};

export const CTA_OFF: React.CSSProperties = {
  ...CTA_ON,
  cursor: "not-allowed",
  background: "linear-gradient(180deg,#D3D5E2 0%,#C3C6D6 60%,#B7BACC 100%)",
  boxShadow: "0 8px 14px -6px rgba(35,25,80,0.18)",
  textShadow: "none",
};

export const CARD: React.CSSProperties = {
  background: "linear-gradient(157deg,#FFFFFF 0%,#FFFFFF 46%,#F6F6FC 100%)",
  borderRadius: 26,
  padding: 18,
  boxShadow:
    "0 12px 28px rgba(35,25,80,0.10), 0 2px 5px rgba(35,25,80,0.05), inset 0 0 0 1px rgba(255,255,255,0.7)",
};

export const FIELD: React.CSSProperties = {
  background: "linear-gradient(157deg,#F4F4FA 0%,#EFEFF7 100%)",
  borderRadius: 16,
  padding: "13px 15px",
  boxShadow: "inset 0 2px 4px rgba(70,60,120,0.10)",
};

export const backBtnStyle: React.CSSProperties = {
  flex: "none",
  width: 38,
  height: 38,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 700,
  color: "#01185A",
  cursor: "pointer",
  background: "#fff",
  boxShadow: "0 4px 10px -4px rgba(35,25,80,0.25)",
};

export function LoginGate() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("splash");
  const [soonKind, setSoonKind] = useState<"parent" | "child">("parent");
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = loginId.trim().length > 0 && loginPassword.length > 0 && !submitting;

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: loginId.trim(), login_password: loginPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "로그인에 실패했어요.");
        return;
      }
      // 곧바로 서버 렌더를 다시 부르지 않는다. 로딩 화면이 홈·아카이브가 읽을 것을
      // 먼저 받아 두고, 다 받으면 그때 `router.refresh()` 로 앱 화면으로 넘어간다.
      setScreen("loading");
    } catch {
      setError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  // 로그인에 성공하면 이 파일의 화면 대신 로딩 화면이 통째로 선다 — 배경색도 상태바
  // 색도 달라서 위의 보라 그라데이션 안에 끼워 넣지 않는다.
  if (screen === "loading") return <LoadingScreen onDone={() => router.refresh()} />;

  // 프레임·배율·상태바·홈 막대는 로그인 뒤 화면과 **같은 컴포넌트**가 그린다. 예전에는 이
  // 파일이 프레임을 통째로 다시 그리면서 상태바와 홈 막대만 빠뜨렸다. 그래서 로그인에서
  // 홈으로 넘어가는 순간 시계·배터리와 아래 막대가 갑자기 생겼고, 배율도 여기서 CSS 로
  // 따로 계산하다 `calc((100vw - 16px) / 450)` 이 숫자를 받는 `scale()` 과 타입이 맞지 않아
  // 선언이 통째로 버려진 적이 있다. 다시 그리지 않으면 어긋날 자리도 없다.
  return (
    <PhoneFrame>
      {/* 로그인만 배경이 보라 그라데이션이라 화면 색 위에 한 겹 덮는다. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Pretendard','Segoe UI','Malgun Gothic',sans-serif",
          color: "#1A2233",
          background: "linear-gradient(180deg,#F2EDFC 0%,#EFEAFA 55%,#EDE8F9 100%)",
        }}
      >
          {screen === "splash" && (
            <SplashScreen
              onSignin={() => setScreen("signin")}
              onCreate={(kind) => {
                setSoonKind(kind);
                setScreen("soon");
              }}
            />
          )}
          {screen === "signin" && (
            <SigninScreen
              loginId={loginId}
              loginPassword={loginPassword}
              error={error}
              canSubmit={canSubmit}
              submitting={submitting}
              onChangeId={setLoginId}
              onChangePassword={setLoginPassword}
              onSubmit={handleLogin}
              onBack={() => {
                setScreen("splash");
                setError(null);
              }}
            />
          )}
          {screen === "soon" && (
            <SignupWizard kind={soonKind} onExit={() => setScreen("splash")} />
          )}
      </div>
    </PhoneFrame>
  );
}

function SplashScreen({
  onSignin,
  onCreate,
}: {
  onSignin: () => void;
  onCreate: (kind: "parent" | "child") => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "59px 4px 0" }}>
      <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 4px 0" }}>
        <div style={{ position: "relative", width: "100%" }}>
          <svg
            width={46}
            height={46}
            viewBox="0 0 48 48"
            aria-hidden="true"
            style={{ position: "absolute", left: 6, top: 0, pointerEvents: "none", transform: "rotate(-12deg)", filter: "drop-shadow(0 5px 7px rgba(180,20,100,0.3))" }}
          >
            <defs>
              <radialGradient id="stP" cx="35%" cy="28%" r="72%">
                <stop offset="0" stopColor="#FF95C4" />
                <stop offset="45%" stopColor="#FA4B92" />
                <stop offset="100%" stopColor="#D20F63" />
              </radialGradient>
            </defs>
            <path
              d="M24 4.5c1.6 0 2.6 1 3.3 2.4l3.7 7.4 8.2 1.2c1.6.2 2.8.9 3.3 2.4.5 1.5 0 2.8-1.1 3.9l-5.9 5.8 1.4 8.2c.3 1.6-.2 2.9-1.5 3.8-1.3.9-2.6.8-4-.1L24 35.6l-7.4 3.7c-1.4.9-2.7 1-4 .1-1.3-.9-1.8-2.2-1.5-3.8l1.4-8.2-5.9-5.8c-1.1-1.1-1.6-2.4-1.1-3.9.5-1.5 1.7-2.2 3.3-2.4l8.2-1.2 3.7-7.4C21.4 5.5 22.4 4.5 24 4.5z"
              fill="url(#stP)"
            />
            <ellipse cx={19} cy={15} rx={4.6} ry={3} fill="#fff" opacity={0.55} transform="rotate(-28 19 15)" />
          </svg>
          <svg
            width={33}
            height={33}
            viewBox="0 0 48 48"
            aria-hidden="true"
            style={{ position: "absolute", left: 20, top: 52, pointerEvents: "none", transform: "rotate(10deg)", filter: "drop-shadow(0 5px 7px rgba(185,130,15,0.32))" }}
          >
            <defs>
              <radialGradient id="stY" cx="35%" cy="28%" r="72%">
                <stop offset="0" stopColor="#FFE39A" />
                <stop offset="45%" stopColor="#FFC22E" />
                <stop offset="100%" stopColor="#E8951B" />
              </radialGradient>
            </defs>
            <path
              d="M24 4.5c1.6 0 2.6 1 3.3 2.4l3.7 7.4 8.2 1.2c1.6.2 2.8.9 3.3 2.4.5 1.5 0 2.8-1.1 3.9l-5.9 5.8 1.4 8.2c.3 1.6-.2 2.9-1.5 3.8-1.3.9-2.6.8-4-.1L24 35.6l-7.4 3.7c-1.4.9-2.7 1-4 .1-1.3-.9-1.8-2.2-1.5-3.8l1.4-8.2-5.9-5.8c-1.1-1.1-1.6-2.4-1.1-3.9.5-1.5 1.7-2.2 3.3-2.4l8.2-1.2 3.7-7.4C21.4 5.5 22.4 4.5 24 4.5z"
              fill="url(#stY)"
            />
            <ellipse cx={19} cy={15} rx={4.6} ry={3} fill="#fff" opacity={0.6} transform="rotate(-28 19 15)" />
          </svg>
          <svg
            width={30}
            height={30}
            viewBox="0 0 48 48"
            aria-hidden="true"
            style={{ position: "absolute", right: 8, top: 58, pointerEvents: "none", transform: "rotate(18deg)", filter: "drop-shadow(0 5px 7px rgba(180,20,100,0.28))" }}
          >
            <defs>
              <radialGradient id="stP2" cx="35%" cy="28%" r="72%">
                <stop offset="0" stopColor="#FF95C4" />
                <stop offset="45%" stopColor="#FA4B92" />
                <stop offset="100%" stopColor="#D20F63" />
              </radialGradient>
            </defs>
            <path
              d="M24 4.5c1.6 0 2.6 1 3.3 2.4l3.7 7.4 8.2 1.2c1.6.2 2.8.9 3.3 2.4.5 1.5 0 2.8-1.1 3.9l-5.9 5.8 1.4 8.2c.3 1.6-.2 2.9-1.5 3.8-1.3.9-2.6.8-4-.1L24 35.6l-7.4 3.7c-1.4.9-2.7 1-4 .1-1.3-.9-1.8-2.2-1.5-3.8l1.4-8.2-5.9-5.8c-1.1-1.1-1.6-2.4-1.1-3.9.5-1.5 1.7-2.2 3.3-2.4l8.2-1.2 3.7-7.4C21.4 5.5 22.4 4.5 24 4.5z"
              fill="url(#stP2)"
            />
            <ellipse cx={19} cy={15} rx={4.6} ry={3} fill="#fff" opacity={0.55} transform="rotate(-28 19 15)" />
          </svg>
          <div
            className={jua.className}
            style={{
              position: "relative",
              textAlign: "center",
              whiteSpace: "nowrap",
              fontSize: 44,
              lineHeight: 1.16,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                color: "#3D1191",
                textShadow: "0 1px 0 #3D1191,0 2px 0 #3A1089,0 3px 0 #370F82,0 4px 0 #340E7B,0 5px 0 #310D74,0 7px 12px rgba(49,13,116,0.35)",
              }}
            >
              영웅키움
              <br />
              가족 모의투자
            </div>
            <div
              style={{
                position: "relative",
                background: "linear-gradient(180deg,#9A63FF 0%,#7B39F2 45%,#5B23D6 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              영웅키움
              <br />
              가족 모의투자
            </div>
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#4A4F6B", marginTop: 14, textAlign: "center", whiteSpace: "nowrap" }}>
          가족과 함께 배우는 우리 아이 주식 첫걸음
        </div>
        <img src={splashHero.src} width={280} alt="영웅이와 키웅이" style={{ display: "block", width: 280, height: "auto", marginTop: 14 }} />
      </div>

      <div style={{ flex: "none", padding: "22px 20px 28px", display: "flex", flexDirection: "column", gap: 13 }}>
        <div
          onClick={onSignin}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderRadius: 24,
            padding: 16,
            cursor: "pointer",
            background: "linear-gradient(160deg,#7B45E8 0%,#5B23D6 100%)",
            boxShadow: "0 14px 26px -10px rgba(70,30,190,0.45)",
          }}
        >
          <svg width={52} height={52} viewBox="0 0 57 57" aria-hidden="true" style={{ display: "block", flex: "none" }}>
            <circle cx={28.5} cy={28.5} r={28.5} fill="rgba(255,255,255,0.18)" />
            <path
              d="M28.5 14.5c-4.4 0-8 3.6-8 8v3.5h4.4V22.5c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6V26h4.4v-3.5c0-4.4-3.6-8-8-8z"
              fill="#FFFFFF"
            />
            <rect x={17.6} y={25.6} width={21.8} height={17.6} rx={5.4} fill="#FFFFFF" />
            <circle cx={28.5} cy={32.6} r={2.9} fill="#5B23D6" />
            <rect x={27.1} y={33.4} width={2.8} height={5.4} rx={1.4} fill="#5B23D6" />
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>기존 계정으로 로그인</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, marginTop: 4 }}>
              아이디·비밀번호로 내 계정에 들어가요
            </div>
          </div>
          <span style={{ flex: "none", fontSize: 19, fontWeight: 800, color: "#fff" }}>›</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 4px" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(60,40,130,0.12)" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#A6A9BE", whiteSpace: "nowrap" }}>처음이신가요?</span>
          <div style={{ flex: 1, height: 1, background: "rgba(60,40,130,0.12)" }} />
        </div>

        <div
          onClick={() => onCreate("parent")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderRadius: 24,
            padding: "14px 16px",
            cursor: "pointer",
            background: "#FFFFFF",
            boxShadow: "0 10px 22px -8px rgba(60,40,130,0.16)",
          }}
        >
          <img src={iconParents.src} width={57} height={57} alt="" style={{ display: "block", width: 57, height: 57, flex: "none", borderRadius: 999, objectFit: "cover" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 800, color: "#2C2F6B" }}>부모(보호자) 계정 만들기</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#A6A9BE", lineHeight: 1.5, marginTop: 4 }}>
              아이를 초대하고 법정대리인 동의를 해요
            </div>
          </div>
          <span style={{ flex: "none", fontSize: 19, fontWeight: 800, color: "#F5327F" }}>›</span>
        </div>
        <div
          onClick={() => onCreate("child")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderRadius: 24,
            padding: "15px 16px",
            cursor: "pointer",
            background: "#FFFFFF",
            boxShadow: "0 10px 22px -8px rgba(60,40,130,0.16)",
          }}
        >
          <img src={iconChild.src} width={57} height={57} alt="" style={{ display: "block", width: 57, height: 57, flex: "none", borderRadius: 999, objectFit: "cover" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 800, color: "#2C2F6B" }}>아이 계정 만들기</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#A6A9BE", lineHeight: 1.5, marginTop: 4 }}>
              부모님 동의를 받으면 바로 시작해요
            </div>
          </div>
          <span style={{ flex: "none", fontSize: 19, fontWeight: 800, color: "#F5327F" }}>›</span>
        </div>
      </div>
    </div>
  );
}

function SigninScreen({
  loginId,
  loginPassword,
  error,
  canSubmit,
  submitting,
  onChangeId,
  onChangePassword,
  onSubmit,
  onBack,
}: {
  loginId: string;
  loginPassword: string;
  error: string | null;
  canSubmit: boolean;
  submitting: boolean;
  onChangeId: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={onSubmit} style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 59 }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "6px 18px 10px" }}>
        <div onClick={onBack} style={backBtnStyle}>‹</div>
        <div style={{ flex: 1, textAlign: "center", fontSize: 19, fontWeight: 800, color: "#01185A", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
          로그인
        </div>
        <div style={{ width: 38, flex: "none" }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={CARD}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>내 계정으로 들어가요</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>
            <div style={FIELD}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#A9AEC4", display: "block" }} htmlFor="login-id">
                아이디
              </label>
              <input
                id="login-id"
                type="text"
                value={loginId}
                onChange={(event) => onChangeId(event.target.value)}
                autoComplete="username"
                style={{ width: "100%", border: "none", background: "transparent", fontSize: 17, fontWeight: 700, color: "#01185A", marginTop: 3, padding: 0 }}
              />
            </div>
            <div style={FIELD}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#A9AEC4", display: "block" }} htmlFor="login-password">
                비밀번호
              </label>
              <input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(event) => onChangePassword(event.target.value)}
                autoComplete="current-password"
                style={{ width: "100%", border: "none", background: "transparent", fontSize: 17, fontWeight: 700, color: "#01185A", letterSpacing: "0.14em", marginTop: 3, padding: 0 }}
              />
            </div>
          </div>
          {error && (
            <div style={{ fontSize: 13, fontWeight: 700, color: "#D5327A", marginTop: 12 }}>{error}</div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 9,
            background: "linear-gradient(157deg,#EFF0FA 0%,#E7E8F5 100%)",
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "inset 0 2px 4px rgba(70,60,120,0.12)",
          }}
        >
          <span style={{ fontSize: 15 }}>👨‍👩‍👧</span>
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "#5C6280", lineHeight: 1.65 }}>
            엄마·아빠·아이가 각각 자기 계정으로 로그인해요.
          </span>
        </div>
      </div>

      <div style={{ flex: "none", padding: "12px 16px 24px" }}>
        <button type="submit" disabled={!canSubmit} style={canSubmit ? CTA_ON : CTA_OFF}>
          {submitting ? "로그인 중…" : "로그인"}
        </button>
      </div>
    </form>
  );
}
