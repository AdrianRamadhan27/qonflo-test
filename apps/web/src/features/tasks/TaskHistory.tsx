import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Actor, ActorId, Task } from '@taskline/shared';
import { errorMessage, taskApi } from '../../api/client';
import { Icon } from '../../components/Icon';
import { StatusBadge } from './StatusBadge';
import { StatusProgress } from './StatusProgress';

const fullDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

function HistoryEvent({
  actor,
  timestamp,
  children,
}: {
  actor: string;
  timestamp: string;
  children: ReactNode;
}) {
  const initials = actor
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('');
  return (
    <li className="history-event">
      <span className="avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="history-event-body">
        <p>
          <strong>{actor}</strong> {children}
        </p>
        <time dateTime={timestamp}>{fullDate.format(new Date(timestamp))}</time>
      </div>
    </li>
  );
}

export function TaskHistory({ task, actors }: { task: Task; actors: Actor[] }) {
  const query = useQuery({
    queryKey: ['history', task.id],
    queryFn: ({ signal }) => taskApi.history(task.id, signal),
  });
  const snapshot = query.data?.task ?? task;
  const logs = query.data?.logs ?? [];
  const nameOf = (id: ActorId) => actors.find((actor) => actor.id === id)?.name ?? id;

  return (
    <div className="task-history" aria-busy={query.isFetching}>
      <div className="history-summary">
        <StatusBadge status={snapshot.status} />
        {snapshot.deletedAt ? <span className="deleted-badge">Deleted</span> : null}
        <h2>{snapshot.title}</h2>
        {snapshot.description ? <p>{snapshot.description}</p> : null}
      </div>
      <StatusProgress status={snapshot.status} />
      <div className="history-section-heading">
        <h3>Activity</h3>
        <span>Oldest first</span>
      </div>
      {query.isPending ? (
        <p className="history-loading" role="status">
          Loading history…
        </p>
      ) : null}
      {query.isError ? (
        <div className="history-error" role="alert">
          <p>{errorMessage(query.error)}</p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              void query.refetch();
            }}
          >
            Try again
          </button>
        </div>
      ) : null}
      {query.data ? (
        <>
          <ol className="audit-timeline" aria-label="Task activity">
            <HistoryEvent actor={nameOf(snapshot.createdBy)} timestamp={snapshot.createdAt}>
              created the task.
            </HistoryEvent>
            {logs.map((log) => (
              <HistoryEvent key={log.id} actor={nameOf(log.actorId)} timestamp={log.changedAt}>
                changed the status.
                <span className="status-change">
                  <StatusBadge status={log.fromStatus} />
                  <Icon name="arrow" />
                  <StatusBadge status={log.toStatus} />
                </span>
              </HistoryEvent>
            ))}
            {snapshot.deletedAt ? (
              <HistoryEvent actor={nameOf(snapshot.updatedBy)} timestamp={snapshot.deletedAt}>
                deleted the task. Its history is retained.
              </HistoryEvent>
            ) : null}
          </ol>
          {logs.length === 0 ? (
            <p className="history-empty">
              No status changes yet. Moving this task forward will record who changed it.
            </p>
          ) : null}
          <div className="history-footer">
            <span>
              {logs.length} status {logs.length === 1 ? 'change' : 'changes'}
            </span>
            <span>Times in {timeZone}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
