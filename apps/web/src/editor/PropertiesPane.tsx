// The properties pane: all the data of the selection, which the user can read
// and change. It shows the scene when nothing is selected, the actor when an
// actor is selected, and also the action when an action is selected on the
// timeline. A selected speech bubble shows its own section.
import type {
  Action,
  Actor,
  Bubble,
  ClipId,
  Pt,
  Scene,
} from '@toonhouse/model';
import {
  actionSpeed,
  actorStateAt,
  backgroundClips,
  type BubbleAnchor,
  clipsFor,
  clipStartOf,
  isMoving,
  sortedActions,
  walkTime,
} from '@toonhouse/renderer';
import type { ReactNode } from 'react';

import {
  CloseIcon,
  DeleteIcon,
  InsertPointIcon,
  PinIcon,
} from '../components/icons.tsx';
import { useI18n } from '../i18n/index.tsx';
import { BubbleSection } from './BubbleSection.tsx';
import type { EditRun } from './history.ts';
import { type BackgroundAsset, kindOf } from './library.ts';
import { useNames } from './names.ts';
import { NumberField } from './NumberField.tsx';
import {
  actionsOf,
  insertPoint,
  moveStart,
  removePoint,
  savedPoint,
  setClip,
  setClipStart,
  setLength,
  setScale,
  setSpeed,
  updateAction,
  updateActions,
  updateActor,
} from './sceneEdit.ts';
import type { TimelineSelection } from './Timeline.tsx';

interface Props {
  scene: Scene;
  bg: BackgroundAsset | null;
  selection: TimelineSelection | null;
  /** The selected bubble, which the pane shows instead of the selection. */
  bubble: Bubble | null;
  /** Where the actors are at the current time. */
  anchors: ReadonlyMap<string, BubbleAnchor>;
  /** Goes up by one each time the text of the bubble should get the focus. */
  textFocus: number;
  onEditBubble(fn: (b: Bubble) => Bubble, run?: EditRun): void;
  /** The length of the scene in seconds. */
  duration: number;
  fps: number;
  onEdit(fn: (scene: Scene) => Scene): void;
  onSeek(t: number): void;
  /** The clip of an action changed, so the stage may need to show its path. */
  onClipChanged(actorId: string | null, action: Action): void;
  /** The walk point that the user works on in the pane, to show on the stage. */
  onFocusPoint(index: number | null): void;
  /** Whether the pane has its own column beside the stage. */
  attached: boolean;
  onAttach(attached: boolean): void;
  onClose(): void;
}

export function PropertiesPane(props: Props) {
  const { tr } = useI18n();
  const { scene, bg, selection } = props;
  const actor =
    selection?.actorId != null
      ? scene.actors.find((a) => a.id === selection.actorId)
      : undefined;
  const action =
    selection?.actionId != null
      ? actionsOf(scene, selection.actorId).find(
          (a) => a.id === selection.actionId,
        )
      : undefined;

  let content: ReactNode;
  if (!bg) content = <p className="muted small">{tr('properties.noScene')}</p>;
  else if (props.bubble)
    content = (
      <BubbleSection
        key={props.bubble.id}
        scene={scene}
        bubble={props.bubble}
        anchors={props.anchors}
        textFocus={props.textFocus}
        onEdit={props.onEditBubble}
        onSeek={props.onSeek}
      />
    );
  else if (!selection) content = <SceneSection key={scene.id} {...props} />;
  else
    content = (
      <>
        {actor ? (
          <ActorSection key={actor.id} {...props} actor={actor} />
        ) : (
          <SceneSection key={scene.id} {...props} />
        )}
        {action && (
          <ActionSection
            key={action.id}
            {...props}
            actor={actor}
            action={action}
          />
        )}
      </>
    );

  return (
    <section
      className={
        props.attached ? 'properties-pane attached' : 'properties-pane'
      }
      aria-label={tr('properties.title')}
    >
      <div className="pane-head">
        <h2>{tr('properties.title')}</h2>
        <button
          type="button"
          className="icon-button small"
          aria-label={tr('properties.attach')}
          aria-pressed={props.attached}
          title={tr('properties.attach')}
          onClick={() => props.onAttach(!props.attached)}
        >
          <PinIcon filled={props.attached} />
        </button>
        <button
          type="button"
          className="icon-button small"
          aria-label={tr('properties.hide')}
          title={tr('properties.hide')}
          onClick={props.onClose}
        >
          <CloseIcon />
        </button>
      </div>
      {content}
    </section>
  );
}

