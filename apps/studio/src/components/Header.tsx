import { LANGS, useI18n } from '../i18n/index.tsx';
import { LogoIcon } from './icons.tsx';

export function Header({ file }: { file: string }) {
  const { tr, lang, setLang } = useI18n();
  const slash = file.lastIndexOf('/') + 1;
  return (
    <header className="header">
      <div className="brand">
        <LogoIcon />
        <span className="brand-name">{tr('appName')}</span>
        <span className="badge">{tr('devBadge')}</span>
      </div>
      <div className="divider" />
      <div className="file">
        {file.slice(0, slash)}
        <span className="file-name">{file.slice(slash)}</span>
      </div>
      <div className="spacer" />
      <div className="segmented" role="group" aria-label={tr('language')}>
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={l === lang}
            onClick={() => setLang(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}
