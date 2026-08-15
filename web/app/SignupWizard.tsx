"use client";

import { useEffect, useMemo, useState } from "react";
import heroBull from "./front UI/assets/hero-bull.png";
import { CARD, CTA_OFF, CTA_ON, FIELD, backBtnStyle } from "./LoginGate";

type Kind = "parent" | "child";
type Guardian = "mom" | "dad";

const PARENT_STEPS = ["credentials", "verify", "family", "consent"] as const;
const CHILD_STEPS = ["credentials", "info", "wait"] as const;

const STEP_TITLES: Record<string, string> = {
  credentials: "회원가입",
  verify: "보호자 본인 확인",
  family: "가족 연결",
  consent: "법정대리인 동의",
  info: "내 정보",
  wait: "부모님 동의 기다리기",
};

const PILL: React.CSSProperties = {
  flex: "none",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12.5,
  fontWeight: 800,
  color: "#F5327F",
  background: "#FDECF4",
  whiteSpace: "nowrap",
};

const CHIP_ON: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  borderRadius: 14,
  padding: "11px 6px",
  fontSize: 13.5,
  fontWeight: 800,
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(180deg,#7B45E8 0%,#5B23D6 100%)",
};

const CHIP_OFF: React.CSSProperties = {
  ...CHIP_ON,
  color: "#5C6280",
  background: "#F4F4FA",
};

const NOTE: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 9,
  background: "linear-gradient(157deg,#EFF0FA 0%,#E7E8F5 100%)",
  borderRadius: 16,
  padding: "12px 14px",
  boxShadow: "inset 0 2px 4px rgba(70,60,120,0.12)",
};

function digitsOnly(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function ProgressBars({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ flex: "none", display: "flex", gap: 5, padding: "0 20px 14px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{ flex: 1, height: 4, borderRadius: 999, background: i <= current ? "#F5327F" : "#DDDFEC" }}
        />
      ))}
    </div>
  );
}

function StepHeader({
  title,
  step,
  total,
  onBack,
}: {
  title: string;
  step: number;
  total: number;
  onBack: () => void;
}) {
  return (
    <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "6px 18px 10px" }}>
      <div onClick={onBack} style={backBtnStyle}>‹</div>
      <div style={{ flex: 1, textAlign: "center", fontSize: 19, fontWeight: 800, color: "#01185A", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
        {title}
      </div>
      <div style={PILL}>
        <span style={{ color: "#F5327F" }}>{step}</span> / {total}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  letterSpacing,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  letterSpacing?: string;
}) {
  return (
    <div style={FIELD}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "#A9AEC4", display: "block" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          outline: "none",
          fontSize: 17,
          fontWeight: 700,
          color: "#01185A",
          letterSpacing,
          marginTop: 3,
          padding: 0,
        }}
      />
    </div>
  );
}

