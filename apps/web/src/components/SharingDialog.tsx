// The choice of who can watch a cartoon. Only the owner sees it. A tap on a
// choice saves it at once.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Cartoon, Group, Sharing } from '@toonhouse/api';
import { useState } from 'react';

import {
  cartoonQuery,
  cartoonsQuery,
  groupsQuery,
  setSharing,
} from '../api.ts';
import { type TextKey, useI18n } from '../i18n/index.tsx';
import { Dialog } from './Dialog.tsx';
import { IconButton } from './IconButton.tsx';
import { ShareIcon } from './icons.tsx';

/** The button that opens the dialog. */
export function SharingButton({ cartoon }: { cartoon: Cartoon }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        label="sharing.open"
        vars={{ title: cartoon.title }}
        onClick={() => setOpen(true)}
      >
        <ShareIcon />
      </IconButton>
      {open && (
        <SharingDialog cartoon={cartoon} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/** A short text that tells who can watch the cartoon, for the cartoon list. */
export function useSharingText(cartoon: Cartoon): string {
  const { tr } = useI18n();
  switch (cartoon.visibility) {
    case 'private':
      return tr('sharing.isPrivate');
    case 'group':
      return tr('sharing.isGroup', { name: cartoon.group?.name ?? '' });
    case 'users':
      return tr('sharing.isUsers');
    case 'public':
      return tr('sharing.isPublic');
  }
}

type Choice = {
  key: string;
  sharing: Sharing;
  label: string;
  info: string;
};

function SharingDialog(props: { cartoon: Cartoon; onClose: () => void }) {
  const { tr } = useI18n();
  const { cartoon } = props;
  const queryClient = useQueryClient();
  const groups = useQuery(groupsQuery);
  const save = useMutation({
    mutationFn: (sharing: Sharing) => setSharing(cartoon.id, sharing),
    onSuccess: async (saved) => {
      queryClient.setQueryData(cartoonQuery(saved.id).queryKey, saved);
      await queryClient.invalidateQueries({
        queryKey: cartoonsQuery.queryKey,
        exact: true,
      });
    },
  });

  // While a choice saves, it shows as picked.
  const current = save.isPending
    ? sharingKey(save.variables)
    : cartoonKey(cartoon);
  const simple = (
    visibility: 'private' | 'users' | 'public',
    label: TextKey,
    info: TextKey,
  ): Choice => ({
    key: visibility,
    sharing: { visibility },
    label: tr(label),
    info: tr(info),
  });
  const choices: Choice[] = [
    simple('private', 'sharing.private', 'sharing.privateInfo'),
    ...groupList(groups.data, cartoon.group).map((g) => ({
      key: sharingKey({ visibility: 'group', groupId: g.id }),
      sharing: { visibility: 'group' as const, groupId: g.id },
      label: g.name,
      info: tr('sharing.groupInfo'),
    })),
    simple('users', 'sharing.users', 'sharing.usersInfo'),
    simple('public', 'sharing.public', 'sharing.publicInfo'),
  ];

  return (
    <Dialog
      title={tr('sharing.title', { title: cartoon.title })}
      onClose={props.onClose}
    >
      <p className="muted">{tr('sharing.info')}</p>
      <div className="sharing-choices" role="radiogroup">
        {choices.map((choice) => (
          <label key={choice.key} className="sharing-choice">
            <input
              type="radio"
              name="sharing"
              checked={choice.key === current}
              disabled={save.isPending}
              onChange={() => save.mutate(choice.sharing)}
            />
            <span>
              <span className="sharing-label">{choice.label}</span>
              <span className="muted small">{choice.info}</span>
            </span>
          </label>
        ))}
      </div>
      {groups.isError && (
        <p role="alert" className="error">
          {tr('loadError')}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="error">
          {tr('sharing.error')}
        </p>
      )}
      <div className="row end">
        <button type="button" className="button" onClick={props.onClose}>
          {tr('close')}
        </button>
      </div>
    </Dialog>
  );
}

function cartoonKey(cartoon: Cartoon): string {
  return cartoon.visibility === 'group' && cartoon.group
    ? `group:${cartoon.group.id}`
    : cartoon.visibility;
}

function sharingKey(sharing: Sharing): string {
  return sharing.visibility === 'group'
    ? `group:${sharing.groupId}`
    : sharing.visibility;
}

/**
 * The groups of the user. If the owner has left the group that the cartoon is
 * shared with, the group stays in the list, so that the dialog shows the
 * current choice.
 */
function groupList(groups: Group[] | undefined, current: Group | null) {
  const list = groups ?? [];
  return current && !list.some((g) => g.id === current.id)
    ? [...list, current]
    : list;
}
