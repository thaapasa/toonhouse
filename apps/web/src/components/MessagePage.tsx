import type { TextKey } from '../i18n/index.tsx';
import { AppHeader } from './AppHeader.tsx';
import { PageMessage } from './RequireUser.tsx';

/** A message in place of a page, with the header to get back home. */
export function MessagePage({ text }: { text: TextKey }) {
  return (
    <div className="page">
      <AppHeader />
      <PageMessage text={text} />
    </div>
  );
}
