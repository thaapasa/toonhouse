import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';

import { ApiError, cartoonQuery, contentQuery } from '../api.ts';
import { AppHeader } from '../components/AppHeader.tsx';
import { PageMessage } from '../components/RequireUser.tsx';
import type { TextKey } from '../i18n/index.tsx';
import { Player } from '../player/Player.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';

const route = getRouteApi('/cartoons/$cartoonId');

/** Anyone who can watch the cartoon can open the player, also without logging in. */
export function PlayerPage() {
  const { cartoonId } = route.useParams();
  const cartoon = useQuery(cartoonQuery(cartoonId));
  // The owner may have changed the cartoon since it was last loaded.
  const content = useQuery({ ...contentQuery(cartoonId), staleTime: 30_000 });

  const notFound = [cartoon, content].some(
    (q) => q.error instanceof ApiError && q.error.status === 404,
  );
  if (notFound) return <NotFoundPage />;
  if (cartoon.isError || content.isError) return <Fallback text="loadError" />;
  if (cartoon.isPending || content.isPending)
    return <Fallback text="loading" />;
  return (
    <Player key={cartoonId} cartoon={cartoon.data} content={content.data} />
  );
}

function Fallback({ text }: { text: TextKey }) {
  return (
    <div className="page">
      <AppHeader />
      <PageMessage text={text} />
    </div>
  );
}
