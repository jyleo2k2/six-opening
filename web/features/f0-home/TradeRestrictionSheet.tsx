"use client";

import { useState } from "react";
import { styleFromCss } from "./lib/css-style";
import {
  STEP_MINUTES,
  WEEKDAY_LABELS,
  stepMinute,
  timeLabel,
  toggleWeekday,
  type TradeRestriction,
} from "./lib/trade-restriction";

/**
 * 부모가 여는 `학교 시간 거래 제한` 설정. 홈 햄버거 메뉴에서만 열린다.
 *
 * **화면만 있는 목업이다.** 여기서 무엇을 정하든 아이 주문은 지금 그대로 나간다 —
 * 저장은 서버로 가지 않고 `ConnectedPrototype` 의 메모리에만 남으며, 그 값을 읽어 주문을
 * 막는 코드는 없다. 실제로 잠글 때가 오면 `api/trade`·`api/orders` 가 막아야 한다.
 *
 * 고치는 동안에는 초안(`draft`)만 바뀌고 `저장` 을 눌러야 반영된다. 토글 하나 만질 때마다
 * 반영하면 요일을 고르는 중간 상태(하루도 안 고른 값)가 메뉴 요약에 그대로 비친다.
 */
const SCRIM = styleFromCss("position:absolute;inset:0;z-index:6;background:rgba(20,15,40,0.4)");
const SHEET = styleFromCss(
  "position:absolute;left:0;right:0;bottom:0;z-index:7;max-height:82%;display:flex;flex-direction:column;" +
    "border-radius:28px 28px 0 0;padding:12px 18px 18px;background:#fff;box-shadow:0 -18px 40px rgba(35,25,80,0.3)",
);
const GRIP = styleFromCss(
  "width:44px;height:5px;border-radius:999px;background:#DCD8EC;margin:0 auto 14px;flex:none",
);
const TITLE = styleFromCss(
  "font-size:22px;font-weight:900;color:#01185A;letter-spacing:-0.02em;padding:0 2px 4px;flex:none",
);
const LEAD = styleFromCss(
  "font-size:12.5px;font-weight:600;color:#8E94AE;padding:0 2px 12px;flex:none",
);
const BODY = styleFromCss(
  "flex:0 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:14px",
);
const SECTION = styleFromCss("font-size:13px;font-weight:800;color:#5C6280;padding:0 2px");
const CARD = styleFromCss("border-radius:16px;padding:12px 14px;background:#F6F5FC;margin-top:8px");
const ROW = styleFromCss("display:flex;align-items:center;justify-content:space-between;gap:12px");
const ROW_LABEL = styleFromCss("font-size:15px;font-weight:700;color:#01185A");
const TIME_ROW = styleFromCss(
  "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0",
);
const TIME_LABEL = styleFromCss("font-size:14px;font-weight:600;color:#5C6280");
const STEPPER = styleFromCss("display:flex;align-items:center;gap:6px");
const ARROW = styleFromCss(
  "width:28px;height:28px;flex:none;border-radius:999px;display:flex;align-items:center;justify-content:center;" +
    "font-size:15px;font-weight:800;color:#5B23D6;background:#fff;cursor:pointer;" +
    "box-shadow:0 4px 10px -6px rgba(35,25,80,0.4)",
);
const TIME_VALUE = styleFromCss(
  "min-width:86px;text-align:center;font-size:15px;font-weight:800;color:#01185A;font-variant-numeric:tabular-nums",
);
const DAYS = styleFromCss("display:flex;gap:6px");
const SAVE = styleFromCss(
  "flex:none;margin-top:16px;border-radius:16px;padding:15px;text-align:center;font-size:16px;font-weight:800;" +
    "color:#fff;cursor:pointer;background:linear-gradient(180deg,#7B45E8 0%,#5B23D6 100%)",
);
const STEP_NOTE = styleFromCss("font-size:11.5px;font-weight:600;color:#A9AEC4;padding-top:6px");

function dayChip(on: boolean) {
  return styleFromCss(
    "flex:1;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;" +
      "font-size:14px;font-weight:800;cursor:pointer;" +
      (on ? "color:#fff;background:#5B23D6" : "color:#8E94AE;background:#fff;box-shadow:inset 0 0 0 1px #E4E2F0"),
  );
}

