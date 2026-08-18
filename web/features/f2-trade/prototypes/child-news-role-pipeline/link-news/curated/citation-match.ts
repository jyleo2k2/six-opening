/**
 * 대표 검수를 통과한 카드 문안을 **원문 근거 문장에 다시 묶는다**. DB 도 네트워크도 안 건드린다.
 *
 * 왜 다시 묶어야 하나. 카드 문안(`curated-cards-2026-08-18.json`)은 사람이 쓴 최종본이라
 * 근거 id 가 없다. 그런데 스키마는 노출 필드마다 인용을 요구하고(`news_citations`),
 * 게시 상태로 올릴 때 트리거가 그 인용이 **선별된** 근거를 가리키는지 다시 본다.
 * 인용 없이 넣을 방법은 없고, 넣어서도 안 된다 — 인용이 곧 "이 문장이 어디서 왔나" 다.
 *
 * 판정은 두 가지만 본다. 지어낸 사실을 잡아내는 건 `scripts/news-audit-rules.ts` 의 일이고
 * 여기서는 **가장 잘 뒷받침하는 문장을 고르는 것**까지만 한다.
 *
 * - 숫자가 겹치면 강하게 본다. "14조7906억원" 이 함께 있으면 그 문장이 근거일 가능성이 높다.
 * - 두 글자 이상 낱말이 겹치면 약하게 본다. 숫자가 없는 줄은 이것으로만 고른다.
 *
 * 세 줄이 같은 문장을 인용하면 2026-08-16 전수 검사에서 33건이 걸린 "한 문장을 쪼갠 두 줄"
 * 이 된다. 그래서 이미 쓴 문장은 뒤로 미루고, 다른 후보가 하나도 없을 때만 다시 쓴다.
 */

export type SourceUnitLike = { id: string; text: string };

/** 공백·쉼표를 지워 "1조 4,009억" 과 "1조4009억" 을 같게 본다. 낱말을 찾을 때 쓴다. */
const normalize = (value: string) => value.normalize("NFKC").replace(/[\s,]/gu, "");

/**
 * 숫자를 읽기 전에 표기를 맞춘다. **공백은 지우지 않는다.**
 *
 * 공백까지 지우면 "빌보드 200 1위" 가 "빌보드2001위" 가 되어 없는 숫자 `2001` 이 생긴다
 * (JYP 실측). 쉼표만 지우면 "14조 7,906억" 과 "14조7906억" 은 여전히 같게 읽힌다.
 *
 * `1천`·`3백` 은 자릿수로 펴 준다. 기사는 "약 9만 1천 명" 이라 쓰고 카드는 "9만1000명" 이라
 * 쓰는데, 펴 주지 않으면 같은 값을 지어낸 숫자로 잡는다(LG생활건강·현대글로비스 실측).
 */
function numeralForm(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/,/gu, "")
    .replace(/(\d+)\s*천/gu, (_, digits: string) => `${digits}000`)
    .replace(/(\d+)\s*백/gu, (_, digits: string) => `${digits}00`);
}

export function numbersIn(value: string): string[] {
  return [...numeralForm(value).matchAll(/\d+(?:\.\d+)?/gu)].map((match) => match[0]);
}

/**
 * 두 글자 이상의 한글·영문·숫자 덩어리만 센다. 조사 한 글자가 겹쳤다고 근거가 되지는 않는다.
 */
export function tokensIn(value: string): string[] {
  return [...value.normalize("NFKC").matchAll(/[가-힣A-Za-z0-9]{2,}/gu)].map((match) =>
    match[0].toLowerCase(),
  );
}

/**
 * 낱말이 문장 안에 있는지 본다. **붙여 쓴 조사·어미를 떼면서** 본다.
 *
 * 낱말끼리 통째로 맞추면 한국어에서는 거의 안 맞는다. `가격도`와 `가격`, `시간대를`과
 * `시간대`, `선택`과 `선택의`가 전부 다른 낱말이 되기 때문이다. 실측에서 SK하이닉스와
 * 대한항공이 이것 때문에 "근거 없음" 으로 떨어졌다 — 원문에는 분명히 있는 사실이었다.
 *
 * 그래서 앞에서부터 두 글자까지 줄여 가며 찾는다. 한국어 명사는 대개 두 글자라 이 선에서
 * 멈추면 뜻이 남고, 문장 쪽은 자르지 않고 그대로 훑으므로 `선택` 이 `선택의` 안에서 잡힌다.
 */
