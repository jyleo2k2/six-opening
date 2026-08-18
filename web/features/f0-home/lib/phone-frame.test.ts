import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  PHONE_SCREEN,
  PHONE_SCREEN_RECT,
  PROTOTYPE_PHONE,
  phoneScreenClipPath,
  prototypeScreenRectFromClientRect,
} from "./phone-frame";

function main() {
  // 화면은 프레임 안에 가로로 정확히 가운데 놓인다. 24 + 402 + 24 = 450.
  assert.equal(
    PHONE_SCREEN.left * 2 + PROTOTYPE_PHONE.screenWidth,
    PROTOTYPE_PHONE.frameWidth,
  );
  assert.deepEqual(PHONE_SCREEN_RECT, {
    left: 24,
    top: 23,
    width: 402,
    height: 874,
    scale: 1,
  });
  assert.equal(
    phoneScreenClipPath(PHONE_SCREEN_RECT),
    "inset(23px calc(100% - 426px) calc(100% - 897px) 24px round 40px)",
  );

  // 오버레이 rect는 viewport 계산값이 아니라 #kw-screen 실측 client rect에서 파생한다.
  const measured = prototypeScreenRectFromClientRect({
    left: 20,
    top: 30,
    width: 201,
    height: 437,
  });
  assert.deepEqual(measured, {
    left: 20,
    top: 30,
    width: 201,
    height: 437,
    scale: 0.5,
  });
  assert.equal(
    prototypeScreenRectFromClientRect({ left: 0, top: 0, width: 0, height: 437 }),
    null,
  );

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

  // 프레임 이미지는 PhoneFrame 안에서 한 번만 그리고, 호스트 바깥에 두 번째 이미지를
  // 다시 놓지 않는다. 구조가 되돌아가면 핀치 줌에서 두 좌표계가 다시 갈라진다.
  const connectedSource = readFileSync(
    new URL("../ConnectedPrototype.tsx", import.meta.url),
    "utf8",
  );
  const phoneFrameSource = readFileSync(
    new URL("../PhoneFrame.tsx", import.meta.url),
    "utf8",
  );
  assert.match(connectedSource, /<PhoneFrame[\s\S]*overlay=/u);
  assert.doesNotMatch(connectedSource, /phoneFrameRect|iphone-frame\.png/u);
  assert.equal((phoneFrameSource.match(/iphone-frame\.png/gu) ?? []).length, 1);

  console.log("phone frame tests passed");
}

main();
