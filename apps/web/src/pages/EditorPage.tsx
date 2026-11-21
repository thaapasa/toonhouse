import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';

import { ApiError, cartoonQuery, contentQuery } from '../api.ts';
import { AppHeader } from '../components/AppHeader.tsx';
import { PageMessage, RequireUser } from '../components/RequireUser.tsx';
import { Editor } from '../editor/Editor.tsx';
import type { TextKey } from '../i18n/index.tsx';
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

  if (cartoon.isPending) return <Fallback text="loading" />;
  if (cartoon.isError) {
    return cartoon.error instanceof ApiError && cartoon.error.status === 404 ? (
      <NotFoundPage />
    ) : (
      <Fallback text="loadError" />
    );
  }
  if (!cartoon.data.canEdit) return <Fallback text="editor.notOwner" />;
  if (content.isError) return <Fallback text="loadError" />;
  if (!content.isFetchedAfterMount || content.isPending)
    return <Fallback text="loading" />;
  return (
    <Editor key={cartoonId} cartoon={cartoon.data} initial={content.data} />
  );
}

/** A message in place of the editor, with the header to get back home. */
function Fallback({ text }: { text: TextKey }) {
  return (
    <div className="page">
      <AppHeader />
      <PageMessage text={text} />
    </div>
  );
}
