import type { BrokeragePort } from '../port';
import type { Account, Proposal, ProposalInput, ProposalStatus } from '../types';
import { CHILD_ACCOUNT, SEED_PROPOSALS } from './fixtures';

/**
 * 시연용 mock 어댑터 — 메모리 저장. 프로세스가 죽으면 초기화된다.
 * Supabase를 붙일 때 이 클래스만 갈아끼운다.
 */
class MockBrokerage implements BrokeragePort {
  private proposals: Proposal[] = [...SEED_PROPOSALS];

  async getAccount(childId: string): Promise<Account> {
    if (childId !== CHILD_ACCOUNT.id) throw new Error(`알 수 없는 계좌: ${childId}`);
    return structuredClone(CHILD_ACCOUNT);
  }

  async listProposals(childId: string): Promise<Proposal[]> {
    return this.proposals
      .filter((p) => p.childId === childId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listInbox(_parentId: string): Promise<Proposal[]> {
    // mock에서는 자녀가 한 명이라 전부 돌려준다. 실구현에서는 parentId로 자녀를 조회한다.
    return [...this.proposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async submitProposal(input: ProposalInput): Promise<Proposal> {
    const proposal: Proposal = {
      id: `prop-${String(this.proposals.length + 1).padStart(3, '0')}`,
      childId: input.childId,
      ticker: input.ticker,
      name: input.ticker,
      qty: input.qty,
      reason: input.reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.proposals.push(proposal);
    return proposal;
  }

  async decideProposal(
    id: string,
    status: ProposalStatus,
    parentNote?: string,
  ): Promise<Proposal> {
    const proposal = this.proposals.find((p) => p.id === id);
    if (!proposal) throw new Error(`없는 제안서: ${id}`);

    proposal.status = status;
    proposal.decidedAt = new Date().toISOString();
    proposal.parentNote = parentNote;
    return proposal;
  }
}

export const brokerage: BrokeragePort = new MockBrokerage();
