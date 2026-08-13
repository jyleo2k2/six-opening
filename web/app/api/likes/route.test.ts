import assert from "node:assert/strict";
import { summarize } from "./route";

const ME = 1;
const MOM = 2;

// 라우트의 401·502 분기는 세션·DB 에 의존한다. `DEMO_USER_ID` 가 개발용 `.env` 에서
// 늦게 주입되므로 여기서 검사하면 환경에 따라 결과가 달라진다. 순수 집계만 고정한다.
function main() {
  // 집계 — 요청한 순서를 유지하고, 반응이 없는 체결도 0 으로 채운다.
  // 채우지 않으면 화면이 카드마다 응답 유무를 따로 확인해야 한다.
  const rows = [
    { transaction_id: "t1", user_id: ME },
    { transaction_id: "t1", user_id: MOM },
    { transaction_id: "t2", user_id: MOM },
  ];
  const summary = summarize(rows, ["t1", "t2", "t3"], ME);
  assert.deepEqual(summary, [
    { transactionId: "t1", count: 2, liked: true },
    // 엄마만 누른 체결 — 개수는 보이되 내가 누른 상태는 아니다
    { transactionId: "t2", count: 1, liked: false },
    { transactionId: "t3", count: 0, liked: false },
  ]);

  // 내가 누른 것만 liked 로 잡힌다
  assert.equal(summarize(rows, ["t1"], MOM)[0].liked, true);
  assert.equal(summarize(rows, ["t2"], ME)[0].liked, false);

  console.log("likes route tests passed");
}

main();
