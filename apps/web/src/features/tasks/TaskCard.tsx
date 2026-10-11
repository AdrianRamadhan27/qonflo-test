import { NEXT_STATUS, STATUS_LABELS } from '@taskline/shared';
import { useDraggable } from '@dnd-kit/core';
import type { Actor, Task } from '@taskline/shared';
import { Icon } from '../../components/Icon';

interface TaskCardProps {
  task: Task;
  actors: Actor[];
  busy: boolean;
  actionsDisabled: boolean;
  onOpen: () => void;
  onAdvance: () => void;
  onDelete: () => void;
}

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export function TaskCard({
  task,
  actors,
  busy,
  actionsDisabled,
  onOpen,
  onAdvance,
  onDelete,
}: TaskCardProps) {
  const nextStatus = NEXT_STATUS[task.status];
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: actionsDisabled || Boolean(task.deletedAt) || !nextStatus,
  });
  const actor = actors.find((person) => person.id === task.updatedBy)?.name ?? task.updatedBy;
  const timestamp = task.deletedAt ?? task.updatedAt;
  const initials = actor
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('');

  return (
    <li className="task-card" ref={setNodeRef} data-dragging={isDragging}>
      {nextStatus && !task.deletedAt ? (
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="icon-button drag-handle"
          {...attributes}
          {...listeners}
          aria-label={'Drag ' + task.title + ' to ' + STATUS_LABELS[nextStatus]}
          disabled={actionsDisabled}
        >
          <Icon name="grip" />
        </button>
      ) : null}
      <button
        type="button"
        className="card-open"
        {...listeners}
        onClick={onOpen}
        aria-label={'View history for ' + task.title}
      >
        <span className="card-title">{task.title}</span>
        {task.description ? <span className="card-description">{task.description}</span> : null}
        <span className="card-history-link">
          <Icon name="history" /> View history
        </span>
      </button>
      <div className="card-meta">
        <span
          className="card-person"
          title={(task.deletedAt ? 'Deleted by ' : 'Updated by ') + actor}
        >
          <span className="avatar avatar-small" aria-hidden="true">
            {initials}
          </span>
          <span>{actor}</span>
        </span>
        <time dateTime={timestamp}>{shortDate.format(new Date(timestamp))}</time>
      </div>
      {!task.deletedAt ? (
        <div className="card-actions">
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
            <span className="card-complete">
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
      ) : (
        <span className="card-deleted-label">Deleted · history retained</span>
      )}
    </li>
  );
}
