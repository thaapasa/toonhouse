import { useQuery } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { type ReactNode, useEffect, useState } from 'react';

import { meQuery } from '../api.ts';
import { type TextKey, useI18n } from '../i18n/index.tsx';

/** Shows the children to logged-in users and sends the others to the login page. */
export function RequireUser({ children }: { children: ReactNode }) {
  const router = useRouter();
  const navigate = useNavigate();
  // The location changes to the login page before this component unmounts,
  // so keep the location of the page that the user opened.
  const [href] = useState(() => router.state.location.href);
  const me = useQuery(meQuery);
  const needsLogin = me.isSuccess && !me.data.user;

  useEffect(() => {
    if (needsLogin) {
      void navigate({
        to: '/login',
        search: { redirect: href },
        replace: true,
      });
    }
  }, [needsLogin, href, navigate]);

  if (me.isPending || needsLogin) return <PageMessage text="loading" />;
  if (me.isError) return <PageMessage text="loadError" />;
  return children;
}

export function PageMessage({ text }: { text: TextKey }) {
  const { tr } = useI18n();
  return <p className="page-message">{tr(text)}</p>;
}
