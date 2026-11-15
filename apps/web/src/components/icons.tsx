// Icons from the boards in design/project.
import type { ReactNode } from 'react';

function Icon({ size = 20, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const LogoIcon = () => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--accent)"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 15l4 2.5-4 2.5z" fill="var(--accent)" />
  </svg>
);

export const PlusIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M12 5v14M5 12h14" strokeWidth={2.2} />
  </Icon>
);

export const BackIcon = () => (
  <Icon>
    <path d="M15 18l-6-6 6-6" />
  </Icon>
);

export const UndoIcon = () => (
  <Icon>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </Icon>
);

export const RedoIcon = () => (
  <Icon>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H9a5 5 0 0 0 0 10h3" />
  </Icon>
);

export const PlayIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
  </svg>
);

export const CharacterIcon = () => (
  <Icon>
    <circle cx="12" cy="7" r="3.5" />
    <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
  </Icon>
);

export const PropIcon = () => (
  <Icon>
    <path d="M12 3l6 8h-3l4 6H5l4-6H6z" />
    <path d="M12 17v4" />
  </Icon>
);

export const BackgroundIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 16l5-5 4 4 3-3 6 6" />
    <circle cx="16" cy="9" r="1.5" />
  </Icon>
);

export const BubbleIcon = () => (
  <Icon>
    <path d="M4 5h16v11H11l-5 4v-4H4z" />
  </Icon>
);

export const SoundIcon = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M9 18V5l10-2v13" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </Icon>
);

export const StepBackIcon = () => (
  <Icon size={18}>
    <path d="M6 5v14" />
    <path d="M19 5l-10 7 10 7z" />
  </Icon>
);

export const StepForwardIcon = () => (
  <Icon size={18}>
    <path d="M18 5v14" />
    <path d="M5 5l10 7-10 7z" />
  </Icon>
);

export const ZoomOutIcon = () => (
  <Icon size={18}>
    <path d="M5 12h14" />
  </Icon>
);

export const ZoomInIcon = () => (
  <Icon size={18}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon size={18}>
    <path d="M6 6l12 12M18 6L6 18" strokeWidth={2} />
  </Icon>
);

export const CopyIcon = () => (
  <Icon>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Icon>
);

export const CheckIcon = () => (
  <Icon>
    <path d="M5 12.5l4.5 4.5L19 7" strokeWidth={2.2} />
  </Icon>
);
