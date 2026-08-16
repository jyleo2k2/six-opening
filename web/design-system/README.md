# design-system — 클로드 디자인 반입 원본

claude.ai/design 의 `영웅 키움` 프로젝트에서 받아 온 **컴포넌트 원본**을 그대로 두는 곳이다.
프로젝트 구조를 그대로 옮겨서 어느 쪽이 최신인지 파일 단위로 비교할 수 있게 한다.

```
design-system/
  foundations/   colors.html · type.html · voice.html   — 토큰·타이포·보이스
  components/    base.html · finance.html · kiwoong.html — 컴포넌트 갤러리
```

## 이 폴더의 성격

- **원본이지 화면이 아니다.** 각 파일은 브라우저로 바로 열리는 한 장짜리 카탈로그다.
  로그인·홈·매수 같은 실제 화면은 여기 없다.
- **빌드에 들어가지 않는다.** 실제 화면 원본은 `web/features/f0-home`의 React 컴포넌트다.
  이 폴더는 그 화면과 무관한 참조용이다.
- **손으로 고치지 않는다.** 디자인 변경은 claude.ai/design 쪽에서 하고 여기로 다시 받아 온다.
  반대로 여기서 고치면 다음 반입 때 사라진다.

## 반영 경로

이 폴더의 토큰·컴포넌트를 화면에 적용할 때는 `web/features/f0-home`의 해당 컴포넌트를 고친다.
`web/AGENTS.md` 기준상 화면이 쓰는 토큰·컴포넌트의 단일 원본은 `docs/디자인시스템.md`이므로,
반입한 값이 그 문서와 어긋나면 문서를 먼저 갱신한다.
