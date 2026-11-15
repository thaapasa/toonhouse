import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { en, type TextKey, type Texts } from './en.ts';
import { fi } from './fi.ts';

export type { TextKey } from './en.ts';
export type Lang = 'fi' | 'en';
export const LANGS: readonly Lang[] = ['fi', 'en'];
const TEXTS: Record<Lang, Texts> = { fi, en };
const STORAGE_KEY = 'toonhouse-lang';

/** Whether a key made at run time, such as from an asset id, has a text. */
export const isTextKey = (key: string): key is TextKey => key in en;

function initialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'fi' || saved === 'en') return saved;
  return navigator.language.toLowerCase().startsWith('fi') ? 'fi' : 'en';
}

interface I18n {
  lang: Lang;
  setLang(lang: Lang): void;
  /** The text for `key`, with `{name}` replaced from `vars`. */
  tr(key: TextKey, vars?: Record<string, string | number>): string;
  /** A date, such as the date of an edit, in the format of the language. */
  formatDate(iso: string): string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(() => {
    const l = initialLang();
    document.documentElement.lang = l;
    return l;
  });
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
    setLangState(l);
  }, []);
  const value = useMemo<I18n>(() => {
    const dateFormat = new Intl.DateTimeFormat(
      lang === 'fi' ? 'fi-FI' : 'en-GB',
      {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      },
    );
    return {
      lang,
      setLang,
      tr: (key, vars) =>
        TEXTS[lang][key].replace(/\{(\w+)\}/g, (m, name: string) =>
          String(vars?.[name] ?? m),
        ),
      formatDate: (iso) => dateFormat.format(new Date(iso)),
    };
  }, [lang, setLang]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useI18n needs an I18nProvider');
  return i18n;
}
