import type { ChildNewsDraft } from "./contracts";

export const MAX_VISIBLE_TERM_TREATMENTS = 3;

export function selectVisibleTermTreatments(draft: ChildNewsDraft) {
  const visibleText = [
    draft.headline.text,
    ...draft.body.map((line) => line.text),
    draft.priceConnection.text,
  ].join("\n").normalize("NFKC");

  return draft.termTreatments
    .map((treatment, index) => ({
      treatment,
      index,
      position: visibleText.indexOf(treatment.term.normalize("NFKC")),
    }))
    .filter((item) => item.position >= 0)
    .sort((left, right) => left.position - right.position || left.index - right.index)
    .slice(0, MAX_VISIBLE_TERM_TREATMENTS)
    .map((item) => item.treatment);
}
