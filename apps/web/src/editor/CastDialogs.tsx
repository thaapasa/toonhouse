// The dialogs of the cast: the dialog where the user names a cast member and
// changes its settings, and the dialog that makes a cast member from an
// actor without one.
import { CONTENT_LIMITS } from '@toonhouse/api';
import type { CartoonContent, CastMember } from '@toonhouse/model';
import { DEFAULT_SCALE } from '@toonhouse/renderer';
import { useRef, useState } from 'react';

import { Dialog } from '../components/Dialog.tsx';
import { useI18n } from '../i18n/index.tsx';
import { rigAsset } from '../library/index.ts';
import {
  castUsers,
  savedName,
  updateCastMember,
  withColor,
  withScale,
} from './castEdit.ts';
import type { EditRun } from './history.ts';
import { useNames } from './names.ts';
import { RigPicture } from './RigPicture.tsx';
import { SettingsFields } from './SettingsFields.tsx';

type Edit = (fn: (c: CartoonContent) => CartoonContent, run?: EditRun) => void;

/** The name, the picture and the settings of a cast member. */
export function CastMemberDialog(props: {
  member: CastMember;
  content: CartoonContent;
  onEdit: Edit;
  onRemove(): void;
  onClose(): void;
}) {
  const { tr } = useI18n();
  const names = useNames();
  const { member } = props;
  const [confirming, setConfirming] = useState(false);
  const asset = rigAsset(member.asset);
  const users = castUsers(props.content, member.id);
  // The letters typed into the name are one undo step.
  const run = useRef<EditRun | null>(null);
  const edit = (fn: (m: CastMember) => CastMember, r?: EditRun) =>
    props.onEdit((c) => updateCastMember(c, member.id, fn), r);
  const name = names.member(member);

  if (confirming)
    return (
      <Dialog
        title={tr('cast.removeTitle', { name })}
        onClose={() => setConfirming(false)}
      >
        <p className="muted">{tr('cast.removeInfo', { n: users })}</p>
        <div className="row end">
          <button
            type="button"
            className="button"
            onClick={() => setConfirming(false)}
          >
            {tr('cancel')}
          </button>
          <button
            type="button"
            className="button danger"
            onClick={props.onRemove}
          >
            {tr('cast.removeConfirm')}
          </button>
        </div>
      </Dialog>
    );

  const settings = {
    scale: member.settings.scale ?? DEFAULT_SCALE,
    colors: member.settings.colors ?? {},
  };
  return (
    <Dialog title={tr('cast.edit', { name })} onClose={props.onClose}>
      <div className="cast-dialog">
        <div className="cast-preview">
          {asset && (
            <RigPicture
              asset={asset}
              colors={member.settings.colors}
              prefix={`member-${member.id}`}
              className="cast-picture"
            />
          )}
          <p className="muted small">
            {tr('cast.madeFrom', { name: names.asset(member.asset) })}
          </p>
          <p className="muted small">{tr('cast.users', { n: users })}</p>
        </div>
        <div className="cast-fields">
          <label className="field">
            <span>{tr('cast.name')}</span>
            <input
              value={member.name}
              maxLength={CONTENT_LIMITS.castName}
              onChange={(e) => {
                const text = savedName(e.target.value);
                run.current ??= {};
                edit((m) => ({ ...m, name: text }), run.current);
              }}
              onBlur={() => {
                run.current = null;
              }}
            />
          </label>
          {asset && (
            <>
              <p className="muted small">{tr('settings.memberHint')}</p>
              <SettingsFields
                rig={asset.rig}
                settings={settings}
                onScale={(v) =>
                  edit((m) => ({ ...m, settings: withScale(m.settings, v) }))
                }
                onColor={(setting, preset) =>
                  edit((m) => ({
                    ...m,
                    settings: withColor(m.settings, setting, preset),
                  }))
                }
              />
            </>
          )}
        </div>
      </div>
      <div className="row end">
        <button
          type="button"
          className="button danger"
          onClick={() => (users > 0 ? setConfirming(true) : props.onRemove())}
        >
          {tr('cast.remove')}
        </button>
        <div className="spacer" />
        <button
          type="button"
          className="button primary"
          onClick={props.onClose}
        >
          {tr('cast.done')}
        </button>
      </div>
    </Dialog>
  );
}

/** Asks the name of a new cast member made from an actor. */
export function FromActorDialog(props: {
  /** The name to start from, such as the name of the character. */
  initialName: string;
  onCreate(name: string): void;
  onClose(): void;
}) {
  const { tr } = useI18n();
  const [name, setName] = useState(props.initialName);
  return (
    <Dialog title={tr('cast.fromActorTitle')} onClose={props.onClose}>
      <form
        className="card-form"
        onSubmit={(e) => {
          e.preventDefault();
          props.onCreate(name);
        }}
      >
        <p className="muted">{tr('cast.fromActorInfo')}</p>
        <label className="field">
          <span>{tr('cast.name')}</span>
          <input
            value={name}
            maxLength={CONTENT_LIMITS.castName}
            // The dialog opens to type the name.
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="row end">
          <button type="button" className="button" onClick={props.onClose}>
            {tr('cancel')}
          </button>
          <button type="submit" className="button primary">
            {tr('cast.create')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
