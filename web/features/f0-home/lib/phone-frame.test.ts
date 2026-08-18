import assert from "node:assert/strict";
import {
  PHONE_SCREEN,
  PROTOTYPE_PHONE,
  phoneFrameRect,
  phoneScreenClipPath,
  prototypeScreenRectFromClientRect,
} from "./phone-frame";

function main() {
  // 화면은 프레임 안에 가로로 정확히 가운데 놓인다. 24 + 402 + 24 = 450.
  assert.equal(
    PHONE_SCREEN.left * 2 + PROTOTYPE_PHONE.screenWidth,
    PROTOTYPE_PHONE.frameWidth,
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
  assert.deepEqual(phoneFrameRect(measured), {
    left: 8,
    top: 18.5,
    width: 225,
    height: 460,
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

  console.log("phone frame tests passed");
}

main();
