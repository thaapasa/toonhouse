import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';

import { ApiError, login, meQuery } from '../api.ts';
import { AppHeader } from '../components/AppHeader.tsx';
import { type TextKey, useI18n } from '../i18n/index.tsx';

const route = getRouteApi('/login');

function loginErrorKey(error: Error): TextKey {
  if (error instanceof ApiError && error.status === 401) return 'login.invalid';
  if (error instanceof ApiError && error.status === 429)
    return 'login.tooManyAttempts';
  return 'login.error';
}

export function LoginPage() {
  const { tr } = useI18n();
  const { redirect = '/' } = route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const submit = useMutation({
    mutationFn: () => login({ username, password }),
    onSuccess: async (user) => {
      // The lists change with the user, so the old ones must not show.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
      queryClient.setQueryData(meQuery.queryKey, { user });
      await navigate({ href: redirect, replace: true });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit.mutate();
  };

  return (
    <div className="page">
      <AppHeader />
      <main className="narrow">
        <h1 className="page-title">{tr('login.title')}</h1>
        <form className="card" onSubmit={onSubmit}>
          <label className="field">
            <span>{tr('login.username')}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              autoFocus
            />
          </label>
          <label className="field">
            <span>{tr('login.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {submit.isError && (
            <p role="alert" className="error">
              {tr(loginErrorKey(submit.error))}
            </p>
          )}
          <button
            type="submit"
            className="button primary large"
            disabled={submit.isPending}
          >
            {tr('login.submit')}
          </button>
        </form>
      </main>
    </div>
  );
}
