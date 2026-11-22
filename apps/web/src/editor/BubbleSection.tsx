// The part of the properties pane for the selected speech bubble: its text,
// its time, which actor it is attached to, and its look.
import { CONTENT_LIMITS } from '@toonhouse/api';
import type {
  Bubble,
  BubbleBorder,
  BubbleFontId,
  BubbleShape,
  CastMember,
  Scene,
} from '@toonhouse/model';
import {
  BUBBLE_FONTS,
  type BubbleAnchor,
  bubbleLength,
  clamp,
  fontFamily,
} from '@toonhouse/renderer';
import { type ReactNode, useEffect, useId, useRef } from 'react';

import { type TextKey, useI18n } from '../i18n/index.tsx';
import { LIBRARY } from '../library/index.ts';
import { attachBubble, setOptional } from './bubbles.ts';
import type { EditRun } from './history.ts';
import { useNames } from './names.ts';
import { NumberField } from './NumberField.tsx';
import { savedPoint, savedTime } from './sceneEdit.ts';

const SHAPES: readonly BubbleShape[] = [
  'speech',
  'thought',
  'shout',
  'caption',
];
const BORDERS: readonly BubbleBorder[] = [
  'solid',
  'dashed',
  'double',
  'wobbly',
  'none',
];
const ALIGNS = ['left', 'center', 'right'] as const;

const L = CONTENT_LIMITS;

interface Props {
  scene: Scene;
  /** The cast of the cartoon, for the names of the actors. */
  cast: readonly CastMember[];
  bubble: Bubble;
  /** Where the actors are now, so that a bubble stays in place when it moves to another actor. */
  anchors: ReadonlyMap<string, BubbleAnchor>;
  /** Goes up by one each time the text field should get the focus. */
  textFocus: number;
  onEdit(fn: (b: Bubble) => Bubble, run?: EditRun): void;
  onSeek(t: number): void;
}

