import type { Account, Proposal, ProposalInput, ProposalStatus } from './types';

/**
 * 증권 연동의 **유일한 경계**.
 *
 * 시연에서는 mock 어댑터가 (b) 시나리오를 재현한다 — 자녀는 조회·제안만 하고
 * 주문은 부모가 영웅문에서 직접 낸다. 실서비스로 가면 kiwoom 어댑터를 구현해
 * 여기에 끼우기만 하면 되고, 화면 코드는 바뀌지 않는다.
 *
 * ⚠ 이 인터페이스에 placeOrder를 추가하지 말 것.
 *   앱이 주문을 내는 순간 (b) 범위를 벗어나고, 앱이 종목을 권유하는 구조가 되어
 *   투자권유 규제에 걸린다(기술스택 §9). 추천 주체는 항상 자녀, 실행 주체는 항상 부모다.
 */
export interface BrokeragePort {
  getAccount(childId: string): Promise<Account>;

  listProposals(childId: string): Promise<Proposal[]>;
  /** 부모 인박스 — 여러 자녀의 제안을 모아본다 */
  listInbox(parentId: string): Promise<Proposal[]>;

  submitProposal(input: ProposalInput): Promise<Proposal>;
  decideProposal(id: string, status: ProposalStatus, parentNote?: string): Promise<Proposal>;
}
