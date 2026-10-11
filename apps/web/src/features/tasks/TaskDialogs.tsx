import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createTaskSchema } from '@taskline/shared';
import type { ActorId, CreateTaskInput, Task } from '@taskline/shared';
import { Modal } from '../../components/Modal';

interface CreateTaskDialogProps {
  actorId: ActorId;
  actorName: string;
  pending: boolean;
  error: string | null;
  onSubmit: (input: CreateTaskInput) => void;
  onClose: () => void;
}

export function CreateTaskDialog({
  actorId,
  actorName,
  pending,
  error,
  onSubmit,
  onClose,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createTaskSchema.safeParse({ title, description, actorId });
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Check the task details.');
      titleRef.current?.focus();
      return;
    }
    setValidationError(null);
    onSubmit(result.data);
  }

  return (
    <Modal title="New task" titleId="create-heading" onClose={onClose} initialFocus={titleRef}>
      <form onSubmit={submit} className="task-form">
        <p className="modal-description">Start with a clear next action. Created by {actorName}.</p>
        <label htmlFor="task-title">
          Title <span className="field-hint">Required</span>
        </label>
        <input
          ref={titleRef}
          id="task-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          required
          placeholder="e.g. Prepare the monthly invoices"
          disabled={pending}
        />
        <label htmlFor="task-description">
          Description <span className="field-hint">Optional</span>
        </label>
        <textarea
          id="task-description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Add context your team will need…"
          disabled={pending}
        />
        {validationError || error ? (
          <p className="form-error" role="alert">
            {validationError ?? error}
          </p>
        ) : null}
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={pending}>
            {pending ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface DeleteTaskDialogProps {
  task: Task;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteTaskDialog({
  task,
  pending,
  error,
  onConfirm,
  onClose,
}: DeleteTaskDialogProps) {
  return (
    <Modal title="Delete this task?" titleId="delete-heading" onClose={onClose}>
      <p className="modal-description">
        “{task.title}” will leave the active list. Its status history stays available in Deleted
        tasks.
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="modal-footer">
        <button type="button" className="button button-secondary" onClick={onClose}>
          Keep task
        </button>
        <button
          type="button"
          className="button button-danger"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? 'Deleting…' : 'Delete task'}
        </button>
      </div>
    </Modal>
  );
}