export function BubbleSection(props: Props) {
  const { tr } = useI18n();
  const names = useNames();
  const { bubble, scene } = props;
  const textRef = useRef<HTMLTextAreaElement>(null);
  const ids = { text: useId(), actor: useId(), font: useId(), border: useId() };

  // A run of edits of the same field, such as typing the text or dragging in
  // a color picker, is one undo step.
  const run = useRef<{ field: string } | null>(null);
  const editRun = (field: string, fn: (b: Bubble) => Bubble) => {
    if (run.current?.field !== field) run.current = { field };
    props.onEdit(fn, run.current);
  };
  const endRun = () => {
    run.current = null;
  };
  const edit = (fn: (b: Bubble) => Bubble) => {
    endRun();
    props.onEdit(fn);
  };
  const set = <K extends keyof Bubble>(key: K, value: Bubble[K]) =>
    edit((b) => ({ ...b, [key]: value }));

  useEffect(() => {
    if (props.textFocus > 0) textRef.current?.focus();
  }, [props.textFocus]);

  const actorNames = names.actors(scene, props.cast);
  const actor = scene.actors.find((a) => a.id === bubble.actorId);
  const packFont = actor
    ? LIBRARY.actorFont(actor.asset)
    : LIBRARY.backgroundFont(scene.background);

  return (
    <div className="pane-section bubble-section">
      <h3>{tr('bubble.title')}</h3>
      <label htmlFor={ids.text} className="pane-label">
        {tr('bubble.text')}
      </label>
      <textarea
        id={ids.text}
        ref={textRef}
        className="pane-textarea"
        rows={3}
        maxLength={L.bubbleText}
        value={bubble.text}
        onChange={(e) => {
          const text = e.target.value;
          editRun('text', (b) => ({ ...b, text }));
        }}
        onBlur={endRun}
      />

      <NumberField
        label={tr('properties.start')}
        value={bubble.t}
        step={0.1}
        decimals={2}
        unit={tr('properties.seconds')}
        onChange={(v, closed) => {
          const t = savedTime(v);
          set('t', t);
          // The playhead stays with the new selection.
          if (!closed) props.onSeek(t);
        }}
      />
      <NumberField
        label={tr('bubble.length')}
        value={bubbleLength(bubble)}
        step={0.5}
        decimals={2}
        unit={tr('properties.seconds')}
        onChange={(v) =>
          set(
            'length',
            savedTime(clamp(v, L.bubbleLength.min, L.bubbleLength.max)),
          )
        }
      />
      {bubble.length === undefined ? (
        <p className="muted small">{tr('bubble.lengthAuto')}</p>
      ) : (
        <button
          type="button"
          className="button small"
          onClick={() => edit((b) => setOptional(b, 'length', undefined))}
        >
          {tr('bubble.lengthFromText')}
        </button>
      )}

      <div className="pane-row">
        <label htmlFor={ids.actor}>{tr('bubble.attachedTo')}</label>
        <select
          id={ids.actor}
          className="pane-select"
          value={bubble.actorId ?? ''}
          onChange={(e) =>
            edit((b) => attachBubble(b, e.target.value || null, props.anchors))
          }
        >
          <option value="">{tr('bubble.free')}</option>
          {scene.actors
            .filter((a) => props.anchors.has(a.id))
            .map((a) => (
              <option key={a.id} value={a.id}>
                {actorNames.get(a.id)}
              </option>
            ))}
        </select>
      </div>
      <p className="muted small">
        {tr(bubble.actorId ? 'bubble.placeAttached' : 'bubble.placeFree')}
      </p>
      <NumberField
        label={tr('properties.x')}
        value={bubble.at.x}
        step={10}
        decimals={1}
        onChange={(x) => set('at', savedPoint({ ...bubble.at, x }))}
      />
      <NumberField
        label={tr('properties.y')}
        value={bubble.at.y}
        step={10}
        decimals={1}
        onChange={(y) => set('at', savedPoint({ ...bubble.at, y }))}
      />

      <h4>{tr('bubble.shapeTitle')}</h4>
      <Choice
        label="bubble.shape"
        options={SHAPES}
        value={bubble.shape}
        text={(s) => `bubble.shape.${s}` as TextKey}
        onChange={(shape) => set('shape', shape)}
      />
      <Toggle
        label="bubble.tail"
        on={bubble.tail}
        onChange={(tail) => set('tail', tail)}
      />
      {bubble.tail && bubble.tailTip && (
        <button
          type="button"
          className="button small"
          onClick={() => edit((b) => setOptional(b, 'tailTip', undefined))}
        >
          {tr(bubble.actorId ? 'bubble.tailToHead' : 'bubble.tailDown')}
        </button>
      )}
      <NumberField
        label={tr('bubble.width')}
        value={bubble.width}
        step={20}
        decimals={0}
        onChange={(v) =>
          set(
            'width',
            Math.round(clamp(v, L.bubbleWidth.min, L.bubbleWidth.max)),
          )
        }
      />
      <ColorField
        label="bubble.fill"
        value={bubble.fill}
        onChange={(fill) => editRun('fill', (b) => ({ ...b, fill }))}
        onDone={endRun}
      />
      <div className="pane-row">
        <label htmlFor={ids.border}>{tr('bubble.border')}</label>
        <select
          id={ids.border}
          className="pane-select"
          value={bubble.border}
          onChange={(e) => set('border', e.target.value as BubbleBorder)}
        >
          {BORDERS.map((b) => (
            <option key={b} value={b}>
              {tr(`bubble.border.${b}` as TextKey)}
            </option>
          ))}
        </select>
      </div>
      {bubble.border !== 'none' && (
        <>
          <ColorField
            label="bubble.borderColor"
            value={bubble.borderColor}
            onChange={(borderColor) =>
              editRun('borderColor', (b) => ({ ...b, borderColor }))
            }
            onDone={endRun}
          />
          <NumberField
            label={tr('bubble.borderWidth')}
            value={bubble.borderWidth}
            step={1}
            decimals={1}
            onChange={(v) =>
              set('borderWidth', clamp(v, L.borderWidth.min, L.borderWidth.max))
            }
          />
        </>
      )}
      <Toggle
        label="bubble.pop"
        on={bubble.pop !== false}
        onChange={(on) =>
          edit((b) => setOptional(b, 'pop', on ? undefined : false))
        }
      />

      <h4>{tr('bubble.textTitle')}</h4>
      <div className="pane-row">
        <label htmlFor={ids.font}>{tr('bubble.font')}</label>
        <select
          id={ids.font}
          className="pane-select"
          value={bubble.font ?? ''}
          onChange={(e) =>
            edit((b) =>
              setOptional(
                b,
                'font',
                (e.target.value || undefined) as BubbleFontId | undefined,
              ),
            )
          }
        >
          <option value="">
            {tr('bubble.fontDefault', { font: fontFamily(packFont) })}
          </option>
          {BUBBLE_FONTS.map((f) => (
            <option key={f} value={f}>
              {fontFamily(f)}
            </option>
          ))}
        </select>
      </div>
      <NumberField
        label={tr('bubble.fontSize')}
        value={bubble.fontSize}
        step={4}
        decimals={0}
        onChange={(v) =>
          set('fontSize', Math.round(clamp(v, L.fontSize.min, L.fontSize.max)))
        }
      />
      <ColorField
        label="bubble.color"
        value={bubble.color}
        onChange={(color) => editRun('color', (b) => ({ ...b, color }))}
        onDone={endRun}
      />
      <div className="segmented" role="group" aria-label={tr('bubble.style')}>
        {(['bold', 'italic', 'caps'] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={bubble[key] === true}
            onClick={() =>
              edit((b) => setOptional(b, key, b[key] ? undefined : true))
            }
          >
            {tr(`bubble.${key}`)}
          </button>
        ))}
      </div>
      <Choice
        label="bubble.align"
        options={ALIGNS}
        value={bubble.align ?? 'center'}
        text={(a) => `bubble.align.${a}` as TextKey}
        onChange={(align) =>
          edit((b) =>
            setOptional(b, 'align', align === 'center' ? undefined : align),
          )
        }
      />
      <NumberField
        label={tr('bubble.lineSpacing')}
        value={bubble.lineSpacing ?? 1.2}
        step={0.1}
        decimals={2}
        unit="×"
        onChange={(v) =>
          set(
            'lineSpacing',
            Math.round(clamp(v, L.lineSpacing.min, L.lineSpacing.max) * 100) /
              100,
          )
        }
      />
    </div>
  );
}

