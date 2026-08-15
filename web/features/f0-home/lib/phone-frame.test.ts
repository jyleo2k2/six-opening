import assert from "node:assert/strict";
import { getPrototypeScreenRect } from "../../f10-chatbot/lib/bottom-sheet";
import { PHONE_SCREEN, PROTOTYPE_PHONE, phoneFrameScale } from "./phone-frame";

function main() {
  // 화면은 프레임 안에 가로로 정확히 가운데 놓인다. 24 + 402 + 24 = 450.
  assert.equal(
    PHONE_SCREEN.left * 2 + PROTOTYPE_PHONE.screenWidth,
    PROTOTYPE_PHONE.frameWidth,
  );

  // 배율은 챗봇이 시트를 맞출 때 쓰는 값과 같아야 한다. 어긋나면 시트가 프레임 밖으로 나온다.
  for (const [w, h] of [
    [1440, 900],
    [900, 1600],
    [400, 700],
    [2000, 2000],
  ]) {
    assert.equal(phoneFrameScale(w, h), getPrototypeScreenRect(w, h).scale);
  }

  // 창이 넉넉하면 원래 크기 그대로다 (1 을 넘겨 키우지 않는다).
  assert.equal(phoneFrameScale(2000, 2000), 1);
  // 좁으면 짧은 쪽에 맞춰 줄어든다.
  assert.equal(phoneFrameScale(458, 5000), 1);
  assert.equal(phoneFrameScale(233, 5000), 0.5);

  console.log("phone frame tests passed");
}

main();
