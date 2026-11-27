// The page that takes the place of a page that crashed. A web app on the home
// screen has no reload button and no back button of its own, so this page
// gives both. Both load the page again, so that the broken state is gone.
import type { ErrorComponentProps } from '@tanstack/react-router';
import { Component, type ReactNode, useEffect } from 'react';

import { plainText, type TextKey, useI18n } from '../i18n/index.tsx';

function CrashView({ tr }: { tr: (key: TextKey) => string }) {
  return (
    <div className="page">
      <main className="narrow">
        <h1 className="page-title">{tr('crash.title')}</h1>
        <p className="muted">{tr('crash.text')}</p>
        <div className="row">
          <button
            type="button"
            className="button primary large"
            onClick={() => location.reload()}
          >
            {tr('crash.reload')}
          </button>
          <button
            type="button"
            className="button large"
            onClick={() => location.assign('/')}
          >
            {tr('crash.home')}
          </button>
        </div>
      </main>
    </div>
  );
}

/** The error page of the router, for a crash in a page. */
export function CrashPage({ error }: ErrorComponentProps) {
  const { tr } = useI18n();
  useEffect(() => console.error('The page crashed', error), [error]);
  return <CrashView tr={tr} />;
}

/** Catches a crash outside the router, such as in a provider. */
export class CrashBoundary extends Component<
  { children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('The app crashed', error);
  }

  render() {
    return this.state.crashed ? (
      <CrashView tr={plainText} />
    ) : (
      this.props.children
    );
  }
}