export function SignupWizard({ kind, onExit }: { kind: Kind; onExit: () => void }) {
  const steps = kind === "parent" ? PARENT_STEPS : CHILD_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const step = steps[stepIndex];

  // 자격 증명 (공통)
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const idOk = /^[A-Za-z0-9]{4,16}$/.test(loginId);
  const pwOk = password.length >= 8;
  const pwMatch = passwordConfirm.length > 0 && passwordConfirm === password;
  const credentialsOk = idOk && pwOk && pwMatch;

  // 보호자 본인확인 (부모)
  const [carrier, setCarrier] = useState<string | null>(null);
  const [guardianName, setGuardianName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(179);
  useEffect(() => {
    if (!otpSent || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpSent, secondsLeft]);
  const otpTimeText = `0${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const verifyOk = carrier !== null && guardianName.trim().length > 0 && phone.trim().length >= 8 && otp.length === 6;

  // 가족 연결 (부모)
  const [familyMode, setFamilyMode] = useState<"create" | "join">("create");
  const [familyName, setFamilyName] = useState("우리 가족");
  const familyCode = useMemo(() => String(Math.floor(100000 + Math.random() * 900000)), []);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const familyOk = familyMode === "create" ? familyName.trim().length > 0 : joinCode.length === 6;

  // 법정대리인 동의 (부모)
  const TERMS = [
    { key: "tos", tag: "필수", label: "서비스 이용약관", detail: "모의투자 리그 이용에 관한 기본 약관이에요.", required: true },
    { key: "privacy", tag: "필수", label: "개인정보 수집·이용 동의", detail: "아이디·이름·생년월일을 서비스 제공 목적으로 수집해요.", required: true },
    { key: "legal", tag: "필수", label: "만 14세 미만 아동 정보처리 법정대리인 동의", detail: "개인정보 보호법 제22조의2에 따른 법정대리인 동의예요.", required: true },
    { key: "marketing", tag: "선택", label: "마케팅 정보 수신", detail: "새 시즌·이벤트 소식을 알려드려요.", required: false },
    { key: "ranking", tag: "선택", label: "가족 랭킹 공개", detail: "다른 가족에게 우리 가족 랭킹을 보여줘요.", required: false },
  ];
  const [agree, setAgree] = useState<Record<string, boolean>>({});
  const allChecked = TERMS.every((t) => agree[t.key]);
  const requiredOk = TERMS.filter((t) => t.required).every((t) => agree[t.key]);
  const toggleAll = () => {
    const next = !allChecked;
    setAgree(Object.fromEntries(TERMS.map((t) => [t.key, next])));
  };
  const toggleOne = (key: string) => setAgree((prev) => ({ ...prev, [key]: !prev[key] }));

  // 아이 정보 (아이)
  const [nickname, setNickname] = useState("");
  const [birth, setBirth] = useState("");
  const [childFamilyCode, setChildFamilyCode] = useState("");
  const [requestedGuardian, setRequestedGuardian] = useState<Guardian | null>(null);
  const infoOk =
    nickname.trim().length > 0 && birth.trim().length > 0 && childFamilyCode.length === 6 && requestedGuardian !== null;

  const backOrExit = () => {
    if (stepIndex === 0) onExit();
    else setStepIndex((i) => i - 1);
  };
  const next = () => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else setDone(true);
  };

  if (done) {
    return kind === "parent" ? (
      <ParentDone
        familyCode={familyCode}
        showInvite={familyMode === "create"}
        copied={copied}
        onCopy={() => {
          navigator.clipboard?.writeText(familyCode).catch(() => {});
          setCopied(true);
        }}
        onEnterHome={onExit}
      />
    ) : (
      <ChildDone nickname={nickname || "아이"} guardian={requestedGuardian ?? "mom"} onEnterHome={onExit} />
    );
  }

  const title = STEP_TITLES[step];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 59 }}>
      <StepHeader title={title ?? ""} step={stepIndex + 1} total={steps.length} onBack={backOrExit} />
      <ProgressBars total={steps.length} current={stepIndex} />

      <div style={{ flex: 1, overflowY: "auto", padding: "2px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {step === "credentials" && (
          <CredentialsStep
            kind={kind}
            loginId={loginId}
            setLoginId={setLoginId}
            password={password}
            setPassword={setPassword}
            passwordConfirm={passwordConfirm}
            setPasswordConfirm={setPasswordConfirm}
            idOk={idOk}
            pwOk={pwOk}
            pwMatch={pwMatch}
          />
        )}

        {step === "verify" && (
          <VerifyStep
            carrier={carrier}
            setCarrier={setCarrier}
            guardianName={guardianName}
            setGuardianName={setGuardianName}
            phone={phone}
            setPhone={setPhone}
            otpSent={otpSent}
            onSendOtp={() => {
              setOtpSent(true);
              setSecondsLeft(179);
            }}
            otp={otp}
            setOtp={(value) => setOtp(digitsOnly(value, 6))}
            otpTimeText={otpTimeText}
          />
        )}

        {step === "family" && (
          <FamilyStep
            mode={familyMode}
            setMode={setFamilyMode}
            familyName={familyName}
            setFamilyName={setFamilyName}
            familyCode={familyCode}
            copied={copied}
            onCopy={() => {
              navigator.clipboard?.writeText(familyCode).catch(() => {});
              setCopied(true);
            }}
            joinCode={joinCode}
            setJoinCode={(value) => setJoinCode(digitsOnly(value, 6))}
          />
        )}

        {step === "consent" && (
          <ConsentStep terms={TERMS} agree={agree} allChecked={allChecked} toggleAll={toggleAll} toggleOne={toggleOne} />
        )}

        {step === "info" && (
          <ChildInfoStep
            nickname={nickname}
            setNickname={setNickname}
            birth={birth}
            setBirth={setBirth}
            familyCode={childFamilyCode}
            setFamilyCode={(value) => setChildFamilyCode(digitsOnly(value, 6))}
            requestedGuardian={requestedGuardian}
            setRequestedGuardian={setRequestedGuardian}
          />
        )}

        {step === "wait" && <ChildWaitStep nickname={nickname || "아이"} guardian={requestedGuardian ?? "mom"} />}
      </div>

      <div style={{ flex: "none", padding: "12px 16px 24px" }}>
        <button
          type="button"
          disabled={
            (step === "credentials" && !credentialsOk) ||
            (step === "verify" && !verifyOk) ||
            (step === "family" && !familyOk) ||
            (step === "consent" && !requiredOk) ||
            (step === "info" && !infoOk)
          }
          onClick={next}
          style={
            (step === "credentials" && credentialsOk) ||
            (step === "verify" && verifyOk) ||
            (step === "family" && familyOk) ||
            (step === "consent" && requiredOk) ||
            (step === "info" && infoOk) ||
            step === "wait"
              ? CTA_ON
              : CTA_OFF
          }
        >
          <span style={{ textShadow: "0 1px 2px rgba(170,30,95,0.22)" }}>
            {step === "wait" ? "부모님이 동의했어요" : step === "consent" ? "동의하고 완료" : "다음"}
          </span>
        </button>
      </div>
    </div>
  );
}

function CredentialsStep({
  kind,
  loginId,
  setLoginId,
  password,
  setPassword,
  passwordConfirm,
  setPasswordConfirm,
  idOk,
  pwOk,
  pwMatch,
}: {
  kind: Kind;
  loginId: string;
  setLoginId: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  passwordConfirm: string;
  setPasswordConfirm: (value: string) => void;
  idOk: boolean;
  pwOk: boolean;
  pwMatch: boolean;
}) {
  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#01185A", lineHeight: 1.5 }}>
          먼저 아이디와 비밀번호를 만들어요
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: "#5C6280", lineHeight: 1.75, marginTop: 9 }}>
          {kind === "parent"
            ? "이 계정으로 아이를 초대하고 법정대리인 동의까지 진행해요."
            : "다음 단계에서 별명과 부모님 가족 코드를 입력해요."}
        </div>
      </div>

      <div style={CARD}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>계정 정보</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>
          <Field label="아이디" value={loginId} onChange={setLoginId} placeholder="영문·숫자 4~16자" />
          <Field label="비밀번호" value={password} onChange={setPassword} type="password" letterSpacing="0.14em" />
          <Field label="비밀번호 확인" value={passwordConfirm} onChange={setPasswordConfirm} type="password" letterSpacing="0.14em" />
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.65, marginTop: 11 }}>
          아이디는 영문·숫자 4~16자, 비밀번호는 8자 이상으로 만들어요. 다른 서비스 계정과 연결하지 않아요.
        </div>
        {loginId.length > 0 && !idOk && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#D5327A", marginTop: 8 }}>아이디 형식을 확인해 주세요.</div>
        )}
        {password.length > 0 && !pwOk && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#D5327A", marginTop: 8 }}>비밀번호는 8자 이상이어야 해요.</div>
        )}
        {passwordConfirm.length > 0 && !pwMatch && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#D5327A", marginTop: 8 }}>비밀번호가 서로 달라요.</div>
        )}
      </div>
    </>
  );
}

function VerifyStep({
  carrier,
  setCarrier,
  guardianName,
  setGuardianName,
  phone,
  setPhone,
  otpSent,
  onSendOtp,
  otp,
  setOtp,
  otpTimeText,
}: {
  carrier: string | null;
  setCarrier: (value: string) => void;
  guardianName: string;
  setGuardianName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  otpSent: boolean;
  onSendOtp: () => void;
  otp: string;
  setOtp: (value: string) => void;
  otpTimeText: string;
}) {
  const carriers = ["SKT", "KT", "LG U+", "알뜰폰"];
  return (
    <>
      <div
        style={{
          background: "linear-gradient(157deg,#FEF3F7 0%,#FBE4EC 46%,#F6D5E3 100%)",
          borderRadius: 26,
          padding: "17px 19px",
          boxShadow: "0 16px 34px rgba(90,25,70,0.13)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#D5327A" }}>왜 확인하나요?</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#01185A", lineHeight: 1.6, marginTop: 8 }}>
          아이 계정의 법정대리인이 되려면 성인 여부를 확인해야 해요. 이름·생년월일만 대조해요.
        </div>
      </div>

      <div style={CARD}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>휴대폰 본인확인</div>
        <div style={{ display: "flex", gap: 7, marginTop: 14 }}>
          {carriers.map((c) => (
            <div key={c} onClick={() => setCarrier(c)} style={c === carrier ? CHIP_ON : CHIP_OFF}>
              {c}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14 }}>
          <Field label="이름" value={guardianName} onChange={setGuardianName} placeholder="법정대리인 이름" />
          <Field label="휴대폰 번호" value={phone} onChange={(v) => setPhone(digitsOnly(v, 11))} placeholder="숫자만 입력" />
        </div>
        <div
          onClick={onSendOtp}
          style={{
            textAlign: "center",
            borderRadius: 14,
            padding: 13,
            marginTop: 14,
            fontSize: 14.5,
            fontWeight: 800,
            color: "#fff",
            cursor: "pointer",
            background: "linear-gradient(180deg,#7B45E8 0%,#5B23D6 100%)",
          }}
        >
          {otpSent ? "인증번호 다시 받기" : "인증번호 받기"}
        </div>

        {otpSent && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#5C6280" }}>인증번호 6자리</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#F5327F" }}>{otpTimeText}</span>
            </div>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              inputMode="numeric"
              placeholder="000000"
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "none",
                outline: "none",
                background: "#F4F4FA",
                borderRadius: 16,
                padding: "13px 15px",
                fontSize: 20,
                fontWeight: 800,
                color: "#01185A",
                letterSpacing: "0.3em",
                marginTop: 10,
                boxShadow: "inset 0 2px 4px rgba(70,60,120,0.10)",
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}

function FamilyStep({
  mode,
  setMode,
  familyName,
  setFamilyName,
  familyCode,
  copied,
  onCopy,
  joinCode,
  setJoinCode,
}: {
  mode: "create" | "join";
  setMode: (value: "create" | "join") => void;
  familyName: string;
  setFamilyName: (value: string) => void;
  familyCode: string;
  copied: boolean;
  onCopy: () => void;
  joinCode: string;
  setJoinCode: (value: string) => void;
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 9 }}>
        <div
          onClick={() => setMode("create")}
          style={{ ...CARD, flex: 1, cursor: "pointer", boxShadow: mode === "create" ? "inset 0 0 0 2px #F5327F" : CARD.boxShadow }}
        >
          <div style={{ fontSize: 22 }}>🏡</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#01185A", marginTop: 8 }}>가족 새로 만들기</div>
        </div>
        <div
          onClick={() => setMode("join")}
          style={{ ...CARD, flex: 1, cursor: "pointer", boxShadow: mode === "join" ? "inset 0 0 0 2px #F5327F" : CARD.boxShadow }}
        >
          <div style={{ fontSize: 22 }}>🔗</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#01185A", marginTop: 8 }}>기존 가족에 참여</div>
        </div>
      </div>

      {mode === "create" ? (
        <>
          <div style={CARD}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>가족 이름</div>
            <Field label="" value={familyName} onChange={setFamilyName} />
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.6, marginTop: 9 }}>
              랭킹에 보이는 이름이에요. 실명은 쓰지 않아요.
            </div>
          </div>
          <div
            style={{
              background: "linear-gradient(157deg,#FEF3F7 0%,#FBE4EC 46%,#F6D5E3 100%)",
              borderRadius: 28,
              padding: 20,
              textAlign: "center",
              boxShadow: "0 16px 34px rgba(90,25,70,0.13)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#D5327A" }}>가족 코드</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: "#01185A", letterSpacing: "0.1em", marginTop: 8 }}>
              {familyCode}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: "#8E93A8", lineHeight: 1.65, marginTop: 9 }}>
              아이 기기에서 [아이 계정 만들기]를 누르고
              <br />이 숫자 6자리를 입력하면 동의 요청이 와요.
            </div>
            <div
              onClick={onCopy}
              style={{
                marginTop: 14,
                borderRadius: 14,
                padding: 12,
                fontSize: 14,
                fontWeight: 800,
                color: "#fff",
                cursor: "pointer",
                background: "linear-gradient(180deg,#F663A1 0%,#EE4A8E 100%)",
              }}
            >
              {copied ? "복사했어요" : "코드 복사하기"}
            </div>
          </div>
        </>
      ) : (
        <div style={CARD}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>가족 코드 입력</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.6, marginTop: 7 }}>
            먼저 가입한 보호자에게 코드를 받아요.
          </div>
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            inputMode="numeric"
            placeholder="000000"
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "none",
              outline: "none",
              background: "#F4F4FA",
              borderRadius: 16,
              padding: "13px 15px",
              fontSize: 20,
              fontWeight: 800,
              color: "#01185A",
              letterSpacing: "0.3em",
              marginTop: 12,
              boxShadow: "inset 0 2px 4px rgba(70,60,120,0.10)",
            }}
          />
          {joinCode.length === 6 && (
            <div
              style={{
                marginTop: 12,
                borderRadius: 16,
                padding: 14,
                background: "linear-gradient(157deg,#F1FAF6 0%,#E4F4EC 100%)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: "#0F8A68" }}>가족을 찾았어요</div>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 9 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 21,
                    background: "#fff",
                  }}
                >
                  🏡
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>{familyName || "우리 가족"}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "#5C6280", marginTop: 3 }}>
                    보호자 1명 참여 중
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ConsentStep({
  terms,
  agree,
  allChecked,
  toggleAll,
  toggleOne,
}: {
  terms: { key: string; tag: string; label: string; detail: string; required: boolean }[];
  agree: Record<string, boolean>;
  allChecked: boolean;
  toggleAll: () => void;
  toggleOne: (key: string) => void;
}) {
  const mark = (on: boolean): React.CSSProperties => ({
    flex: "none",
    width: 26,
    height: 26,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    color: on ? "#fff" : "#D7D9E6",
    background: on ? "linear-gradient(180deg,#FFA0C6 0%,#F663A1 62%,#EE4A8E 100%)" : "linear-gradient(180deg,#FCFCFE 0%,#F1F2F9 100%)",
    boxShadow: on ? "0 5px 10px -4px rgba(214,54,124,0.45)" : "inset 0 0 0 1.5px #E4E5EF",
  });

  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#D5327A" }}>개인정보 보호법 제22조의2</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#5C6280", lineHeight: 1.7, marginTop: 8 }}>
          만 14세 미만 아동의 개인정보를 처리할 때는 법정대리인의 동의가 필요해요. 동의 전까지 아이 계정은 시작되지
          않아요. 동의는 언제든 [설정 → 아이 계정 관리]에서 철회할 수 있어요.
        </div>
      </div>

      <div onClick={toggleAll} style={{ ...CARD, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <div style={mark(allChecked)}>✓</div>
        <div style={{ flex: 1, fontSize: 16.5, fontWeight: 800, color: "#01185A" }}>전체 동의하기</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {terms.map((t) => (
          <div key={t.key} style={{ ...CARD, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div onClick={() => toggleOne(t.key)} style={mark(Boolean(agree[t.key]))}>✓</div>
            <div onClick={() => toggleOne(t.key)} style={{ flex: 1, cursor: "pointer" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: t.required ? "#F5327F" : "#8E93A8" }}>{t.tag}</div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "#01185A", lineHeight: 1.5, marginTop: 5 }}>{t.label}</div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.6, marginTop: 5 }}>{t.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ChildInfoStep({
  nickname,
  setNickname,
  birth,
  setBirth,
  familyCode,
  setFamilyCode,
  requestedGuardian,
  setRequestedGuardian,
}: {
  nickname: string;
  setNickname: (value: string) => void;
  birth: string;
  setBirth: (value: string) => void;
  familyCode: string;
  setFamilyCode: (value: string) => void;
  requestedGuardian: Guardian | null;
  setRequestedGuardian: (value: Guardian) => void;
}) {
  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>뭐라고 부를까요?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>
          <Field label="별명" value={nickname} onChange={setNickname} placeholder="별명을 입력해요" />
          <Field label="생년월일" value={birth} onChange={(v) => setBirth(digitsOnly(v, 8))} placeholder="YYYYMMDD" />
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.65, marginTop: 11 }}>
          실명·학교·연락처는 받지 않아요. 별명과 생년월일은 부모님께 동의를 부탁하려고 먼저 받아요.
        </div>
      </div>

      <div style={CARD}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>부모님 가족 코드</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.6, marginTop: 7 }}>
          부모님 앱 [가족 연결]에 있는 숫자 6자리예요.
        </div>
        <input
          value={familyCode}
          onChange={(event) => setFamilyCode(event.target.value)}
          inputMode="numeric"
          placeholder="000000"
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "none",
            outline: "none",
            background: "#F4F4FA",
            borderRadius: 16,
            padding: "13px 15px",
            fontSize: 20,
            fontWeight: 800,
            color: "#01185A",
            letterSpacing: "0.3em",
            marginTop: 12,
            boxShadow: "inset 0 2px 4px rgba(70,60,120,0.10)",
          }}
        />
      </div>

      {familyCode.length === 6 && (
        <div style={CARD}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>누구에게 동의를 요청할까요?</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.6, marginTop: 7 }}>
            한 분만 동의하면 시작할 수 있어요.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <div onClick={() => setRequestedGuardian("mom")} style={requestedGuardian === "mom" ? CHIP_ON : CHIP_OFF}>
              엄마
            </div>
            <div onClick={() => setRequestedGuardian("dad")} style={requestedGuardian === "dad" ? CHIP_ON : CHIP_OFF}>
              아빠
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChildWaitStep({ nickname, guardian }: { nickname: string; guardian: Guardian }) {
  const guardianLabel = guardian === "mom" ? "엄마" : "아빠";
  const waitSteps = [
    { mark: "✓", label: "요청을 보냈어요", detail: "가족 코드로 " + guardianLabel + "에게 연결했어요.", done: true },
    { mark: "2", label: guardianLabel + "가 확인하고 있어요", detail: "동의 화면에서 별명·생년월일을 확인해요.", done: false },
    { mark: "3", label: "승인되면 시작해요", detail: "동의가 끝나면 바로 리그에 들어가요.", done: false },
  ];
  return (
    <>
      <div style={{ textAlign: "center", padding: "14px 0 4px" }}>
        <img
          src="/ui/assets/mascot-bear.png"
          width={118}
          alt="키웅이"
          style={{ display: "block", margin: "0 auto", filter: "drop-shadow(0 12px 20px rgba(35,25,80,0.2))" }}
        />
        <div style={{ fontSize: 23, fontWeight: 800, color: "#01185A", letterSpacing: "-0.02em", marginTop: 12 }}>
          부모님께 요청을 보냈어요
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: "#8E93A8", lineHeight: 1.7, marginTop: 8 }}>
          {guardianLabel}가 동의를 누르면 바로 시작해요.
          <br />
          조금만 기다려요.
        </div>
      </div>

      <div style={CARD}>
        {waitSteps.map((w, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "7px 0" }}>
            <div
              style={{
                flex: "none",
                width: 24,
                height: 24,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                color: w.done ? "#fff" : "#A9AEC4",
                background: w.done ? "#F5327F" : "#F1F2F8",
              }}
            >
              {w.mark}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#01185A" }}>{w.label}</div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.6, marginTop: 3 }}>
                {w.detail}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={NOTE}>
        <span style={{ fontSize: 15 }}>🔒</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#5C6280", lineHeight: 1.65 }}>
          동의를 받기 전에는 별명·생년월일 말고 아무것도 저장하지 않아요. 7일 안에 동의가 없으면 요청과 정보를
          지워요.
        </span>
      </div>
    </>
  );
}

function ParentDone({
  familyCode,
  showInvite,
  copied,
  onCopy,
  onEnterHome,
}: {
  familyCode: string;
  showInvite: boolean;
  copied: boolean;
  onCopy: () => void;
  onEnterHome: () => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 59 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ textAlign: "center", padding: "10px 0 2px" }}>
          <img
            src={heroBull.src}
            width={132}
            alt="영웅이"
            style={{ display: "block", margin: "0 auto", filter: "drop-shadow(0 12px 20px rgba(35,25,80,0.2))" }}
          />
          <div style={{ fontSize: 24, fontWeight: 800, color: "#01185A", letterSpacing: "-0.02em", marginTop: 12 }}>
            가입이 완료됐어요!
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 500, color: "#8E93A8", lineHeight: 1.7, marginTop: 8 }}>
            이제 가족을 초대하고 함께 시작해요.
          </div>
        </div>

        {showInvite && (
          <div style={CARD}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: "#01185A" }}>다른 보호자 초대하기</div>
            <div
              style={{
                textAlign: "center",
                borderRadius: 14,
                padding: 14,
                marginTop: 12,
                background: "linear-gradient(157deg,#FEF3F7 0%,#FBE4EC 100%)",
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#D5327A" }}>가족 코드</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#01185A", letterSpacing: "0.1em", marginTop: 4 }}>
                {familyCode}
              </div>
            </div>
            <div
              onClick={onCopy}
              style={{
                textAlign: "center",
                borderRadius: 14,
                padding: 12,
                marginTop: 8,
                fontSize: 13.5,
                fontWeight: 700,
                color: "#5C6280",
                cursor: "pointer",
                background: "#F3F3FA",
              }}
            >
              {copied ? "복사했어요" : "가족 코드 복사하기"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.6, marginTop: 8, textAlign: "center" }}>
              아빠·엄마는 각자 계정으로 가입한 뒤, 이 코드로 [기존 가족에 참여]해요.
            </div>
          </div>
        )}

        <div style={NOTE}>
          <span style={{ fontSize: 15 }}>🏫</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#5C6280", lineHeight: 1.65 }}>
            아이 계정은 평일 09:00~16:00에 주문을 쉬어요. 설정에서 바꿀 수 있어요.
          </span>
        </div>
      </div>
      <div style={{ flex: "none", padding: "12px 16px 26px" }}>
        <button type="button" onClick={onEnterHome} style={CTA_ON}>
          <span style={{ textShadow: "0 1px 2px rgba(170,30,95,0.22)" }}>내 홈으로</span>
        </button>
      </div>
    </div>
  );
}

function ChildDone({ nickname, guardian, onEnterHome }: { nickname: string; guardian: Guardian; onEnterHome: () => void }) {
  const guardianLabel = guardian === "mom" ? "엄마" : "아빠";
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 59 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ textAlign: "center", padding: "12px 0 2px" }}>
          <img
            src={heroBull.src}
            width={132}
            alt="영웅이"
            style={{ display: "block", margin: "0 auto", filter: "drop-shadow(0 12px 20px rgba(35,25,80,0.2))" }}
          />
          <div style={{ fontSize: 24, fontWeight: 800, color: "#01185A", letterSpacing: "-0.02em", marginTop: 12 }}>
            동의 완료! 시작할 수 있어요
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 500, color: "#8E93A8", lineHeight: 1.7, marginTop: 8 }}>
            {guardianLabel}가 법정대리인으로 동의했어요.
            <br />
            이제 {nickname} 계정으로 리그에 들어가요.
          </div>
        </div>

        <div
          style={{
            background: "linear-gradient(157deg,#FFFDF6 0%,#FFF6DF 46%,#FFEFC9 100%)",
            borderRadius: 26,
            padding: "18px 20px",
            boxShadow: "0 16px 34px rgba(120,90,20,0.13)",
          }}
        >
          <div style={{ fontSize: 15.5, fontWeight: 800, color: "#7A5A0F" }}>💰 시드머니 1,000만원 지급</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#8A7248", lineHeight: 1.7, marginTop: 8 }}>
            진짜 돈이 아닌 연습용 머니예요. 시즌 3은 4주 동안 이어져요.
          </div>
        </div>

        <div style={NOTE}>
          <span style={{ fontSize: 15 }}>🏫</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#5C6280", lineHeight: 1.65 }}>
            평일 09:00~16:00에는 주문을 쉬어요. 구경하고 배우는 건 언제든 할 수 있어요.
          </span>
        </div>
      </div>
      <div style={{ flex: "none", padding: "12px 16px 26px" }}>
        <button type="button" onClick={onEnterHome} style={CTA_ON}>
          <span style={{ textShadow: "0 1px 2px rgba(170,30,95,0.22)" }}>{nickname} 홈으로 가기</span>
        </button>
      </div>
    </div>
  );
}
