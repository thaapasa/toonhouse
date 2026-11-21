import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { Profile } from '@toonhouse/api';
import { type FormEvent, useState } from 'react';

import {
  ApiError,
  groupsQuery,
  logout,
  meQuery,
  profileQuery,
  resetPassword,
  updateDisplayName,
} from '../api.ts';
import { AppHeader } from '../components/AppHeader.tsx';
import { Dialog } from '../components/Dialog.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { CheckIcon, CopyIcon } from '../components/icons.tsx';
import { PageMessage, RequireUser } from '../components/RequireUser.tsx';
import { type TextKey, useI18n } from '../i18n/index.tsx';

export function ProfilePage() {
  return (
    <div className="page">
      <AppHeader />
      <RequireUser>
        <ProfileContent />
      </RequireUser>
    </div>
  );
}

function ProfileContent() {
  const { tr } = useI18n();
  const profile = useQuery(profileQuery);

  if (profile.isPending) return <PageMessage text="loading" />;
  if (profile.isError) return <PageMessage text="loadError" />;
  return (
    <main className="narrow">
      <h1 className="page-title">{tr('profile.title')}</h1>
      <NameCard profile={profile.data} />
      <PasswordCard profile={profile.data} />
      <GroupsCard />
      <LogoutButton />
    </main>
  );
}

function NameCard({ profile }: { profile: Profile }) {
  const { tr, formatDate } = useI18n();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const save = useMutation({
    mutationFn: () => updateDisplayName(displayName),
    onSuccess: async (user) => {
      queryClient.setQueryData(meQuery.queryKey, { user });
      await queryClient.invalidateQueries(profileQuery);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <section className="card">
      <h2>{tr('profile.name')}</h2>
      <p className="muted">
        {tr('profile.account', {
          username: profile.username,
          date: formatDate(profile.createdAt),
        })}
      </p>
      <form className="card-form" onSubmit={onSubmit}>
        <label className="field">
          <span>{tr('profile.displayName')}</span>
          <input
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              save.reset();
            }}
            required
            maxLength={100}
          />
        </label>
        {save.isError && (
          <p role="alert" className="error">
            {tr('profile.saveNameError')}
          </p>
        )}
        <div className="row">
          <button
            type="submit"
            className="button primary"
            disabled={
              save.isPending ||
              !displayName.trim() ||
              displayName.trim() === profile.displayName
            }
          >
            {tr('profile.saveName')}
          </button>
          {save.isSuccess && (
            <span role="status" className="muted">
              {tr('profile.nameSaved')}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function PasswordCard({ profile }: { profile: Profile }) {
  const { tr, formatDate } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <section className="card">
      <h2>{tr('profile.password')}</h2>
      <p className="muted">
        {tr('profile.passwordChanged', {
          date: formatDate(profile.passwordChangedAt),
        })}
      </p>
      <div className="row">
        <button type="button" className="button" onClick={() => setOpen(true)}>
          {tr('profile.resetPassword')}
        </button>
      </div>
      {open && <ResetPasswordDialog onClose={() => setOpen(false)} />}
    </section>
  );
}

function resetErrorKey(error: Error): TextKey {
  if (error instanceof ApiError && error.status === 403)
    return 'profile.wrongPassword';
  if (error instanceof ApiError && error.status === 429)
    return 'profile.tooManyAttempts';
  return 'profile.resetError';
}

/**
 * Asks for the current password, and then shows the new password that the
 * server made. The password shows only once, so closing the dialog forgets it.
 */
function ResetPasswordDialog({ onClose }: { onClose: () => void }) {
  const { tr } = useI18n();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const reset = useMutation({
    mutationFn: () => resetPassword(currentPassword),
    onSuccess: () => queryClient.invalidateQueries(profileQuery),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    reset.mutate();
  };

  if (reset.isSuccess) {
    return (
      <Dialog title={tr('profile.newPassword')} onClose={onClose}>
        <p className="muted">{tr('profile.newPasswordInfo')}</p>
        <SecretField label={tr('profile.newPassword')} value={reset.data} />
        <div className="row end">
          <button type="button" className="button primary" onClick={onClose}>
            {tr('close')}
          </button>
        </div>
      </Dialog>
    );
  }
  return (
    <Dialog title={tr('profile.resetPassword')} onClose={onClose}>
      <form className="card-form" onSubmit={onSubmit}>
        <p className="muted">{tr('profile.resetPasswordInfo')}</p>
        <label className="field">
          <span>{tr('profile.currentPassword')}</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            autoFocus
          />
        </label>
        {reset.isError && (
          <p role="alert" className="error">
            {tr(resetErrorKey(reset.error))}
          </p>
        )}
        <div className="row end">
          <button type="button" className="button" onClick={onClose}>
            {tr('cancel')}
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={reset.isPending}
          >
            {tr('profile.resetPassword')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** A read-only field with a copy button. */
function SecretField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  // The clipboard API works only on HTTPS and on localhost. Elsewhere the user
  // selects the text.
  const canCopy = !!navigator.clipboard;

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  };

  return (
    <div className="secret">
      <input
        className="secret-value"
        value={value}
        readOnly
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
      />
      {canCopy && (
        <IconButton
          label={copied ? 'profile.copied' : 'profile.copy'}
          onClick={() => void copy()}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </IconButton>
      )}
    </div>
  );
}

function GroupsCard() {
  const { tr } = useI18n();
  const groups = useQuery(groupsQuery);
  return (
    <section className="card">
      <h2>{tr('profile.groups')}</h2>
      {groups.isPending ? (
        <p className="muted">{tr('loading')}</p>
      ) : groups.isError ? (
        <p className="muted">{tr('loadError')}</p>
      ) : groups.data.length === 0 ? (
        <p className="muted">{tr('profile.noGroups')}</p>
      ) : (
        <ul className="group-list">
          {groups.data.map((g) => (
            <li key={g.id}>{g.name}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LogoutButton() {
  const { tr } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const signOut = useMutation({
    mutationFn: logout,
    // Leave the page first, or it would send the user to the login page.
    onSuccess: async () => {
      await navigate({ to: '/' });
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
      queryClient.setQueryData(meQuery.queryKey, { user: null });
    },
  });
  return (
    <div className="row">
      <button
        type="button"
        className="button"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        {tr('profile.logout')}
      </button>
    </div>
  );
}
