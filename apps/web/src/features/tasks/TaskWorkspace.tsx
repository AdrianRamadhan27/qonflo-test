import { useState } from 'react';
import { NEXT_STATUS, STATUS_LABELS } from '@taskline/shared';
import type { ActorId, Task, TaskStatus } from '@taskline/shared';
import { errorMessage } from '../../api/client';
import { Icon } from '../../components/Icon';
import { useActors, useTaskActions, useTasks } from './queries';
import { CreateTaskDialog, DeleteTaskDialog } from './TaskDialogs';
import { TaskList } from './TaskList';
import { WorkspaceHeader } from './WorkspaceHeader';

type Dialog = { kind: 'create' } | { kind: 'delete'; task: Task } | null;
type Notice = { text: string; tone: 'success' | 'error' } | null;

export function TaskWorkspace() {
  const [actorId, setActorId] = useState<ActorId>('john.doe');
  const [deleted, setDeleted] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const actorQuery = useActors();
  const taskQuery = useTasks(deleted);
  const actions = useTaskActions();

  const actors = actorQuery.data?.actors ?? [];
  const tasks = taskQuery.data?.tasks ?? [];
  const actorName = actors.find((actor) => actor.id === actorId)?.name ?? actorId;
  const searchTerm = search.trim().toLowerCase();
  const visibleTasks = tasks.filter(
    (task) =>
      (filter === 'all' || task.status === filter) &&
      (task.title + ' ' + task.description).toLowerCase().includes(searchTerm),
  );
  const selectedTask =
    visibleTasks.find((task) => task.id === selectedId) ?? visibleTasks[0] ?? null;
  const actionsDisabled =
    actorQuery.isPending ||
    actorQuery.isError ||
    actions.changeStatus.isPending ||
    actions.remove.isPending;

  function switchView(showDeleted: boolean) {
    setDeleted(showDeleted);
    setFilter('all');
    setSelectedId(null);
    setSearch('');
    setNotice(null);
  }

  function advance(task: Task) {
    const status = NEXT_STATUS[task.status];
    if (!status) return;
    setNotice(null);
    actions.changeStatus.mutate(
      { id: task.id, input: { status, actorId } },
      {
        onSuccess: ({ changed }) =>
          setNotice({
            tone: 'success',
            text: changed
              ? 'Moved “' + task.title + '” to ' + STATUS_LABELS[status] + '.'
              : 'This task already has that status. No new change was recorded.',
          }),
        onError: (error) => setNotice({ tone: 'error', text: errorMessage(error) }),
      },
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#task-list">
        Skip to tasks
      </a>
      <WorkspaceHeader
        actors={actors}
        actorId={actorId}
        disabled={actorQuery.isPending || actorQuery.isError}
        onActorChange={setActorId}
      />
      <main className="workspace">
        <div className="workspace-heading">
          <div>
            <h1>Team tasks</h1>
            <p>Keep work moving. See what changed.</p>
          </div>
          <button
            type="button"
            className="button button-primary"
            disabled={actorQuery.isPending || actorQuery.isError || actions.create.isPending}
            onClick={() => {
              actions.create.reset();
              setDialog({ kind: 'create' });
            }}
          >
            <Icon name="plus" /> New task
          </button>
        </div>
        {actorQuery.isError ? (
          <div className="notice notice-error" role="alert">
            <span>{errorMessage(actorQuery.error)}</span>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                void actorQuery.refetch();
              }}
            >
              Retry actors
            </button>
          </div>
        ) : null}
        {notice ? (
          <div
            className={'notice notice-' + notice.tone}
            role={notice.tone === 'error' ? 'alert' : 'status'}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => setNotice(null)}
            >
              <Icon name="close" />
            </button>
          </div>
        ) : null}
        <div className="workspace-toolbar">
          <div className="view-switch" role="group" aria-label="Task view">
            <button type="button" aria-pressed={!deleted} onClick={() => switchView(false)}>
              Active tasks
            </button>
            <button type="button" aria-pressed={deleted} onClick={() => switchView(true)}>
              Deleted tasks
            </button>
          </div>
          <div className="search-control">
            <Icon name="search" />
            <label className="sr-only" htmlFor="search">
              Search tasks
            </label>
            <input
              id="search"
              type="search"
              placeholder="Search tasks…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="workspace-grid">
          <TaskList
            tasks={tasks}
            visibleTasks={visibleTasks}
            actors={actors}
            deleted={deleted}
            filter={filter}
            hasFilters={searchTerm !== '' || filter !== 'all'}
            pending={taskQuery.isPending}
            error={taskQuery.error}
            selectedId={selectedTask?.id ?? null}
            busyId={
              actions.changeStatus.isPending ? (actions.changeStatus.variables?.id ?? null) : null
            }
            actionsDisabled={actionsDisabled}
            onFilter={setFilter}
            onSelect={setSelectedId}
            onAdvance={advance}
            onDelete={(task) => {
              actions.remove.reset();
              setDialog({ kind: 'delete', task });
            }}
            onRetry={() => {
              void taskQuery.refetch();
            }}
          />
          <aside className="history-panel" aria-label="Task history">
            <div className="panel-label">
              <Icon name="history" /> Task history
            </div>
            {selectedTask ? <h2>{selectedTask.title}</h2> : <h2>Every change has a story</h2>}
            <p className="history-placeholder">Select a task to follow its status history.</p>
          </aside>
        </div>
        <footer className="workspace-footer">
          <Icon name="history" /> Status history is retained when a task is deleted.
        </footer>
      </main>
      {dialog?.kind === 'create' ? (
        <CreateTaskDialog
          actorId={actorId}
          actorName={actorName}
          pending={actions.create.isPending}
          error={actions.create.error ? errorMessage(actions.create.error) : null}
          onClose={() => setDialog(null)}
          onSubmit={(input) => {
            actions.create.mutate(input, {
              onSuccess: ({ task }) => {
                setDialog(null);
                switchView(false);
                setSelectedId(task.id);
                setNotice({ tone: 'success', text: 'Created “' + task.title + '”.' });
              },
            });
          }}
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <DeleteTaskDialog
          task={dialog.task}
          pending={actions.remove.isPending}
          error={actions.remove.error ? errorMessage(actions.remove.error) : null}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            actions.remove.mutate(
              { id: dialog.task.id, actorId },
              {
                onSuccess: () => {
                  setDialog(null);
                  setSelectedId(null);
                  setNotice({
                    tone: 'success',
                    text: 'Task deleted. Its history is available in Deleted tasks.',
                  });
                },
              },
            );
          }}
        />
      ) : null}
    </div>
  );
}
