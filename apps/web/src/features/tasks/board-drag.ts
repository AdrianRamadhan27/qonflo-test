import { pointerWithin, rectIntersection } from '@dnd-kit/core';
import type { Announcements, CollisionDetection, KeyboardCoordinateGetter } from '@dnd-kit/core';
import { STATUS_LABELS, TASK_STATUSES } from '@taskline/shared';
import type { Task } from '@taskline/shared';

export const boardCollisions: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);

// Arrow keys move one whole column, regardless of card or viewport width.
export function columnKeyboardCoordinates(tasks: Task[]): KeyboardCoordinateGetter {
  return (event, { active, currentCoordinates, context }) => {
    if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;
    event.preventDefault();

    const task = tasks.find((item) => item.id === active);
    const currentStatus =
      TASK_STATUSES.find((status) => status === context.over?.id) ?? task?.status;
    if (!currentStatus || !context.collisionRect) return;

    const direction = event.code === 'ArrowRight' ? 1 : -1;
    const targetStatus = TASK_STATUSES[TASK_STATUSES.indexOf(currentStatus) + direction];
    const target = targetStatus ? context.droppableRects.get(targetStatus) : undefined;
    if (!target) return;

    return {
      x: currentCoordinates.x + target.left + 16 - context.collisionRect.left,
      y: currentCoordinates.y + target.top + 56 - context.collisionRect.top,
    };
  };
}

export function boardAnnouncements(tasks: Task[]): Announcements {
  const titleOf = (id: string | number) => tasks.find((task) => task.id === id)?.title ?? 'task';
  const columnOf = (id: string | number) => {
    const status = TASK_STATUSES.find((item) => item === id);
    return status ? STATUS_LABELS[status] : 'the board';
  };
  return {
    onDragStart: ({ active }) => 'Picked up ' + titleOf(active.id) + '. Move one status forward.',
    onDragOver: ({ active, over }) =>
      over ? titleOf(active.id) + ' is over ' + columnOf(over.id) + '.' : 'Outside a column.',
    onDragEnd: ({ active, over }) =>
      over
        ? 'Dropped ' + titleOf(active.id) + ' over ' + columnOf(over.id) + '.'
        : 'Move cancelled.',
    onDragCancel: () => 'Move cancelled. The task has not changed.',
  };
}
