/**
 * 3줄 요약 결함 판정. DB 도 네트워크도 건드리지 않는 순수 함수다.
 *
 * 2026-08-16 첫 100건 전수 검사에서 96건이 걸렸다. 숫자를 지어낸 것은 1건뿐이었고
 * 나머지는 전부 "사실이지만 아무것도 알려 주지 않는" 요약이었다. 검수자가 그걸 못 잡은
 * 이유는 `distinct_summary_facts` 를 **fact key** 로 비교했기 때문이다 — 한 문장을 둘로
 * 쪼개도 fact key 만 다르면 통과했다. 여기서는 **인용한 근거 id** 로 판정한다.
 */

export type AuditInput = {
  headline: string;
  lines: readonly string[];
  /** 줄 번호(1·2·3) → 인용한 근거 id 목록. */
  citations: Readonly<Record<number, readonly string[]>>;
  /** 근거 id → 원문 문장. */
  sourceUnits: Readonly<Record<string, string>>;
};

export type Issue = {
  kind: "근거공유" | "이유없음" | "이름사장" | "제목반복" | "빈줄" | "숫자무근거";
  severity: 1 | 2 | 3;
  detail: string;
};

/** 공백·쉼표를 지워 "1조 4,009억" 과 "1조4009억" 을 같게 본다. */
const norm = (value: string) => value.replace(/[\s,]/g, "");
const numbers = (value: string) => [...norm(value).matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]);
/** 따옴표로 묶인 고유명사 — 게임·제품·프로젝트 이름이 여기 들어온다. */
const propers = (value: string) =>
  [...value.matchAll(/['"‘“]([^'"’”]{2,40})[’”'"]/g)].map((m) => m[1]);

/** 원인·배경을 말하는 문장인지. 없는 이유를 지어내게 하지 않으려고 원문에서만 찾는다. */
const CAUSE = /때문|덕분|영향|효과|이유|배경|위해|하려|필요성|늘리|줄이|출시한|업데이트|성과|판단/;

/** 단위를 세는 수관형사. "1년"·"1위" 의 1 은 원문에 없어도 지어낸 값이 아니다. */
const COUNTER = /^1(?:년|위|개월|주일|번|차|등)/;

export function auditSummary(input: AuditInput): Issue[] {
  const { headline, lines, citations, sourceUnits } = input;
  const issues: Issue[] = [];
  const allSource = Object.values(sourceUnits).join(" ");

  // 줄의 숫자가 근거 어디에도 없다 — 유일하게 "거짓" 인 결함이라 가장 무겁다.
  const ungrounded: string[] = [];
  lines.forEach((line, index) => {
    const cited = (citations[index + 1] ?? []).map((id) => sourceUnits[id] ?? "").join(" ");
    for (const value of numbers(line)) {
      const counted = COUNTER.test(norm(line).slice(norm(line).indexOf(value)));
      if (counted) continue;
      if (!norm(cited).includes(value) && !norm(allSource).includes(value)) {
        ungrounded.push(`${index + 1}번줄 "${value}"`);
      }
    }
  });
  if (ungrounded.length) {
    issues.push({ kind: "숫자무근거", severity: 3, detail: ungrounded.join(", ") });
  }

  // 두 줄이 같은 근거를 쪼개 썼다. 한 문장의 대비가 갈리면 한쪽만 읽힌다.
  const shared: string[] = [];
  for (const [a, b] of [[1, 2], [1, 3], [2, 3]] as const) {
    for (const id of citations[a] ?? []) {
      if ((citations[b] ?? []).includes(id)) shared.push(`${a}·${b}줄이 ${id} 공유`);
    }
  }
  if (shared.length) issues.push({ kind: "근거공유", severity: 2, detail: shared.join(", ") });

  // 근거에 원인이 아예 없다 — 편집이 아니라 선별 단계의 결함이다.
  if (!CAUSE.test(allSource)) {
    issues.push({ kind: "이유없음", severity: 2, detail: "근거 문장에 원인·배경이 없다" });
  }

  // 근거에 고유명사가 있는데 세 줄이 전부 뭉갰다.
  const inSource = [...new Set(propers(allSource))];
  const joined = lines.join(" ");
  if (inSource.length > 0 && inSource.every((name) => !joined.includes(name))) {
    issues.push({ kind: "이름사장", severity: 2, detail: inSource.slice(0, 5).join(", ") });
  }

  // 제목이 이미 말한 수치를 되풀이하는 줄은 버린 줄이다.
  const headNumbers = new Set(numbers(headline));
  const echoed = lines
    .map((line, index) => ({ index: index + 1, dup: numbers(line).filter((n) => headNumbers.has(n)) }))
    .filter((x) => x.dup.length > 0)
    .map((x) => `${x.index}번줄 ${x.dup.join("·")}`);
  if (echoed.length) issues.push({ kind: "제목반복", severity: 1, detail: echoed.join(", ") });

  // 14자 이하면 정보가 실리지 않는다.
  const thin = lines
    .map((line, index) => ({ index: index + 1, length: line.length }))
    .filter((x) => x.length <= 14)
    .map((x) => `${x.index}번줄 ${x.length}자`);
  if (thin.length) issues.push({ kind: "빈줄", severity: 1, detail: thin.join(", ") });

  return issues;
}

export const severityOf = (issues: readonly Issue[]) =>
  issues.reduce((sum, issue) => sum + issue.severity, 0);
