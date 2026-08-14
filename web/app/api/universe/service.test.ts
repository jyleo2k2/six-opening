import assert from "node:assert/strict";
import test from "node:test";
import { getUniverseSnapshot, renderUniverseScript } from "./service";

// 실키가 있는 환경에서도 픽스처 경로만 검증한다 — 테스트가 실 API·DB를 호출하지 않게 한다.
// 삭제는 소용없다: 제공자가 호출 시점에 dotenv 를 다시 로드해 지운 키를 복원한다.
// dotenv 는 이미 있는 값을 덮지 않으므로, 폴백을 트리거하는 값으로 미리 채워 둔다.
process.env.KIWOOM_APP_KEY = "your_test_key";
process.env.KIWOOM_SECRET_KEY = "your_test_secret";
process.env.KIWOOM_ENV = "mock";
process.env.TOSS_CLIENT_ID = "your_test_client_id";
process.env.TOSS_CLIENT_SECRET = "your_test_client_secret";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_PROJECT_REF = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.SUPABASE_SECRET_KEY = "";

test("universe data provides backend quote and chart fallbacks for all stocks", async () => {
  const snapshot = await getUniverseSnapshot(null, false);

  assert.equal(Object.keys(snapshot.quotes).length, 51);
  assert.equal(Object.keys(snapshot.sparks).length, 51);
  assert.equal(snapshot.quotes["039490"].source, "fixture");
  assert.equal(snapshot.quotes["005930"].source, "fixture");
  assert.equal(snapshot.sparks["005930"].length, 16);
});

test("the compatibility script still initializes the PR UI contract", async () => {
  const script = await renderUniverseScript();

  assert.match(script, /window\.KW_UNIVERSE/);
  assert.match(script, /005930/);
});
