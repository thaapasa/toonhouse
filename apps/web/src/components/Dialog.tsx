import { type ReactNode, useEffect, useRef } from 'react';

/**
 * A modal dialog. It uses the `dialog` element, which keeps the focus inside
 * and closes on Escape.
 */
export function Dialog(props: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { onClose } = props;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // The body fills the dialog, so only a tap on the backdrop lands on the
      // dialog element itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-body">
        <h2 id="dialog-title">{props.title}</h2>
        {props.children}
      </div>
    </dialog>
  );
}
