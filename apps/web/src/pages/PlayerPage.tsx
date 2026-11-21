import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';

import { ApiError, cartoonQuery, contentQuery } from '../api.ts';
import { MessagePage } from '../components/MessagePage.tsx';
import { cartoonFiles } from '../library/index.ts';
import { useSources } from '../library/sources.ts';
import { Player } from '../player/Player.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';

const route = getRouteApi('/cartoons/$cartoonId');

/** Anyone who can watch the cartoon can open the player, also without logging in. */
export function PlayerPage() {
  const { cartoonId } = route.useParams();
  const cartoon = useQuery(cartoonQuery(cartoonId));
  // The owner may have changed the cartoon since it was last loaded.
  const content = useQuery(contentQuery(cartoonId));
  // The player starts when the SVG files of every scene have loaded, so that
  // the actors don't pop in while the cartoon plays.
  const loaded = useSources(
    content.data ? cartoonFiles(content.data.content) : [],
  );

  const notFound = [cartoon, content].some(
    (q) => q.error instanceof ApiError && q.error.status === 404,
  );
  if (notFound) return <NotFoundPage />;
  if (cartoon.isError || content.isError)
    return <MessagePage text="loadError" />;
  if (cartoon.isPending || content.isPending || !loaded)
    return <MessagePage text="loading" />;
  return (
    <Player
      key={cartoonId}
      cartoon={cartoon.data}
      content={content.data.content}
    />
  );
}
