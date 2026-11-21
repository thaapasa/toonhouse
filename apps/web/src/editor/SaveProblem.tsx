// Tells the user why the editor can't save, when the user must do something
// about it. The user can close the message, and it comes back only after a
// successful save or for another problem.
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { Dialog } from '../components/Dialog.tsx';
import { type TextKey, useI18n } from '../i18n/index.tsx';
import type { SaveState } from './saver.ts';

/** The title and the text of a problem, or null if there is none. */
function texts(state: SaveState): [TextKey, TextKey] | null {
  switch (state.status) {
    case 'refused':
      return [
        'save.refusedTitle',
        state.reason === 'tooLarge' ? 'save.tooLargeInfo' : 'save.refusedInfo',
      ];
    case 'loggedOut':
      return [
        'save.loggedOutTitle',
        state.kept ? 'save.loggedOutInfo' : 'save.loggedOutNotKept',
      ];
    case 'conflict':
      return state.atOpen
        ? ['save.keptTitle', 'save.keptInfo']
        : ['save.conflictTitle', 'save.conflictInfo'];
    case 'gone':
      return ['save.refusedTitle', 'save.goneInfo'];
    default:
      return null;
  }
}

export function SaveProblem(props: {
  cartoonId: string;
  state: SaveState;
  onKeepMine(): void;
  onLoadSaved(): void;
  onRetry(): void;
}) {
  const { tr } = useI18n();
  const { state } = props;
  const [closed, setClosed] = useState<string | null>(null);
  if (state.status === 'saved' && closed !== null) setClosed(null);

  const problem = texts(state);
  // The same problem again, such as after each edit, stays closed.
  const key = problem?.join();
  if (!problem || closed === key) return null;
  // A conflict waits for a choice, since nothing else would bring it back.
  const close = () => {
    if (state.status !== 'conflict') setClosed(key!);
  };
  return (
    <Dialog title={tr(problem[0])} onClose={close}>
      <p className="muted">{tr(problem[1])}</p>
      <div className="row end">
        {state.status === 'conflict' ? (
          <>
            <button
              type="button"
              className="button"
              onClick={props.onLoadSaved}
            >
              {tr(state.atOpen ? 'save.useSaved' : 'save.loadSaved')}
            </button>
            <button
              type="button"
              className="button primary"
              onClick={props.onKeepMine}
            >
              {tr(state.atOpen ? 'save.useKept' : 'save.keepMine')}
            </button>
          </>
        ) : (
          <button type="button" className="button" onClick={close}>
            {tr('close')}
          </button>
        )}
        {state.status === 'loggedOut' && !state.kept && (
          <button type="button" className="button" onClick={props.onRetry}>
            {tr('save.retry')}
          </button>
        )}
        {state.status === 'loggedOut' && (
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
