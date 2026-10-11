import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Icon } from './Icon';

interface ModalProps {
  title: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  initialFocus?: RefObject<HTMLInputElement | null>;
  className?: string;
}

export function Modal({ title, titleId, onClose, children, initialFocus, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    initialFocus?.current?.focus();
    return () => dialog.close();
  }, [initialFocus]);

  return (
    <dialog
      ref={dialogRef}
      className={'modal' + (className ? ' ' + className : '')}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
