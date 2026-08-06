import type { ProposalStatus } from '@/lib/brokerage/types';

const STYLE: Record<ProposalStatus, { label: string; className: string }> = {
  pending: { label: '기다리는 중', className: 'bg-neutral-100 text-neutral-600' },
  approved: { label: '승인됨', className: 'bg-red-50 text-red-600' },
  rejected: { label: '다음에', className: 'bg-blue-50 text-blue-600' },
};

export function StatusBadge({ status }: { status: ProposalStatus }) {
  const { label, className } = STYLE[status];
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
