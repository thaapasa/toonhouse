import type { Pt, Rig } from '@toonhouse/model';
import { useState } from 'react';

import { useI18n } from '../i18n/index.tsx';
import {
  type AngleField,
  angleOf,
  attachmentAt,
  attachments,
  findTarget,
  pieceOf,
  pieces,
  type RigTarget,
} from '../rigEdit.ts';
import { useRigNames } from '../rigNames.ts';
import { DrawOrderPanel } from './DrawOrderPanel.tsx';
import { ArrowIcon, TurnIcon } from './icons.tsx';
import { TuningPanel } from './TuningPanel.tsx';

export type SaveStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved' }
  | { state: 'error'; message: string };

const STEPS = [1, 5, 10] as const;

interface Props {
  rig: Rig;
  target: RigTarget | null;
  onTarget(target: RigTarget | null): void;
  /** Moves the selected point to `p`. */
  onMove(p: Pt): void;
  /** The rest angles of the selected piece. */
  angles: readonly AngleField[];
  /** The angle that the piece view edits, or null for the pivot. */
  angleMode: AngleField | null;
  onAngle(field: AngleField, deg: number): void;
  /** Changes the rig, such as its draw order. */
  onRig(rig: Rig): void;
  dirty: boolean;
  status: SaveStatus;
  onSave(): void;
  onRevert(): void;
}

const fmt = (p: Pt) => `${p.x}, ${p.y}`;

