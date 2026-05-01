import { STATUS_LABELS } from '../types';

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge-${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}
