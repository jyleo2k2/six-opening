import assert from "node:assert/strict";
import { getPrototypeScreenRect } from "../../f10-chatbot/lib/bottom-sheet";
import {
  PHONE_SCREEN,
  PROTOTYPE_PHONE,
  phoneFrameScale,
  phoneScreenClipPath,
} from "./phone-frame";

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

  // 아직 화면을 재지 못했으면 자를 사각형도 없다.
  assert.equal(phoneScreenClipPath(null), undefined);

  // 자르는 사각형은 화면 사각형과 정확히 같아야 한다. 오버레이가 뷰포트를 덮으므로
  // 오른쪽·아래는 100% 에서 빼는 값으로 적는다.
  assert.equal(
    phoneScreenClipPath({ left: 20, top: 30, width: 402, height: 874, scale: 1 }),
    "inset(30px calc(100% - 422px) calc(100% - 904px) 20px round 40px)",
  );

  // 모서리 반경도 화면 배율을 따라간다. 안 따라가면 줄어든 화면에서 모서리가 잘려 보인다.
  assert.equal(
    phoneScreenClipPath({ left: 0, top: 0, width: 201, height: 437, scale: 0.5 }),
    "inset(0px calc(100% - 201px) calc(100% - 437px) 0px round 20px)",
  );

  console.log("phone frame tests passed");
}

main();
