import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import type { Cartoon } from '@toonhouse/api';
import { type FormEvent, type ReactNode, useState } from 'react';

import {
  ApiError,
  cartoonQuery,
  cartoonsQuery,
  renameCartoon,
} from '../api.ts';
import { AppHeader } from '../components/AppHeader.tsx';
import {
  BackgroundIcon,
  BackIcon,
  BubbleIcon,
  CharacterIcon,
  PlayIcon,
  PropIcon,
  RedoIcon,
  SoundIcon,
  StepBackIcon,
  StepForwardIcon,
  UndoIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../components/icons.tsx';
import { PageMessage, RequireUser } from '../components/RequireUser.tsx';
import { type TextKey, useI18n } from '../i18n/index.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';

const route = getRouteApi('/cartoons/$cartoonId/edit');

export function EditorPage() {
  return (
    <RequireUser>
      <EditorContent />
    </RequireUser>
  );
}

function EditorContent() {
  const { cartoonId } = route.useParams();
  const cartoon = useQuery(cartoonQuery(cartoonId));

  if (cartoon.isPending) return <Fallback text="loading" />;
  if (cartoon.isError) {
    return cartoon.error instanceof ApiError && cartoon.error.status === 404 ? (
      <NotFoundPage />
    ) : (
      <Fallback text="loadError" />
    );
  }
  if (!cartoon.data.canEdit) return <Fallback text="editor.notOwner" />;
  return <Editor cartoon={cartoon.data} />;
}

/** A message in place of the editor, with the header to get back home. */
function Fallback({ text }: { text: TextKey }) {
  return (
    <div className="page">
      <AppHeader />
      <PageMessage text={text} />
    </div>
  );
}

function Editor({ cartoon }: { cartoon: Cartoon }) {
  const { tr } = useI18n();
  return (
    <div className="editor">
      <header className="editor-header">
        <Link
          to="/"
          className="icon-button"
          aria-label={tr('editor.home')}
          title={tr('editor.home')}
        >
          <BackIcon />
        </Link>
        <CartoonTitle cartoon={cartoon} />
        <div className="spacer" />
        <ToolButton label="editor.undo" disabled>
          <UndoIcon />
        </ToolButton>
        <ToolButton label="editor.redo" disabled>
          <RedoIcon />
        </ToolButton>
        <div className="divider" />
        <button type="button" className="button primary small" disabled>
          <PlayIcon size={16} />
          {tr('editor.watch')}
        </button>
      </header>

      <div className="editor-body">
        <nav className="tool-rail" aria-label={tr('editor.library')}>
          <ToolButton label="editor.characters" disabled>
            <CharacterIcon />
          </ToolButton>
          <ToolButton label="editor.props" disabled>
            <PropIcon />
          </ToolButton>
          <ToolButton label="editor.backgrounds" disabled>
            <BackgroundIcon />
          </ToolButton>
          <ToolButton label="editor.speechBubble" disabled>
            <BubbleIcon />
          </ToolButton>
          <ToolButton label="editor.sounds" disabled>
            <SoundIcon />
          </ToolButton>
        </nav>
        <div className="stage-area">
          <div className="stage" aria-label={tr('editor.stage')}>
            <span className="stage-ground" />
            <p className="stage-hint">{tr('editor.emptyScene')}</p>
          </div>
        </div>
      </div>

      <Timeline />
    </div>
  );
}

/** The title of the cartoon. A tap on it opens a field to rename it. */
function CartoonTitle({ cartoon }: { cartoon: Cartoon }) {
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
        <span className="muted small">{tr('editor.saved')}</span>
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

function Timeline() {
  const { tr } = useI18n();
  return (
    <section className="timeline" aria-label={tr('editor.timeline')}>
      <div className="transport">
        <ToolButton label="editor.stepBack" disabled small>
          <StepBackIcon />
        </ToolButton>
        <ToolButton label="editor.playFromHere" disabled small>
          <PlayIcon />
        </ToolButton>
        <ToolButton label="editor.stepForward" disabled small>
          <StepForwardIcon />
        </ToolButton>
        <div className="time">
          <strong>0:00.0</strong>
          <span className="muted"> / 0:00.0</span>
        </div>
        <div className="spacer" />
        <ToolButton label="editor.zoomOut" disabled small>
          <ZoomOutIcon />
        </ToolButton>
        <ToolButton label="editor.zoomIn" disabled small>
          <ZoomInIcon />
        </ToolButton>
      </div>
      <div className="tracks">
        <p className="muted">{tr('editor.emptyTimeline')}</p>
      </div>
    </section>
  );
}

function ToolButton(props: {
  label: TextKey;
  disabled?: boolean;
  small?: boolean;
  children: ReactNode;
}) {
  const { tr } = useI18n();
  return (
    <button
      type="button"
      className={props.small ? 'icon-button small' : 'icon-button'}
      aria-label={tr(props.label)}
      title={tr(props.label)}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}
