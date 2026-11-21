import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';

import { ApiError, cartoonQuery, contentQuery } from '../api.ts';
import { MessagePage } from '../components/MessagePage.tsx';
import { RequireUser } from '../components/RequireUser.tsx';
import { Editor } from '../editor/Editor.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';

const route = getRouteApi('/cartoons/$cartoonId/edit');

export function EditorPage() {
  return (
    <RequireUser>
      <EditorContent />
    </RequireUser>
  );
}

function EditorContent() {
  const { cartoonId } = route.useParams();
  const cartoon = useQuery(cartoonQuery(cartoonId));
  // The editor starts from the content on the server, not from a copy in the
  // cache, because a save of an old revision fails.
  const content = useQuery({
    ...contentQuery(cartoonId),
    enabled: cartoon.data?.canEdit === true,
    refetchOnMount: 'always',
  });

  if (cartoon.isPending) return <MessagePage text="loading" />;
  if (cartoon.isError) {
    return cartoon.error instanceof ApiError && cartoon.error.status === 404 ? (
      <NotFoundPage />
    ) : (
      <MessagePage text="loadError" />
    );
  }
  if (!cartoon.data.canEdit) return <MessagePage text="editor.notOwner" />;
  if (content.isError) return <MessagePage text="loadError" />;
  if (!content.isFetchedAfterMount || content.isPending)
    return <MessagePage text="loading" />;
  return (
    <Editor key={cartoonId} cartoon={cartoon.data} initial={content.data} />
  );
}
