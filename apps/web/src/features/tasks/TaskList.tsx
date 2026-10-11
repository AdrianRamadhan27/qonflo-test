import { STATUS_LABELS, TASK_STATUSES } from '@taskline/shared';
import type { Actor, Task, TaskStatus } from '@taskline/shared';
import { errorMessage } from '../../api/client';
import { Icon } from '../../components/Icon';
import { TaskRow } from './TaskRow';

interface TaskListProps {
  tasks: Task[];
  visibleTasks: Task[];
  actors: Actor[];
  deleted: boolean;
  filter: TaskStatus | 'all';
  hasFilters: boolean;
  pending: boolean;
  error: Error | null;
  selectedId: string | null;
  busyId: string | null;
  actionsDisabled: boolean;
  onFilter: (filter: TaskStatus | 'all') => void;
  onSelect: (id: string) => void;
  onAdvance: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRetry: () => void;
}

export function TaskList(props: TaskListProps) {
  return (
    <section
      className="task-list-panel"
      id="task-list"
      tabIndex={-1}
      aria-label={props.deleted ? 'Deleted tasks' : 'Active tasks'}
    >
      <div className="status-filters" role="group" aria-label="Filter by status">
        <button
          type="button"
          aria-pressed={props.filter === 'all'}
          onClick={() => props.onFilter('all')}
        >
          All <span>{props.tasks.length}</span>
        </button>
        {TASK_STATUSES.map((status) => (
          <button
            type="button"
            key={status}
            aria-pressed={props.filter === status}
            onClick={() => props.onFilter(status)}
          >
            <span className={'filter-dot status-' + status} aria-hidden="true" />
            {STATUS_LABELS[status]}
            <span>{props.tasks.filter((task) => task.status === status).length}</span>
          </button>
        ))}
      </div>
      {props.pending ? (
        <div className="empty-state" role="status">
          <span className="loading-line" />
          <p>Loading your tasks…</p>
        </div>
      ) : props.error ? (
        <div className="empty-state">
          <Icon name="refresh" />
          <h2>Tasks could not load</h2>
          <p role="alert">{errorMessage(props.error)}</p>
          <button type="button" className="button button-secondary" onClick={props.onRetry}>
            Try again
          </button>
        </div>
      ) : props.visibleTasks.length === 0 ? (
        <div className="empty-state">
          <Icon name={props.deleted ? 'history' : 'check'} />
          <h2>
            {props.hasFilters
              ? 'No matching tasks'
              : props.deleted
                ? 'No deleted tasks'
                : 'No active tasks'}
          </h2>
          <p>
            {props.hasFilters
              ? 'Try a different search or status filter.'
              : props.deleted
                ? 'Deleted tasks will appear here with their history intact.'
                : 'Create the first task and move it forward, one step at a time.'}
          </p>
        </div>
      ) : (
        <ul className="task-list">
          {props.visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              actors={props.actors}
              selected={task.id === props.selectedId}
              busy={props.busyId === task.id}
              actionsDisabled={props.actionsDisabled}
              onSelect={() => props.onSelect(task.id)}
              onAdvance={() => props.onAdvance(task)}
              onDelete={() => props.onDelete(task)}
            />
          ))}
        </ul>
      )}
      <div className="list-footer">
        <span>
          {props.visibleTasks.length} {props.visibleTasks.length === 1 ? 'task' : 'tasks'}
          {props.hasFilters ? ' shown' : ''}
        </span>
        <span>Newest first</span>
      </div>
    </section>
  );
}
