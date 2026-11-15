import { Link } from '@tanstack/react-router';

import { AppHeader } from '../components/AppHeader.tsx';
import { useI18n } from '../i18n/index.tsx';

export function NotFoundPage() {
  const { tr } = useI18n();
  return (
    <div className="page">
      <AppHeader />
      <main className="narrow">
        <h1 className="page-title">{tr('notFound.title')}</h1>
        <p className="muted">{tr('notFound.text')}</p>
        <Link to="/" className="button">
          {tr('notFound.home')}
        </Link>
      </main>
    </div>
  );
}