function SceneSection(props: Props) {
  const { tr } = useI18n();
  const names = useNames();
  const { scene } = props;
  return (
    <div className="pane-section">
      <h3>
        {scene.background
          ? names.background(scene.background)
          : tr('editor.background')}
      </h3>
      <NumberField
        label={tr('properties.sceneLength')}
        value={props.duration}
        step={1}
        decimals={2}
        unit={tr('properties.seconds')}
        onChange={(v) => props.onEdit((s) => setLength(s, v))}
      />
      {scene.length === undefined && (
        <p className="muted small">{tr('properties.lengthAuto')}</p>
      )}
    </div>
  );
}

function ActorSection(props: Props & { actor: Actor }) {
  const { tr } = useI18n();
  const names = useNames();
  const { actor } = props;
  const edit = (fn: (a: Actor) => Actor) =>
    props.onEdit((s) => updateActor(s, actor.id, fn));
  const move = (p: Partial<Pt>) =>
    edit((a) => ({ ...a, at: savedPoint({ ...a.at, ...p }) }));
  return (
    <div className="pane-section">
      <h3>{names.actors(props.scene).get(actor.id)}</h3>
      <p className="muted small">{tr('properties.startHint')}</p>
      <NumberField
        label={tr('properties.x')}
        value={actor.at.x}
        step={10}
        decimals={1}
        onChange={(x) => move({ x })}
      />
      <NumberField
        label={tr('properties.y')}
        value={actor.at.y}
        step={10}
        decimals={1}
        onChange={(y) => move({ y })}
      />
      <div className="pane-row">
        <span>{tr('properties.facing')}</span>
        <div
          className="segmented"
          role="group"
          aria-label={tr('properties.facing')}
        >
          {([-1, 1] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={actor.facing === f}
              onClick={() => edit((a) => ({ ...a, facing: f }))}
            >
              {tr(f === 1 ? 'properties.right' : 'properties.left')}
            </button>
          ))}
        </div>
      </div>
      <NumberField
        label={tr('properties.size')}
        value={actor.scale * 100}
        step={10}
        decimals={1}
        unit="%"
        onChange={(v) => edit((a) => setScale(a, v / 100))}
      />
    </div>
  );
}

function ActionSection(
  props: Props & { actor: Actor | undefined; action: Action },
) {
  const { tr } = useI18n();
  const names = useNames();
  const { actor, action, bg, scene } = props;
  const actorId = actor?.id ?? null;
  const kind = actor ? kindOf(actor.asset) : 'background';
  if (!kind || !bg) return null;
  const clips = actor ? clipsFor(kind) : backgroundClips(bg.background);
  const moves = actor !== undefined && isMoving(kind, action.clip);

  const editAction = (fn: (a: Action) => Action) =>
    props.onEdit((s) =>
      updateActions(s, actorId, (list) => updateAction(list, action.id, fn)),
    );
  const sorted = sortedActions(actionsOf(scene, actorId));
  const next = sorted[sorted.findIndex((a) => a.id === action.id) + 1];
  const end = Math.min(next?.t ?? props.duration, props.duration);
  const frame = 1 / props.fps;

  const changeClip = (clip: ClipId) => {
    const changed = setClip(
      action,
      clip,
      actor !== undefined && isMoving(kind, clip),
    );
    editAction(() => changed);
    props.onClipChanged(actorId, changed);
  };
  const changeStart = (t: number, closed: boolean) => {
    props.onEdit((s) =>
      updateActions(s, actorId, (list) => moveStart(list, action.id, t)),
    );
    // The playhead stays with the new selection.
    if (closed) return;
    const moved = moveStart(actionsOf(scene, actorId), action.id, t);
    props.onSeek(moved.find((a) => a.id === action.id)?.t ?? t);
  };

  return (
    <div className="pane-section">
      <h3>{tr('properties.action')}</h3>
      <div className="pane-row">
        <label htmlFor="properties-clip">{tr('properties.clip')}</label>
        <select
          id="properties-clip"
          className="pane-select"
          value={action.clip}
          onChange={(e) => changeClip(e.target.value as ClipId)}
        >
          {clips.map((c) => (
            <option key={c.id} value={c.id}>
              {names.clip(kind, c.id)}
            </option>
          ))}
        </select>
      </div>
      <NumberField
        label={tr('properties.start')}
        value={action.t}
        step={frame}
        decimals={2}
        unit={tr('properties.seconds')}
        onChange={changeStart}
      />
      <p className="muted small">
        {tr(next ? 'properties.endsAtNext' : 'properties.endsAtScene', {
          time: end.toFixed(2),
        })}
      </p>
      <NumberField
        label={tr('properties.speed')}
        value={actionSpeed(action)}
        step={0.25}
        decimals={2}
        unit="×"
        onChange={(v) => editAction((a) => setSpeed(a, v))}
      />
      <NumberField
        label={tr('properties.clipStart')}
        value={clipStartOf(action) * 100}
        step={10}
        decimals={1}
        unit="%"
        onChange={(v) => editAction((a) => setClipStart(a, v / 100))}
      />
      {moves && actor && (
        <WalkPath
          {...props}
          actor={actor}
          action={action}
          kind={kind}
          onEditAction={editAction}
        />
      )}
    </div>
  );
}

