import { STATUS_LABELS, TASK_STATUSES } from '@taskline/shared';
import type { TaskStatus } from '@taskline/shared';
import { Icon } from '../../components/Icon';

export function StatusProgress({ status }: { status: TaskStatus }) {
  const current = TASK_STATUSES.indexOf(status);
  return (
    <ol className="status-path" aria-label="Status progression">
      {TASK_STATUSES.map((step, index) => (
        <li
          key={step}
          className={index <= current ? 'step-reached' : ''}
          aria-current={index === current ? 'step' : undefined}
        >
          <span className="step-number">{index < current ? <Icon name="check" /> : index + 1}</span>
          <span className="step-label">{STATUS_LABELS[step]}</span>
        </li>
      ))}
    </ol>
  );
}