export function Inspector(props: Props) {
  const { rig, target, dirty, status } = props;
  const { tr } = useI18n();
  const names = useRigNames();
  const [step, setStep] = useState<number>(1);
  const [tab, setTab] = useState<'rig' | 'tuning' | 'drawOrder'>('rig');
  const found = findTarget(rig, target);
  const list = attachments(rig);
  const groups = [...new Set(list.map((a) => a.group))];

  const pick = (t: RigTarget) => {
    const same =
      target?.type === t.type &&
      (t.type === 'piece'
        ? target.type === 'piece' && target.part === t.part
        : target.type === 'attachment' && target.joint === t.joint);
    props.onTarget(same ? null : t);
  };
  const nudge = (dx: number, dy: number) => {
    if (found) props.onMove({ x: found.at.x + dx, y: found.at.y + dy });
  };
  const field = (axis: 'x' | 'y') =>
    found && (
      <label className="field">
        {tr(axis)}
        <input
          type="number"
          inputMode="numeric"
          step={1}
          value={found.at[axis]}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(v)) {
              props.onMove({ ...found.at, [axis]: Math.round(v) });
            }
          }}
        />
      </label>
    );

  let statusText = '';
  if (status.state === 'saving') statusText = tr('saving');
  else if (status.state === 'error') {
    statusText = tr('saveFailed', { error: status.message });
  } else if (dirty) statusText = tr('unsaved');
  else if (status.state === 'saved') statusText = tr('saved');

  return (
    <aside className="inspector" aria-label={tr('inspector')}>
      <div className="tabs" role="tablist">
        {(['rig', 'tuning', 'drawOrder'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {tr(id)}
          </button>
        ))}
      </div>

      {tab === 'tuning' && (
        <div className="inspector-body">
          <TuningPanel rig={rig} onRig={props.onRig} />
        </div>
      )}
      {tab === 'drawOrder' && (
        <div className="inspector-body">
          <DrawOrderPanel rig={rig} onRig={props.onRig} />
        </div>
      )}
      {/* Hidden rather than removed, so that it keeps its scroll position. */}
      <div className="inspector-body" hidden={tab !== 'rig'}>
        <section className="inspector-section">
          <div className="section-title">{tr('selected')}</div>
          {found ? (
            <>
              <div className="selected-name">
                {found.type === 'attachment'
                  ? names.joint(found.joint)
                  : names.part(found.part)}
                <span>
                  {found.type === 'attachment'
                    ? names.group(found.attachment.group)
                    : tr('pivot')}
                </span>
              </div>
              <div className="fields">
                {field('x')}
                {field('y')}
              </div>
              <div className="nudge-row">
                <div className="nudge" role="group" aria-label={tr('nudge')}>
                  <button
                    type="button"
                    className="up"
                    aria-label={tr('nudgeUp')}
                    title={tr('nudgeUp')}
                    onClick={() => nudge(0, -step)}
                  >
                    <ArrowIcon dir="up" />
                  </button>
                  <button
                    type="button"
                    className="left"
                    aria-label={tr('nudgeLeft')}
                    title={tr('nudgeLeft')}
                    onClick={() => nudge(-step, 0)}
                  >
                    <ArrowIcon dir="left" />
                  </button>
                  <button
                    type="button"
                    className="right"
                    aria-label={tr('nudgeRight')}
                    title={tr('nudgeRight')}
                    onClick={() => nudge(step, 0)}
                  >
                    <ArrowIcon dir="right" />
                  </button>
                  <button
                    type="button"
                    className="down"
                    aria-label={tr('nudgeDown')}
                    title={tr('nudgeDown')}
                    onClick={() => nudge(0, step)}
                  >
                    <ArrowIcon dir="down" />
                  </button>
                </div>
                <div className="step">
                  <span>{tr('step')}</span>
                  <div className="segmented" role="group">
                    {STEPS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={s === step}
                        onClick={() => setStep(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {props.angles.map((f) => {
                const angle = angleOf(rig, f);
                return (
                  <div key={f.id} className="angle-row">
                    <label className="field">
                      {tr(f.label)}
                      <input
                        type="number"
                        inputMode="numeric"
                        step={1}
                        value={angle}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (e.target.value !== '' && Number.isFinite(v)) {
                            props.onAngle(f, v);
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="turn-button"
                      aria-label={tr('turnLeft')}
                      title={tr('turnLeft')}
                      onClick={() => props.onAngle(f, angle - step)}
                    >
                      <TurnIcon dir={-1} />
                    </button>
                    <button
                      type="button"
                      className="turn-button"
                      aria-label={tr('turnRight')}
                      title={tr('turnRight')}
                      onClick={() => props.onAngle(f, angle + step)}
                    >
                      <TurnIcon dir={1} />
                    </button>
                  </div>
                );
              })}
              <div className="hint">
                {tr(
                  found.type === 'attachment'
                    ? 'attachHint'
                    : props.angleMode
                      ? props.angleMode.reference === 'arm'
                        ? 'turnHintArm'
                        : 'turnHintBody'
                      : 'pivotHint',
                )}
              </div>
            </>
          ) : (
            <div className="hint">{tr('pickHint')}</div>
          )}
        </section>

        <section className="inspector-section">
          <div className="section-title">{tr('attachments')}</div>
          {groups.map((g) => (
            <div key={g} className="target-group">
              <div className="group-title">{names.group(g)}</div>
              {list
                .filter((a) => a.group === g)
                .map((a) => (
                  <button
                    key={a.joint}
                    type="button"
                    className="target"
                    aria-pressed={
                      target?.type === 'attachment' && target.joint === a.joint
                    }
                    onClick={() => pick({ type: 'attachment', joint: a.joint })}
                  >
                    <span>{names.joint(a.joint)}</span>
                    <span className="coords">{fmt(attachmentAt(rig, a))}</span>
                  </button>
                ))}
            </div>
          ))}
        </section>

        <section className="inspector-section">
          <div className="section-title">{tr('pivots')}</div>
          {pieces(rig).map((p) => {
            const layers = pieceOf(rig, p).layers ?? [];
            return (
              <div key={p}>
                <button
                  type="button"
                  className="target"
                  aria-pressed={target?.type === 'piece' && target.part === p}
                  onClick={() => pick({ type: 'piece', part: p })}
                >
                  <span>{names.part(p)}</span>
                  <span className="coords">{fmt(pieceOf(rig, p).pivot)}</span>
                </button>
                {layers.length > 0 && (
                  <div className="target-layers">
                    {tr('layersOf', {
                      list: layers.map((l) => names.layer(l.id)).join(', '),
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <div className="inspector-footer">
        <div
          className={status.state === 'error' ? 'status error' : 'status'}
          role="status"
        >
          {statusText}
        </div>
        <div className="actions">
          <button
            type="button"
            className="button"
            disabled={!dirty || status.state === 'saving'}
            onClick={props.onRevert}
          >
            {tr('revert')}
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!dirty || status.state === 'saving'}
            onClick={props.onSave}
          >
            {tr('save')}
          </button>
        </div>
      </div>
    </aside>
  );
}
