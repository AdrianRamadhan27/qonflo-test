import { NEXT_STATUS, STATUS_LABELS } from '@taskline/shared';
import type { Actor, Task } from '@taskline/shared';
import { Icon } from '../../components/Icon';
import { StatusBadge } from './StatusBadge';

interface TaskRowProps {
  task: Task;
  actors: Actor[];
  selected: boolean;
  busy: boolean;
  actionsDisabled: boolean;
  onSelect: () => void;
  onAdvance: () => void;
  onDelete: () => void;
}

const shortDate = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function TaskRow({
  task,
  actors,
  selected,
  busy,
  actionsDisabled,
  onSelect,
  onAdvance,
  onDelete,
}: TaskRowProps) {
  const nextStatus = NEXT_STATUS[task.status];
  const actor = actors.find((person) => person.id === task.updatedBy)?.name ?? task.updatedBy;
  const timestamp = task.deletedAt ?? task.updatedAt;

  return (
    <li className={'task-row' + (selected ? ' task-row-selected' : '')}>
      <button
        type="button"
        className="task-select"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={'View history for ' + task.title}
      >
        <span className={'task-marker marker-' + task.status} aria-hidden="true">
          {task.status === 'done' ? <Icon name="check" /> : <span />}
        </span>
        <span className="task-copy">
          <span className="task-title">{task.title}</span>
          {task.description ? <span className="task-description">{task.description}</span> : null}
          <span className="task-meta">
            {task.deletedAt ? 'Deleted by ' : 'Updated by '}
            {actor}
            <span aria-hidden="true"> · </span>
            <time dateTime={timestamp}>{shortDate.format(new Date(timestamp))}</time>
          </span>
        </span>
      </button>
      <div className="task-actions">
        <StatusBadge status={task.status} />
        {!task.deletedAt ? (
          <div className="task-action-buttons">
            {nextStatus ? (
              <button
                type="button"
                className="button button-next"
                disabled={actionsDisabled}
                onClick={onAdvance}
              >
                {busy ? 'Updating…' : 'Move to ' + STATUS_LABELS[nextStatus]}
                <Icon name="arrow" />
              </button>
            ) : (
              <span className="task-complete">
                <Icon name="check" /> Complete
              </span>
            )}
            <button
              type="button"
              className="icon-button delete-button"
              aria-label={'Delete ' + task.title}
              disabled={actionsDisabled}
              onClick={onDelete}
            >
              <Icon name="trash" />
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
