// A button that shows only an icon, with its translated label as the name and
// the tooltip. It is 44 CSS pixels, or 40 when small, so that a finger hits it.
import type { ReactNode } from 'react';

import { type TextKey, useI18n } from '../i18n/index.tsx';

export function IconButton(props: {
  label: TextKey;
  /** The values of the placeholders in the label. */
  vars?: Record<string, string | number>;
  /** The key that does the same, shown in the tooltip. */
  shortcut?: TextKey;
  pressed?: boolean;
  small?: boolean;
  className?: string;
  /** By default, a button without `onClick` is disabled. */
  disabled?: boolean;
  onClick?: (() => void) | undefined;
  children: ReactNode;
}) {
  const { tr } = useI18n();
  const label = tr(props.label, props.vars);
  const classes = ['icon-button', props.small && 'small', props.className];
  return (
    <button
      type="button"
      className={classes.filter(Boolean).join(' ')}
      aria-label={label}
      aria-pressed={props.pressed}
      title={
        props.shortcut
          ? tr('editor.withKey', { label, key: tr(props.shortcut) })
          : label
      }
      disabled={props.disabled ?? !props.onClick}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
