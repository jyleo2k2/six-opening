import type { CSSProperties } from "react";

/**
 * `ui-src` 화면은 스타일을 CSS 선언 문자열로 만든다 (`'position:absolute;left:0'`).
 * React 는 객체만 받으므로 화면을 옮길 때 그 문자열을 손으로 객체로 옮겨 적게 되는데,
 * 선언이 수십 개라 그 과정에서 값이 조용히 어긋난다. 문자열은 원본 그대로 옮기고
 * 바꾸는 일은 여기 한 곳에서만 한다.
 *
 * **[제약]** 값 안에 든 `;` 는 구분자와 구별할 수 없다 (`url(data:image/svg+xml;base64,…)`).
 * 옮기는 화면 스타일에는 그런 값이 없다. 필요해지면 그 선언만 객체로 직접 쓴다.
 */
export function styleFromCss(css: string): CSSProperties {
  const style: Record<string, string> = {};
  for (const declaration of css.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) continue;
    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!property || !value) continue;
    // 사용자 정의 속성(`--x`)은 그대로 두고, 나머지만 React 가 아는 낙타 표기로 바꾼다.
    // `-webkit-backdrop-filter` 는 `WebkitBackdropFilter` 가 되어야 벤더 접두사가 산다.
    style[property.startsWith("--") ? property : property.replace(/-([a-z])/gu, (_, c: string) => c.toUpperCase())] =
      value;
  }
  return style as CSSProperties;
}
