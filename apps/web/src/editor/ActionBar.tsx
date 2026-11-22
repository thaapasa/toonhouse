// The toolbar of the selected actor: a button for each of its clips, which
// starts the clip at the current time, and the tools for the actor.
import type { Clip, ClipId } from '@toonhouse/model';

import { IconButton } from '../components/IconButton.tsx';
import {
  BiggerIcon,
  CameraJumpIcon,
  CameraMoveIcon,
  DeleteIcon,
  DoneIcon,
  EditIcon,
  PlusIcon,
  RemoveActionIcon,
  SmallerIcon,
  TurnIcon,
} from '../components/icons.tsx';
import { type TextKey, useI18n } from '../i18n/index.tsx';
import { CLIP_ICONS } from './clipIcons.tsx';
import { useNames } from './names.ts';

export interface ActorTools {
  onTurn(): void;
  onSmaller?: (() => void) | undefined;
  onBigger?: (() => void) | undefined;
  onRemove(): void;
}

interface Props {
  clips: readonly Clip[];
  /** The clip that plays at the current time. */
  current: ClipId;
  onClip(clip: ClipId): void;
  /** Removes the action selected on the timeline. */
  onRemoveAction?: (() => void) | undefined;
  actor?: ActorTools | undefined;
}

export function ActionBar(props: Props) {
  const { tr } = useI18n();
  const names = useNames();
  return (
    <div
      className="action-bar"
      role="toolbar"
      aria-label={tr('editor.actions')}
    >
      {props.clips.map((clip) => {
        const Icon = CLIP_ICONS[clip.id];
        const label = names.clip(clip.id);
        return (
          <button
            key={clip.id}
            type="button"
            className="bar-button"
            aria-pressed={props.current === clip.id}
            aria-label={label}
            title={label}
            onClick={() => props.onClip(clip.id)}
          >
            <Icon />
          </button>
        );
      })}
      {(props.actor || props.onRemoveAction) && <div className="divider" />}
      {props.onRemoveAction && (
        <IconButton
          className="bar-button"
          label="editor.removeAction"
          onClick={props.onRemoveAction}
        >
          <RemoveActionIcon />
        </IconButton>
      )}
      {props.actor && (
        <>
          <IconButton
            className="bar-button"
            label="editor.turn"
            onClick={props.actor.onTurn}
          >
            <TurnIcon />
          </IconButton>
          <IconButton
            className="bar-button"
            label="editor.smaller"
            onClick={props.actor.onSmaller}
          >
            <SmallerIcon />
          </IconButton>
          <IconButton
            className="bar-button"
            label="editor.bigger"
            onClick={props.actor.onBigger}
          >
            <BiggerIcon />
          </IconButton>
          <IconButton
            className="bar-button"
            label="editor.removeActor"
            onClick={props.actor.onRemove}
          >
            <DeleteIcon />
          </IconButton>
        </>
      )}
    </div>
  );
}

/** The toolbar of the selected speech bubble. */
export function BubbleBar(props: { onEditText(): void; onRemove(): void }) {
  const { tr } = useI18n();
  return (
    <div className="action-bar" role="toolbar" aria-label={tr('bubble.title')}>
      <IconButton
        className="bar-button"
        label="bubble.editText"
        onClick={props.onEditText}
      >
        <EditIcon />
      </IconButton>
      <IconButton
        className="bar-button"
        label="bubble.remove"
        onClick={props.onRemove}
      >
        <DeleteIcon />
      </IconButton>
    </div>
  );
}

/**
 * The toolbar of the camera: a new camera move or jump at the current time,
 * and the removal of the one whose view the camera holds.
 */
export function CameraBar(props: {
  onMove?: (() => void) | undefined;
  onJump?: (() => void) | undefined;
  onRemove?: (() => void) | undefined;
  /** What the remove button does: removes an entry or resets the start view. */
  removeLabel: TextKey;
}) {
  const { tr } = useI18n();
  return (
    <div className="action-bar" role="toolbar" aria-label={tr('editor.camera')}>
      <IconButton
        className="bar-button"
        label="camera.addMove"
        onClick={props.onMove}
      >
        <CameraMoveIcon />
      </IconButton>
      <IconButton
        className="bar-button"
        label="camera.addJump"
        onClick={props.onJump}
      >
        <CameraJumpIcon />
      </IconButton>
      <div className="divider" />
      <IconButton
        className="bar-button"
        label={props.removeLabel}
        onClick={props.onRemove}
      >
        <DeleteIcon />
      </IconButton>
    </div>
  );
}

/**
 * The toolbar of the row of the time of day or the weather: a new change at
 * the current time, and the removal of the change that the scene holds there.
 */
export function ChangeBar(props: {
  row: 'time' | 'weather';
  onAdd?: (() => void) | undefined;
  onRemove?: (() => void) | undefined;
}) {
  const { tr } = useI18n();
  const k = props.row === 'time' ? 'sky' : 'weather';
  return (
    <div
      className="action-bar"
      role="toolbar"
      aria-label={tr(
        props.row === 'time' ? 'editor.timeOfDay' : 'editor.weather',
      )}
    >
      <IconButton
        className="bar-button"
        label={`${k}.addChange`}
        onClick={props.onAdd}
      >
        <PlusIcon size={20} />
      </IconButton>
      <div className="divider" />
      <IconButton
        className="bar-button"
        label={`${k}.removeChange`}
        onClick={props.onRemove}
      >
        <DeleteIcon />
      </IconButton>
    </div>
  );
}

/** Shown on the stage while the user picks the points of a walk. */
export function WalkBar({ onDone }: { onDone(): void }) {
  const { tr } = useI18n();
  return (
    <div className="action-bar walk-bar" role="toolbar">
      <span className="walk-hint">{tr('editor.walkHint')}</span>
      <button type="button" className="button primary small" onClick={onDone}>
        <DoneIcon />
        {tr('editor.walkDone')}
      </button>
    </div>
  );
}
