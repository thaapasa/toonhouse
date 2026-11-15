import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { meQuery } from '../api.ts';
import { useI18n } from '../i18n/index.tsx';
import { LogoIcon } from './icons.tsx';
import { LangToggle } from './LangToggle.tsx';

/** The header of the pages outside the editor. `actions` go before the user button. */
export function AppHeader({ actions }: { actions?: ReactNode }) {
  const { tr } = useI18n();
  const me = useQuery(meQuery);
  const user = me.data?.user;
  const location = useLocation();

  return (
    <header className="app-header">
      <Link to="/" className="brand">
        <LogoIcon />
        <span className="brand-name">{tr('appName')}</span>
      </Link>
      <div className="spacer" />
      <LangToggle />
      {actions}
      {user ? (
        <Link
          to="/profile"
          className="avatar"
          aria-label={tr('profile.open', { name: user.displayName })}
          title={user.displayName}
        >
          {user.displayName.charAt(0).toUpperCase()}
        </Link>
      ) : (
        me.isSuccess &&
        location.pathname !== '/login' && (
          <Link
            to="/login"
            search={{ redirect: location.href }}
            className="button"
          >
            {tr('login.open')}
          </Link>
        )
      )}
    </header>
  );
}
