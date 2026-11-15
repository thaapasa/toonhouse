import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Cartoon } from '@toonhouse/api';
import { type FormEvent, useState } from 'react';

import { cartoonQuery, cartoonsQuery, renameCartoon } from '../api.ts';
import { useI18n } from '../i18n/index.tsx';
import type { SaveState } from './useCartoonContent.ts';

const SAVE_TEXTS = {
  saved: 'editor.saved',
  unsaved: 'editor.unsaved',
  saving: 'editor.saving',
  error: 'editor.saveError',
} as const;

/** The title of the cartoon. A tap on it opens a field to rename it. */
export function CartoonTitle({
  cartoon,
  saveState,
}: {
  cartoon: Cartoon;
  saveState: SaveState;
}) {
  const { tr } = useI18n();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(cartoon.title);
  const rename = useMutation({
    mutationFn: () => renameCartoon(cartoon.id, title.trim()),
    onSuccess: async (saved) => {
      queryClient.setQueryData(cartoonQuery(cartoon.id).queryKey, saved);
      setEditing(false);
      await queryClient.invalidateQueries({
        queryKey: cartoonsQuery.queryKey,
        exact: true,
      });
    },
  });

  const save = () => {
    if (!title.trim() || title.trim() === cartoon.title) setEditing(false);
    else if (!rename.isPending) rename.mutate();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save();
  };

  if (!editing) {
    return (
      <div className="editor-title">
        <button
          type="button"
          className="title-button"
          title={tr('editor.rename')}
          onClick={() => {
            setTitle(cartoon.title);
            rename.reset();
            setEditing(true);
          }}
        >
          {cartoon.title}
        </button>
        <span
          className={saveState === 'error' ? 'error small' : 'muted small'}
          role="status"
        >
          {tr(SAVE_TEXTS[saveState])}
        </span>
      </div>
    );
  }
  return (
    <form className="editor-title" onSubmit={onSubmit}>
      <input
        className="title-input"
        value={title}
        aria-label={tr('editor.title')}
        maxLength={200}
        autoFocus
        disabled={rename.isPending}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false);
        }}
      />
      {rename.isError && (
        <span role="alert" className="error small">
          {tr('editor.renameError')}
        </span>
      )}
    </form>
  );
}
