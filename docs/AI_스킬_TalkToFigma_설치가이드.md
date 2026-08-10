# AI 스킬과 TalkToFigma 설치 가이드

팀원이 아래 순서대로 따라 하면 Codex에 두 가지 스킬을 설치하고, TalkToFigma로 Figma 파일을 읽거나 수정할 수 있습니다.

- 대상 환경: Windows 10/11, PowerShell, Codex
- 설치할 스킬: `karpathy-guidelines`, `apple-design`
- 추가 도구: TalkToFigma MCP + Figma Community 플러그인
- 확인 기준일: 2026-08-10

> TalkToFigma는 OpenAI 또는 Figma의 공식 제품이 아닌 서드파티 오픈소스 도구입니다. 중요한 디자인 파일에서는 먼저 사본을 만들어 테스트하세요.

## 0. 전체 구성

```text
Codex
  ├─ karpathy-guidelines : 단순하고 검증 가능한 코드 작업
  ├─ apple-design        : Apple식 UI·모션 설계 원칙
  └─ TalkToFigma MCP → localhost:3055 → Figma 플러그인 → 현재 Figma 파일
```

## 1. 사전 확인

PowerShell을 열고 아래 명령을 실행합니다.

```powershell
codex --version
node --version
npm --version
```

세 명령 모두 버전이 출력되면 다음 단계로 이동합니다. 명령을 찾을 수 없다면 먼저 [Codex](https://github.com/openai/codex)와 [Node.js](https://nodejs.org/)를 설치해야 합니다.

## 2. AI 스킬 두 개 설치

### 한 번에 설치하기

다음 블록을 PowerShell에 그대로 붙여 넣습니다. `--global`을 사용하므로 특정 프로젝트가 아니라 이 PC의 모든 Codex 작업에서 사용할 수 있습니다.

```powershell
$env:DISABLE_TELEMETRY = "1"
npx -y skills@latest add forrestchang/andrej-karpathy-skills --skill karpathy-guidelines --agent codex --global --yes
npx -y skills@latest add emilkowalski/skills --skill apple-design --agent codex --global --yes
```

설치 후 Codex를 완전히 닫았다가 다시 열거나 새 대화를 시작합니다.

### 설치 확인

```powershell
npx -y skills@latest list
```

목록에서 다음 두 이름을 찾습니다.

```text
karpathy-guidelines
apple-design
```

## 3. 스킬 사용법

스킬은 요청 내용이 설명과 일치하면 자동으로 선택될 수 있습니다. 확실하게 적용하려면 프롬프트에 스킬 이름을 직접 적습니다.

### karpathy-guidelines

복잡한 구현, 불필요한 리팩터링, 확인하지 않은 가정을 줄이는 코딩 지침입니다. 핵심은 다음 네 가지입니다.

- 코딩 전에 가정과 모호한 점 확인
- 요청을 해결하는 최소 구현 선택
- 요청과 직접 관계있는 부분만 수정
- 완료 조건을 정하고 테스트로 검증

복사해서 사용할 프롬프트:

```text
karpathy-guidelines를 적용해서 이 버그를 수정해줘.
요청과 직접 관련된 파일만 수정하고, 먼저 원인과 완료 조건을 짧게 정리해줘.
수정 후에는 재현 테스트와 기존 테스트를 실행해서 결과를 알려줘.
```

### apple-design

Apple의 디자인 발표에서 정리한 인터페이스·모션 원칙을 웹에 적용하는 스킬입니다. 제스처, 스프링, 드래그, 시트, 반투명 소재, 타이포그래피와 `prefers-reduced-motion` 같은 접근성을 다룰 때 유용합니다.

복사해서 사용할 프롬프트:

```text
apple-design을 적용해서 현재 드로어 인터랙션을 검토해줘.
즉시 피드백, 1:1 드래그 추적, 중단 가능한 애니메이션, 속도 전달,
reduced-motion 대응을 확인하고 필요한 부분만 수정해줘.
```

두 스킬을 함께 사용할 수도 있습니다.

```text
karpathy-guidelines와 apple-design을 함께 적용해줘.
현재 컴포넌트 범위를 벗어나지 말고, Apple식 모션 원칙에 필요한 최소 변경만 구현한 뒤 검증해줘.
```

## 4. TalkToFigma 설치

TalkToFigma는 다음 세 부분으로 동작합니다.

1. Codex가 실행하는 MCP 서버
2. 로컬 통신을 중계하는 WebSocket 서버
3. Figma 안에서 명령을 실행하는 Community 플러그인

### 4-1. Bun 설치

TalkToFigma 실행에는 Bun이 필요합니다. PowerShell에서 다음 명령을 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://bun.sh/install.ps1 | iex"
```

PowerShell을 닫았다가 다시 열고 설치를 확인합니다.

```powershell
bun --version
bunx --version
```

### 4-2. TalkToFigma를 Codex에 등록

다음 명령은 현재 PC의 `bunx.exe` 경로를 찾아 Codex MCP 설정에 저장합니다.

```powershell
$bunxPath = (Get-Command bunx).Source
codex mcp add TalkToFigma -- $bunxPath cursor-talk-to-figma-mcp@latest
codex mcp list
```

`codex mcp list` 결과에 다음 항목이 보이면 등록이 끝난 것입니다.

```text
TalkToFigma    enabled
```

이미 같은 이름이 등록되어 있다는 오류가 나오면 기존 설정이 있는 것입니다. 정상 작동 중이라면 이 단계를 건너뜁니다.

### 4-3. Figma 플러그인 설치

1. [Cursor Talk to Figma MCP Plugin](https://www.figma.com/community/plugin/1485687494525374295/cursor-talk-to-figma-mcp-plugin) 페이지를 엽니다.
2. Figma 계정에 플러그인을 설치합니다.
3. Figma Desktop에서 작업할 디자인 파일을 엽니다.
4. 플러그인 메뉴에서 `Cursor Talk to Figma MCP Plugin`을 실행합니다.

## 5. 매일 사용하는 순서

### 1단계: 로컬 중계 서버 실행

새 PowerShell 창에서 다음 명령을 실행하고 창을 계속 열어 둡니다.

```powershell
bunx cursor-talk-to-figma-socket@latest
```

정상 실행되면 다음과 비슷한 문구가 표시됩니다.

```text
WebSocket server running on port 3055
```

### 2단계: Figma 플러그인 연결

1. Figma 파일에서 TalkToFigma 플러그인을 실행합니다.
2. 포트가 `3055`인지 확인합니다.
3. `Connect`를 누릅니다.
4. 화면에 표시되는 8자리 채널 이름을 복사합니다.

플러그인을 다시 연결하면 채널 이름도 바뀔 수 있으므로 매번 현재 값을 사용합니다.

### 3단계: Codex 연결

TalkToFigma를 처음 등록한 직후라면 Codex를 다시 시작합니다. 그다음 채널 이름을 넣어 아래 프롬프트를 복사합니다.

```text
TalkToFigma의 join_channel 도구로 채널 CHANNEL_NAME에 연결해줘.
연결 후 get_document_info로 현재 문서를 읽고 get_selection으로 현재 선택을 확인해줘.
아직 Figma 파일은 수정하지 마.
```

`CHANNEL_NAME`을 Figma 플러그인에 표시된 실제 값으로 바꿉니다.

### 4단계: 선택 영역 작업 요청

처음에는 수정 범위를 명확하게 제한하는 것이 안전합니다.

```text
현재 Figma에서 선택한 프레임만 대상으로 작업해줘.
먼저 read_my_design으로 구조를 읽고 변경 계획을 3줄 이내로 알려줘.
내가 요청한 요소만 수정하고 선택 영역 밖의 노드는 이동하거나 삭제하지 마.
수정 후 get_node_info로 결과를 검증해줘.
```

## 6. 추천 작업 순서

TalkToFigma에서는 다음 순서를 지키면 실수를 줄일 수 있습니다.

```text
join_channel
→ get_document_info
→ get_selection 또는 read_my_design
→ 필요한 생성·수정 도구
→ get_node_info로 결과 확인
```

예시 요청:

```text
현재 선택한 로그인 프레임을 읽어줘.
버튼 텍스트를 "시작하기"로 바꾸고 버튼 모서리를 12px로 설정해줘.
다른 노드는 수정하지 말고 완료 후 변경된 노드 정보를 다시 확인해줘.
```

## 7. 문제 해결

### `bunx` 명령을 찾을 수 없음

PowerShell을 다시 연 뒤 확인합니다.

```powershell
Get-Command bun
Get-Command bunx
```

그래도 나오지 않으면 Bun을 다시 설치합니다.

### Figma 플러그인이 연결되지 않음

3055 포트가 열려 있는지 확인합니다.

```powershell
Test-NetConnection -ComputerName localhost -Port 3055
```

`TcpTestSucceeded : True`가 아니면 `bunx cursor-talk-to-figma-socket@latest`가 실행 중인지 확인합니다.

### Codex에서 TalkToFigma 도구가 보이지 않음

```powershell
codex mcp list
```

`TalkToFigma`가 없으면 4-2의 등록 명령을 다시 실행합니다. 등록되어 있지만 사용할 수 없다면 Codex를 완전히 종료한 후 다시 실행합니다.

### `join_channel`이 실패하거나 시간 초과됨

다음 세 가지를 순서대로 확인합니다.

1. WebSocket 서버 터미널이 계속 실행 중인지 확인
2. Figma 플러그인 상태가 `Connected`인지 확인
3. 프롬프트의 채널 이름이 플러그인에 표시된 현재 채널과 같은지 확인

## 8. 안전하게 사용하는 규칙

- 중요한 Figma 파일은 먼저 사본을 만들어 작업합니다.
- 첫 요청은 항상 읽기 전용으로 시작합니다.
- 수정할 프레임을 Figma에서 직접 선택하고 범위를 프롬프트에 명시합니다.
- `delete_node`나 대량 변경은 노드 목록을 먼저 확인한 뒤 실행합니다.
- TalkToFigma Community 플러그인은 Google Analytics로 익명 사용 통계를 전송한다고 안내합니다. 플러그인 설명상 파일 내용이나 개인정보는 수집하지 않지만, 회사 정책상 외부 분석 전송이 허용되는지 먼저 확인합니다.

## 9. 원본과 참고 자료

- [Codex Skills 개념](https://developers.openai.com/plugins/concepts/skills)
- [skills CLI 원본](https://github.com/vercel-labs/skills)
- [karpathy-guidelines 원본](https://github.com/forrestchang/andrej-karpathy-skills/tree/main/skills/karpathy-guidelines)
- [apple-design 원본](https://github.com/emilkowalski/skills/tree/main/skills/apple-design)
- [TalkToFigma 원본](https://github.com/grab/cursor-talk-to-figma-mcp)
- [TalkToFigma Figma Community 플러그인](https://www.figma.com/community/plugin/1485687494525374295/cursor-talk-to-figma-mcp-plugin)
- [Codex MCP 안내](https://learn.chatgpt.com/docs/extend/mcp)

확인 시점의 npm 최신 버전은 `cursor-talk-to-figma-mcp@0.3.5`와 `cursor-talk-to-figma-socket@0.3.5`였습니다. 문서의 `@latest`는 설치 시점의 최신 버전을 사용합니다.
