import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { NEXT_STATUS, STATUS_LABELS, TASK_STATUSES } from '@taskline/shared';
import type { Actor, Task, TaskStatus } from '@taskline/shared';
import { errorMessage } from '../../api/client';
import { Icon } from '../../components/Icon';
import { boardAnnouncements, boardCollisions, columnKeyboardCoordinates } from './board-drag';
import { StatusBadge } from './StatusBadge';
import { TaskCard } from './TaskCard';

interface TaskBoardProps {
  tasks: Task[];
  actors: Actor[];
  pending: boolean;
  error: Error | null;
  deleted: boolean;
  searching: boolean;
  busyId: string | null;
  actionsDisabled: boolean;
  onOpen: (id: string) => void;
  onAdvance: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onDelete: (task: Task) => void;
  onRetry: () => void;
}

function TaskColumn({
  status,
  activeTask,
  board,
}: {
  status: TaskStatus;
  activeTask: Task | undefined;
  board: TaskBoardProps;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: board.deleted || board.actionsDisabled,
  });
  const tasks = board.tasks.filter((task) => task.status === status);
  const canReceive = activeTask && NEXT_STATUS[activeTask.status] === status;
  const sameColumn = activeTask?.status === status;
  const dropClass =
    isOver && !sameColumn
      ? canReceive
        ? ' column-drop-valid'
        : ' column-drop-invalid'
      : canReceive
        ? ' column-drop-ready'
        : '';

  return (
    <section
      ref={setNodeRef}
      className={'kanban-column' + dropClass}
      aria-labelledby={'column-' + status}
    >
      <header className="column-header">
        <h2 id={'column-' + status}>
          <span className={'status-dot status-' + status} aria-hidden="true" />
          {STATUS_LABELS[status]}
          <span className="column-count">{tasks.length}</span>
        </h2>
        <span className="column-step">{TASK_STATUSES.indexOf(status) + 1} / 4</span>
      </header>
      {tasks.length ? (
        <ul className="column-cards">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              actors={board.actors}
              busy={board.busyId === task.id}
              actionsDisabled={board.actionsDisabled}
              onOpen={() => board.onOpen(task.id)}
              onAdvance={() => board.onAdvance(task)}
              onDelete={() => board.onDelete(task)}
            />
          ))}
        </ul>
      ) : (
        <div className="column-empty">
          <p>{board.searching ? 'No matches' : 'No tasks'}</p>
          {status === 'to_do' && !board.searching && !board.deleted ? (
            <span>New tasks start here.</span>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function TaskBoard(props: TaskBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = props.tasks.find((task) => task.id === activeId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnKeyboardCoordinates(props.tasks),
      scrollBehavior: 'auto',
    }),
  );

  function finishMove({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (props.actionsDisabled || props.deleted) return;
    const task = props.tasks.find((item) => item.id === active.id);
    const status = TASK_STATUSES.find((item) => item === over?.id);
    if (task && status && task.status !== status) props.onMove(task, status);
  }

  if (props.pending) {
    return (
      <div className="board-state empty-state" role="status">
        <span className="loading-line" />
        <p>Loading your board…</p>
      </div>
    );
  }
  if (props.error) {
    return (
      <div className="board-state empty-state">
        <Icon name="refresh" />
        <h2>The board could not load</h2>
        <p role="alert">{errorMessage(props.error)}</p>
        <button type="button" className="button button-secondary" onClick={props.onRetry}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={boardCollisions}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragEnd={finishMove}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements: boardAnnouncements(props.tasks),
        screenReaderInstructions: {
          draggable:
            'Press Space or Enter to pick up a task. Use Left and Right arrows to move between columns. Press Space or Enter to drop, or Escape to cancel.',
        },
      }}
    >
      <section
        className="kanban-board"
        id="task-list"
        tabIndex={-1}
        aria-label={props.deleted ? 'Deleted task board' : 'Active task board'}
      >
        {TASK_STATUSES.map((status) => (
          <TaskColumn key={status} status={status} activeTask={activeTask} board={props} />
        ))}
      </section>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="drag-preview">
            <StatusBadge status={activeTask.status} />
            <strong>{activeTask.title}</strong>
            <p>
              Drop in {STATUS_LABELS[NEXT_STATUS[activeTask.status] ?? activeTask.status]} to move.
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
