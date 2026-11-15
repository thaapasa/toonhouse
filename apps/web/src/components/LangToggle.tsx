import { LANGS, useI18n } from '../i18n/index.tsx';

export function LangToggle() {
  const { tr, lang, setLang } = useI18n();
  return (
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
  );
}
