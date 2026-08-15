import assert from "node:assert/strict";
import { styleFromCss } from "./css-style";

function main() {
  // 화면에서 그대로 옮겨 온 선언 문자열이 React 스타일 객체가 된다.
  assert.deepEqual(styleFromCss("position:absolute;left:0;top:0"), {
    position: "absolute",
    left: "0",
    top: "0",
  });

  // 값 안의 쉼표·괄호·공백은 건드리지 않는다. 그라데이션이 깨지면 화면이 통째로 달라진다.
  assert.deepEqual(
    styleFromCss("background:linear-gradient(153deg,#FFFFFF 0%,#F5327F 100%)"),
    { background: "linear-gradient(153deg,#FFFFFF 0%,#F5327F 100%)" },
  );

  // 벤더 접두사는 대문자로 시작해야 React 가 알아본다.
  assert.deepEqual(styleFromCss("-webkit-backdrop-filter:blur(20px)"), {
    WebkitBackdropFilter: "blur(20px)",
  });

  // 사용자 정의 속성은 이름을 바꾸면 안 된다.
  assert.deepEqual(styleFromCss("--runtime-scale:0.8"), { "--runtime-scale": "0.8" });

  // 꼬리 세미콜론·빈 선언은 버린다.
  assert.deepEqual(styleFromCss("display:none;;"), { display: "none" });

  console.log("css style tests passed");
}

main();