function Choice<T extends string>(props: {
  label: TextKey;
  options: readonly T[];
  value: T;
  text(option: T): TextKey;
  onChange(value: T): void;
}) {
  const { tr } = useI18n();
  return (
    <div className="pane-choice">
      <span>{tr(props.label)}</span>
      <div className="segmented" role="group" aria-label={tr(props.label)}>
        {props.options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={props.value === o}
            onClick={() => props.onChange(o)}
          >
            {tr(props.text(o))}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle(props: {
  label: TextKey;
  on: boolean;
  onChange(on: boolean): void;
}) {
  const { tr } = useI18n();
  return (
    <div className="pane-choice">
      <span>{tr(props.label)}</span>
      <div className="segmented" role="group" aria-label={tr(props.label)}>
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={props.on === v}
            onClick={() => props.onChange(v)}
          >
            {tr(v ? 'bubble.on' : 'bubble.off')}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ColorField(props: {
  label: TextKey;
  value: string;
  onChange(value: string): void;
  /** The user closed the color picker. */
  onDone(): void;
}): ReactNode {
  const { tr } = useI18n();
  const id = useId();
  return (
    <div className="pane-row">
      <label htmlFor={id}>{tr(props.label)}</label>
      <input
        id={id}
        type="color"
        className="pane-color"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onDone}
      />
    </div>
  );
}
