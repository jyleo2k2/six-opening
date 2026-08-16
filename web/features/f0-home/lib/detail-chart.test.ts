import assert from "node:assert/strict";
import { buildDetailChart, PIN_COLORS } from "./detail-chart";

// spark 가 짧으면(0·1개) 그릴 선이 없다.
assert.equal(buildDetailChart({ spark: [], price: 1000, changePercent: 1, trades: [] }), null);
assert.equal(buildDetailChart({ spark: [50], price: 1000, changePercent: 1, trades: [] }), null);

const spark = [40, 60, 30, 80, 20, 55, 45];
const base = { spark, price: 10_000, changePercent: 2.5, trades: [] };

const geo = buildDetailChart(base);
assert.ok(geo);
// 선은 spark 길이만큼 좌표쌍을 낸다.
assert.equal(geo!.linePoints.split(" ").length, spark.length);
// 최고는 인덱스 3(80), 최저는 인덱스 4(20).
assert.match(geo!.hi.text, /^최고 [\d,]+원$/u);
assert.match(geo!.lo.text, /^최저 [\d,]+원$/u);
assert.ok(geo!.hi.visible);
assert.ok(geo!.lo.visible);

// 마지막 값이 최고·최저면 라벨을 숨긴다 — 지금 가격 표시와 겹치므로.
const lastIsHigh = buildDetailChart({ ...base, spark: [10, 20, 30, 100] });
assert.equal(lastIsHigh!.hi.visible, false);

// 매매 지점은 최근 3개만, 시간순으로.
const trades = [
  { id: "t1", name: "민지", role: "child" as const, side: "buy" as const, tradedAt: "2026-08-01T00:00:00Z" },
  { id: "t2", name: "엄마", role: "mom" as const, side: "sell" as const, tradedAt: "2026-08-03T00:00:00Z" },
  { id: "t3", name: "민지", role: "child" as const, side: "buy" as const, tradedAt: "2026-08-02T00:00:00Z" },
  { id: "t4", name: "아빠", role: "dad" as const, side: "buy" as const, tradedAt: "2026-08-04T00:00:00Z" },
];
const withTrades = buildDetailChart({ ...base, trades });
assert.equal(withTrades!.pins.length, 3);
assert.deepEqual(
  withTrades!.pins.map((p) => p.id),
  ["t3", "t2", "t4"],
);
assert.equal(withTrades!.pins[0].label, "B");
assert.equal(withTrades!.pins[1].label, "S");

// 체결 기록이 없으면 핀도 없다 — 없는 매매를 지어내지 않는다.
assert.equal(buildDetailChart(base)!.pins.length, 0);
// 핀 색은 프로토타입의 파스텔 표에서 고른다.
const palette: string[] = Object.values(PIN_COLORS);
for (const pin of withTrades!.pins) assert.ok(palette.includes(pin.color), pin.color);

// 엄마와 아빠가 서로 다른 색을 받는다 — 부모로 묶으면 누가 판 것인지 못 가른다.
// 남은 셋은 t3(민지)·t2(엄마)·t4(아빠)다.
const [child, mom, dad] = withTrades!.pins;
assert.equal(child.color, PIN_COLORS.child);
assert.equal(mom.color, PIN_COLORS.mom);
assert.equal(dad.color, PIN_COLORS.dad);
assert.notEqual(mom.color, dad.color);

// 최고·최저 글씨는 B/S 핀과 겹치면 안 된다. `DetailScreen` 이 그리는 상자를 여기서 다시
// 세워 확인한다 — 계산이 상자를 잘못 알면 화면에서 글씨 위에 핀이 얹힌다.
function labelBox(label: { x: number; labelY: number; text: string }) {
  let em = 0;
  for (const ch of label.text) {
    if (ch === " ") em += 0.3;
    else if (ch === ",") em += 0.32;
    else if (ch >= "0" && ch <= "9") em += 0.6;
    else em += 1;
  }
  const half = (em * 11.5) / 2;
  return { left: label.x - half, right: label.x + half, top: label.labelY, bottom: label.labelY + 14 };
}
// 핀은 `translate(-50%,-100%)` 로 `(x, y-7)` 에 붙고 몸통 23 + 꼬리 7 − 겹침 1 = 29 높이다.
const pinBox = (pin: { x: number; y: number }) => ({
  left: pin.x - 11.5,
  right: pin.x + 11.5,
  top: pin.y - 36,
  bottom: pin.y - 7,
});

function assertLabelsClearOfPins(geometry: NonNullable<ReturnType<typeof buildDetailChart>>, note: string) {
  for (const label of [geometry.hi, geometry.lo]) {
    if (!label.visible) continue;
    const box = labelBox(label);
    for (const pin of geometry.pins) {
      const other = pinBox(pin);
      const apart = box.right <= other.left || box.left >= other.right || box.bottom <= other.top || box.top >= other.bottom;
      assert.ok(apart, `${note}: "${label.text}" 가 핀(${pin.label})과 겹친다`);
    }
  }
}

// 이 fixture 는 세 번째 핀이 최저점(인덱스 4)에 정확히 얹히는 자리다 — 겹침이 나던 경우.
assert.equal(withTrades!.pins[2].y, withTrades!.lo.y);
assertLabelsClearOfPins(withTrades!, "핀이 최저점에 얹힌 경우");
// 최저 글씨는 핀을 피해 선 아래에 남는다. 위로 올리면 핀 몸통 자리로 들어간다.
assert.ok(withTrades!.lo.labelY > withTrades!.lo.y, "최저 글씨가 선 위로 올라갔다");

// 값 모양·핀 개수를 바꿔 가며 훑어도 겹치지 않는다.
const shapes = [
  [40, 60, 30, 80, 20, 55, 45],
  [100, 10, 100, 10, 100, 10, 100, 10],
  [5, 4, 3, 2, 1, 2, 3, 4, 9],
  [1, 2, 3, 4, 5, 4, 3, 2, 1, 2],
];
for (const shape of shapes)
  for (let count = 1; count <= 3; count++) {
    const some = trades.slice(0, count);
    for (const price of [1_200, 87_500, 1_450_000]) {
      const g = buildDetailChart({ spark: shape, price, changePercent: 2.5, trades: some });
      assertLabelsClearOfPins(g!, `spark=${shape.length} 핀=${count} 가격=${price}`);
    }
  }

console.log("detail chart tests passed");
