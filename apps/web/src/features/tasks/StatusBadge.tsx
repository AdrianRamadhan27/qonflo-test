import { STATUS_LABELS } from '@taskline/shared';
import type { TaskStatus } from '@taskline/shared';

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={'status-badge status-' + status}>
      <span className="status-dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