// Walk points have no ids, so each point object gets a key for its row. The
// new point of an edit gets the key of the old one, and undo brings back the
// old points with their keys. So a row, and a value typed in it, stay with
// their point when a point before it is added or removed.
const pointKeys = new WeakMap<Pt, number>();
let nextPointKey = 0;
function pointKey(p: Pt): number {
  let key = pointKeys.get(p);
  if (key === undefined) {
    key = nextPointKey++;
    pointKeys.set(p, key);
  }
  return key;
}

function WalkPath(
  props: Props & {
    actor: Actor;
    action: Action;
    kind: Exclude<ReturnType<typeof kindOf>, null>;
    onEditAction(fn: (a: Action) => Action): void;
  },
) {
  const { tr } = useI18n();
  const { actor, action, kind } = props;
  const bg = props.bg!.background;
  const path = action.path ?? [];
  const start = actorStateAt(actor, kind, bg, action.t).at;
  const arrives = walkTime(actor, kind, bg, action);
  const editPath = (fn: (p: Pt[]) => Pt[]) =>
    props.onEditAction((a) => {
      const old = a.path ?? [];
      const next = fn(old);
      return next === old ? a : { ...a, path: next };
    });
  /** Changes the point with the key, if it is still on the path. */
  const setPoint = (key: number, p: Partial<Pt>) =>
    editPath((list) => {
      const i = list.findIndex((q) => pointKeys.get(q) === key);
      if (i < 0) return list;
      const moved = savedPoint({ ...list[i]!, ...p });
      pointKeys.set(moved, key);
      return list.map((q, j) => (j === i ? moved : q));
    });
  const keys = path.map(pointKey);

  return (
    <div className="walk-points">
      <h4>{tr('properties.path')}</h4>
      {arrives !== null && (
        <p className="muted small">
          {tr('properties.arrives', { time: (action.t + arrives).toFixed(2) })}
        </p>
      )}
      <div className="point-row head" aria-hidden>
        <span />
        <span>{tr('properties.x')}</span>
        <span>{tr('properties.y')}</span>
      </div>
      <div className="point-row">
        <span className="point-number" title={tr('properties.walkStart')}>
          0
        </span>
        <span className="point-value">{start.x.toFixed(1)}</span>
        <span className="point-value">{start.y.toFixed(1)}</span>
      </div>
      {path.map((p, i) => (
        <div
          // The same point object twice on the path would share a key.
          key={keys.indexOf(keys[i]!) === i ? keys[i] : `${keys[i]}-${i}`}
          className="point-row"
          onFocus={() => props.onFocusPoint(i)}
          onBlur={() => props.onFocusPoint(null)}
          onPointerEnter={() => props.onFocusPoint(i)}
          onPointerLeave={() => props.onFocusPoint(null)}
        >
          <span className="point-number">{i + 1}</span>
          <NumberField
            label={tr('properties.pointX', { n: i + 1 })}
            hideLabel
            value={p.x}
            decimals={1}
            onChange={(x) => setPoint(keys[i]!, { x })}
          />
          <NumberField
            label={tr('properties.pointY', { n: i + 1 })}
            hideLabel
            value={p.y}
            decimals={1}
            onChange={(y) => setPoint(keys[i]!, { y })}
          />
          <button
            type="button"
            className="icon-button small"
            aria-label={tr('properties.insertPoint', { n: i + 1 })}
            title={tr('properties.insertPoint', { n: i + 1 })}
            onClick={() => editPath((list) => insertPoint(list, i, start))}
          >
            <InsertPointIcon />
          </button>
          <button
            type="button"
            className="icon-button small"
            aria-label={tr('properties.removePoint', { n: i + 1 })}
            title={tr('properties.removePoint', { n: i + 1 })}
            // A walk without points would walk on the spot.
            disabled={path.length <= 1}
            onClick={() => {
              props.onFocusPoint(null);
              editPath((list) => removePoint(list, i));
            }}
          >
            <DeleteIcon />
          </button>
        </div>
      ))}
      <p className="muted small">{tr('properties.pathHint')}</p>
    </div>
  );
}