function checkRow(on: boolean) {
  return styleFromCss(
    "flex:1;display:flex;align-items:center;gap:8px;border-radius:12px;padding:11px 12px;font-size:15px;" +
      "font-weight:700;cursor:pointer;" +
      (on ? "color:#01185A;background:#fff;box-shadow:inset 0 0 0 1.5px #5B23D6" : "color:#8E94AE;background:#fff"),
  );
}

/** ON/OFF 토글. 시안에 스위치가 이 하나뿐이라 공용 컴포넌트로 빼지 않는다. */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={styleFromCss(
        "width:52px;height:30px;flex:none;border-radius:999px;padding:3px;cursor:pointer;display:flex;" +
          "transition:background 0.18s ease;" +
          (on ? "background:#5B23D6;justify-content:flex-end" : "background:#DCD8EC;justify-content:flex-start"),
      )}
    >
      <div style={styleFromCss("width:24px;height:24px;border-radius:999px;background:#fff")} />
    </div>
  );
}

export function TradeRestrictionSheet({
  rule,
  onSave,
  onClose,
}: {
  rule: TradeRestriction;
  onSave: (rule: TradeRestriction) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TradeRestriction>(rule);

  const patch = (next: TradeRestriction) => setDraft(next);

  const submit = () => {
    onSave(draft);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={SCRIM} />
      <div style={SHEET}>
        <div style={GRIP} />
        <div style={TITLE}>학교 시간 거래 제한</div>
        <div style={LEAD}>정한 시간 동안 아이 계정의 주문을 잠가 둬요.</div>

        <div style={BODY}>
          <div>
            <div style={SECTION}>거래 제한</div>
            <div style={{ ...CARD, ...ROW }}>
              <span style={ROW_LABEL}>학교 시간 거래 제한</span>
              <Toggle on={draft.enabled} onToggle={() => patch({ ...draft, enabled: !draft.enabled })} />
            </div>
          </div>

          <div>
            <div style={SECTION}>제한 요일</div>
            <div style={{ ...CARD, ...DAYS }}>
              {WEEKDAY_LABELS.map((label, index) => {
                const weekday = index + 1;
                return (
                  <div
                    key={label}
                    onClick={() => patch(toggleWeekday(draft, weekday))}
                    style={dayChip(draft.weekdays.includes(weekday))}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={SECTION}>제한 시간</div>
            <div style={CARD}>
              {(["start", "end"] as const).map((edge) => (
                <div key={edge} style={TIME_ROW}>
                  <span style={TIME_LABEL}>{edge === "start" ? "시작 시간" : "종료 시간"}</span>
                  <div style={STEPPER}>
                    <div onClick={() => patch(stepMinute(draft, edge, -1))} style={ARROW}>
                      ‹
                    </div>
                    <span style={TIME_VALUE}>
                      {timeLabel(edge === "start" ? draft.start_minute : draft.end_minute)}
                    </span>
                    <div onClick={() => patch(stepMinute(draft, edge, 1))} style={ARROW}>
                      ›
                    </div>
                  </div>
                </div>
              ))}
              <div style={STEP_NOTE}>{STEP_MINUTES}분 단위로 정할 수 있어요.</div>
            </div>
          </div>

          <div>
            <div style={SECTION}>제한되는 기능</div>
            <div style={{ ...CARD, display: "flex", gap: 8, padding: 8 }}>
              <div
                onClick={() => patch({ ...draft, block_buy: !draft.block_buy })}
                style={checkRow(draft.block_buy)}
              >
                <span>{draft.block_buy ? "✓" : "○"}</span>매수
              </div>
              <div
                onClick={() => patch({ ...draft, block_sell: !draft.block_sell })}
                style={checkRow(draft.block_sell)}
              >
                <span>{draft.block_sell ? "✓" : "○"}</span>매도
              </div>
            </div>
          </div>
        </div>

        <div onClick={submit} style={SAVE}>
          저장
        </div>
      </div>
    </>
  );
}