function longestPrefixHit(token: string, haystack: string): number {
  for (let length = token.length; length >= 2; length -= 1) {
    if (haystack.includes(token.slice(0, length))) return length;
  }
  return 0;
}

/**
 * 한 줄이 한 근거 문장에 얼마나 기대고 있는지. 큰 숫자일수록 우연히 겹치기 어려워 더 준다.
 *
 * 여기서는 **점수만** 매긴다. "이 줄이 원문에 있는 사실인가" 는 낱말 겹침으로 셀 수 없다 —
 * 조사를 떼고 보기 시작하면 흔한 말이 어디서나 걸리기 때문이다. 그 판정은 숫자로 하는
 * `ungroundedNumbers` 가 맡는다. 둘을 섞으면 원문에 있는 사실을 "근거 없음" 으로 떨어뜨리거나
 * (SK하이닉스·대한항공 실측) 원문에 없는 숫자를 아무 문장에나 붙이게 된다(에스엠 실측).
 */
export function supportScore(line: string, unitText: string): number {
  const unitPlain = normalize(unitText).toLowerCase();
  const unitNumbers = new Set(numbersIn(unitText));

  let score = 0;
  for (const value of new Set(numbersIn(line))) {
    if (unitNumbers.has(value)) score += 8 + value.replace(".", "").length;
  }
  for (const token of new Set(tokensIn(line))) {
    // 숫자만으로 된 토큰은 위에서 이미 셌다.
    if (/^\d+$/u.test(token)) continue;
    const hit = longestPrefixHit(token, unitPlain);
    // 통째로 맞은 낱말을 조사를 떼고 맞은 낱말보다 높게 본다.
    if (hit > 0) score += hit === token.length ? 2 : 1;
  }
  return score;
}

/** "1년"·"1위" 의 1 은 원문에 없어도 지어낸 값이 아니다. `news-audit-rules.ts` 와 같은 규칙이다. */
const COUNTER = /^1(?:년|위|개월|주일|번|차|등)/u;

/**
 * 줄에 쓴 숫자 중 **기사 어디에도 없는** 것. 하나라도 있으면 그 줄은 지어낸 사실을 담고 있다.
 *
 * 이것이 실제 근거 판정이다. 2026-08-16 전수 검사에서 유일하게 "거짓" 이었던 결함이고,
 * 사람이 쓴 문안을 원문에 다시 묶을 때도 같은 잣대를 쓴다. 에스엠(529억원·11%)과
 * LG생활건강(충청 32개교·5000명)이 여기서 걸렸다 — 그 기사에 없는 숫자였다.
 */
/**
 * 마지막 자리만 1 다른 같은 자릿수 숫자가 원문에 있으면 반올림으로 본다.
 *
 * 달바글로벌 기사는 "1868억 6100만 원" 이라 쓰고 카드는 "1869억원" 이라 썼다. 아이가 읽는
 * 글에서 억 단위 아래를 버리는 건 지어낸 것이 아니라 **줄여 쓴 것**이다. 반대로 BGF리테일은
 * 기사가 "2조4000억원" 인데 카드가 "2조4268억원" 이라 더 정밀하다 — 그 값은 이 기사에
 * 없으므로 걸러야 한다. 그래서 한 자리 차이까지만 허용한다.
 */
function isRoundingOf(value: string, articleNumbers: readonly string[]): boolean {
  if (value.includes(".")) return false;
  const target = Number(value);
  return articleNumbers.some((candidate) => {
    const source = Number(candidate);
    // 소수를 정수로 반올림한 경우. 기사 "75.7%" → 카드 "76%" (달바글로벌).
    if (candidate.includes(".")) return Math.abs(source - target) < 1;
    // 아랫자리를 버린 경우. 기사 "1868억 6100만" → 카드 "1869억" (달바글로벌).
    // 두 자리 이하에서 한 자리 차이는 너무 흔하다 — 대한항공의 "17일" 이 기사의 "16일" 에
    // 붙어 통과하던 자리다. 날짜는 반올림하지 않는다.
    return (
      value.length >= 3 && candidate.length === value.length && Math.abs(source - target) <= 1
    );
  });
}

