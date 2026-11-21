// A number that the user types or steps with the buttons beside it. The
// buttons are big enough for a finger. A typed value takes effect when the
// user presses Enter or leaves the field, so that each change is one undo step.
//
// If the field goes away while the user types, such as when the properties
// pane shows another selection, it saves the value to the thing that the user
// typed it for.
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { MinusIcon, PlusIcon } from '../components/icons.tsx';
import { useI18n } from '../i18n/index.tsx';

interface Props {
  label: string;
  /** Hides the label, when the labels show above a column of fields. */
  hideLabel?: boolean;
  value: number;
  /**
   * `closed` is true when the field saves a typed value because it went away,
   * such as when the user selected something else.
   */
  onChange(value: number, closed: boolean): void;
  /** How much the buttons add or take away. Leave out to hide the buttons. */
  step?: number;
  /** How many decimals to show. */
  decimals: number;
  /** The unit after the value, such as `%` or `s`. */
  unit?: string;
}

export function NumberField(props: Props) {
  const { tr, lang } = useI18n();
  const id = useId();
  // The text while the user types it, or null to show the value.
  const [draft, setDraftState] = useState<string | null>(null);
  // The same draft, for the commit when the field goes away. It also stops a
  // second commit if a `blur` comes after that.
  const draftRef = useRef<string | null>(null);
  const setDraft = (d: string | null) => {
    draftRef.current = d;
    setDraftState(d);
  };
  const format = new Intl.NumberFormat(lang === 'fi' ? 'fi-FI' : 'en-GB', {
    maximumFractionDigits: props.decimals,
    useGrouping: false,
  });

  const commit = (closed = false) => {
    const d = draftRef.current;
    if (d === null) return;
    setDraft(null);
    // Both a comma and a point work as the decimal separator.
    const v = Number(d.trim().replace(',', '.').replace('−', '-'));
    if (d.trim() !== '' && Number.isFinite(v) && v !== props.value)
      props.onChange(v, closed);
  };
  const commitRef = useRef(commit);
  useLayoutEffect(() => {
    commitRef.current = commit;
  });
  useEffect(() => () => commitRef.current(true), []);
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    else if (e.key === 'Escape') {
      setDraft(null);
      e.currentTarget.blur();
    }
  };
  const step = (d: number) => {
    setDraft(null);
    const f = 10 ** props.decimals;
    props.onChange(Math.round((props.value + d) * f) / f, false);
  };

  return (
    <div className="number-field">
      <label htmlFor={id} className={props.hideLabel ? 'hidden-label' : ''}>
        {props.label}
      </label>
      <div className="number-input">
        {props.step !== undefined && (
          <button
            type="button"
            className="step-button"
            aria-label={tr('properties.less', { label: props.label })}
            onClick={() => step(-props.step!)}
          >
            <MinusIcon />
          </button>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft ?? format.format(props.value)}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => commit()}
          onKeyDown={onKey}
        />
        {props.unit && <span className="number-unit">{props.unit}</span>}
        {props.step !== undefined && (
          <button
            type="button"
            className="step-button"
            aria-label={tr('properties.more', { label: props.label })}
            onClick={() => step(props.step!)}
          >
            <PlusIcon />
          </button>
        )}
      </div>
    </div>
  );
}
