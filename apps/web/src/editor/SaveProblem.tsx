// Tells the user why the editor can't save, when the user must do something
// about it. The user can close the message, and it comes back only after the
// next successful save.
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { Dialog } from '../components/Dialog.tsx';
import { type TextKey, useI18n } from '../i18n/index.tsx';
import type { SaveState } from './useCartoonContent.ts';

const PROBLEMS: Partial<Record<SaveState, { title: TextKey; info: TextKey }>> =
  {
    refused: { title: 'save.refusedTitle', info: 'save.refusedInfo' },
    tooLarge: { title: 'save.refusedTitle', info: 'save.tooLargeInfo' },
    loggedOut: { title: 'save.loggedOutTitle', info: 'save.loggedOutInfo' },
    conflict: { title: 'save.conflictTitle', info: 'save.conflictInfo' },
  };

export function SaveProblem(props: { cartoonId: string; state: SaveState }) {
  const { tr } = useI18n();
  const { state } = props;
  const [closed, setClosed] = useState<SaveState | null>(null);
  if (state === 'saved' && closed !== null) setClosed(null);

  const problem = PROBLEMS[state];
  if (!problem || closed === state) return null;
  const close = () => setClosed(state);
  return (
    <Dialog title={tr(problem.title)} onClose={close}>
      <p className="muted">{tr(problem.info)}</p>
      <div className="row end">
        {state === 'conflict' ? (
          <button
            type="button"
            className="button primary"
            onClick={() => location.reload()}
          >
            {tr('save.reload')}
          </button>
        ) : (
          <button type="button" className="button" onClick={close}>
            {tr('close')}
          </button>
        )}
        {state === 'loggedOut' && (
          <Link
            to="/login"
            search={{ redirect: `/cartoons/${props.cartoonId}/edit` }}
            className="button primary"
          >
            {tr('login.open')}
          </Link>
        )}
      </div>
    </Dialog>
  );
}