export function ungroundedNumbers(line: string, articleText: string): string[] {
  const haystack = numeralForm(articleText);
  const articleNumbers = numbersIn(articleText);
  const plainLine = normalize(line);
  return numbersIn(line).filter((value) => {
    if (haystack.includes(value)) return false;
    if (isRoundingOf(value, articleNumbers)) return false;
    return !COUNTER.test(plainLine.slice(plainLine.indexOf(value)));
  });
}

export type CitationChoice = { sourceIds: string[]; score: number };

/**
 * 한 줄이 인용할 근거를 고른다. `avoid` 는 같은 카드의 다른 줄이 이미 쓴 근거다.
 *
 * 겹치지 않는 후보 중 최고점을 먼저 보고, 그런 후보가 없을 때만 `avoid` 를 푼다.
 * 근거가 하나뿐인 짧은 기사에서 줄을 못 만드는 쪽이 더 나쁘다.
 */
export function chooseCitation(
  line: string,
  units: readonly SourceUnitLike[],
  avoid: ReadonlySet<string> = new Set(),
): CitationChoice | null {
  const scored = units
    .map((unit) => ({ id: unit.id, score: supportScore(line, unit.text) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
  if (scored.length === 0) return null;

  const fresh = scored.find((item) => !avoid.has(item.id));
  const picked = fresh ?? scored[0];
  return { sourceIds: [picked.id], score: picked.score };
}

/**
 * 용어 풀이가 가리킬 근거. 낱말이 그대로 들어 있는 문장을 먼저 찾고, 없으면 그 낱말을 쓴
 * 줄이 인용한 근거를 빌린다. DB 는 `sourceIds` 가 비면 게시물을 받지 않는다.
 */
export function chooseTermCitation(
  term: string,
  units: readonly SourceUnitLike[],
  fallbackSourceId: string,
): string[] {
  const needle = term.normalize("NFKC");
  const direct = units.filter((unit) => unit.text.normalize("NFKC").includes(needle));
  if (direct.length > 0) return direct.slice(0, 3).map((unit) => unit.id);

  const scored = chooseCitation(term, units);
  return scored ? scored.sourceIds : [fallbackSourceId];
}

/**
 * 줄마다 붙일 `factKey`. 서로 달라야 하고(`distinctSummaryFacts`) snake_case 여야 한다.
 *
 * 기존 게시물은 `operating_profit_amount` 처럼 뜻이 담긴 이름을 쓴다. 한글 문장에서 그런
 * 이름을 자동으로 만들 수는 없으므로 자주 나오는 말만 표로 두고, 못 찾으면 줄 번호로 떨어뜨린다.
 * 거짓을 만들지 않으면서 사람이 읽을 수 있는 선이다.
 */
const FACT_KEY_HINTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/영업이익/u, "operating_profit"],
  [/순이익/u, "net_income"],
  [/매출/u, "revenue"],
  [/배당/u, "dividend"],
  [/지분|주주/u, "ownership_stake"],
  [/시가총액|시총/u, "market_cap"],
  [/공장|생산기지|설비|증설/u, "facility"],
  [/투자|시설투자/u, "investment"],
  [/수주|계약|협약|제휴/u, "contract"],
  [/판매|출하|이용자|가입/u, "sales_volume"],
  [/수출|해외/u, "overseas"],
  [/합병|통합|인수/u, "combination"],
  [/연구|개발|기술|R&D/iu, "research"],
  [/가격|요금|환율/u, "price_level"],
  [/점유율|비중/u, "share_ratio"],
  [/목표|계획|추진|검토/u, "plan"],
];

export function factKeysFor(lines: readonly string[]): string[] {
  const used = new Set<string>();
  return lines.map((line, index) => {
    const hint = FACT_KEY_HINTS.find(([pattern]) => pattern.test(line));
    const base = hint ? hint[1] : "curated_fact";
    const key = used.has(base) ? `${base}_line_${index + 1}` : base;
    used.add(key);
    return key;
  });
}
