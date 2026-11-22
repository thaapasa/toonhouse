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

export const PreviewIcon = () => (
  <Icon>
    <path d="M3 8.5a2 2 0 0 1 2-2h2.5L9 4.5h6l1.5 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="13" r="3.5" />
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

/** Two people, for the cast of the cartoon. */
export const CastIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20v-1.5a6 6 0 0 1 12 0V20" />
    <path d="M15.5 5.2a3 3 0 0 1 0 5.6" />
    <path d="M18 13.5a6 6 0 0 1 3 5V20" />
  </Icon>
);

/** An arrow that turns back, for going back to the value of the level above. */
export const ResetIcon = () => (
  <Icon size={18}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4h4" />
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

export const BubbleIcon = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
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

export const ZoomFitIcon = () => (
  <Icon size={18}>
    <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
    <path d="M8 12h8" />
  </Icon>
);

export const CameraIcon = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <rect x="3" y="7" width="13" height="10" rx="2" />
    <path d="M16 11l5-3v8l-5-3" />
  </Icon>
);

export const CameraFitIcon = () => (
  <Icon size={18}>
    <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
    <rect x="7" y="10" width="7" height="5" rx="1" />
    <path d="M14 12l3-1.5v4L14 13" />
  </Icon>
);

export const CameraMoveIcon = () => (
  <Icon>
    <rect x="2" y="8" width="8" height="6" rx="1" strokeDasharray="2 2" />
    <rect x="13" y="6" width="9" height="10" rx="1" />
    <path d="M7 19h9M13 17l3 2-3 2" />
  </Icon>
);

export const CameraJumpIcon = () => (
  <Icon>
    <rect x="2" y="8" width="8" height="6" rx="1" strokeDasharray="2 2" />
    <rect x="13" y="6" width="9" height="10" rx="1" />
    <path d="M10 19h4l-2-4z" />
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

export const PauseIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
  </svg>
);

export const TurnIcon = () => (
  <Icon>
    <path d="M12 3v18" />
    <path d="M8 7L3 17h5z" />
    <path d="M16 7l5 10h-5z" />
  </Icon>
);

export const DeleteIcon = () => (
  <Icon>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </Icon>
);

/** Removes an action from the timeline. */
export const RemoveActionIcon = () => (
  <Icon>
    <rect x="3" y="8" width="18" height="8" rx="2" />
    <path d="M9.5 10.5l5 3M14.5 10.5l-5 3" />
  </Icon>
);

export const SmallerIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="2.5" />
    <path d="M8.5 19v-1a3.5 3.5 0 0 1 7 0v1" />
    <path d="M3 4l3 3M21 4l-3 3M3 20l3-3M21 20l-3-3" />
  </Icon>
);

export const BiggerIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="2.5" />
    <path d="M8.5 19v-1a3.5 3.5 0 0 1 7 0v1" />
    <path d="M6 7L3 4M3 4v3M3 4h3M18 7l3-3M21 4v3M21 4h-3" />
    <path d="M6 17l-3 3M3 20v-3M3 20h3M18 17l3 3M21 20v-3M21 20h-3" />
  </Icon>
);

export const DoneIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={2.2} />
  </Icon>
);

// The clips. Clips without an icon of their own use the stand icon.

export const StandIcon = () => (
  <Icon>
    <circle cx="12" cy="4" r="2" />
    <path d="M12 7v7" />
    <path d="M8 9.5h8" />
    <path d="M12 14l-3 7M12 14l3 7" />
  </Icon>
);

export const WalkIcon = () => (
  <Icon>
    <circle cx="13" cy="4" r="2" />
    <path d="M7 21l3-6 3 2v4" />
    <path d="M10 15l1.5-6 4 3 3 1" />
    <path d="M11.5 9L8 10.5 6.5 13" />
  </Icon>
);

export const WaveIcon = () => (
  <Icon>
    <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M11 10.5V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M14 11V6a1.5 1.5 0 0 1 3 0v6" />
    <path d="M17 10a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4.5a1.5 1.5 0 0 1 2.6-1.5L8 14" />
  </Icon>
);

export const TalkIcon = () => (
  <Icon>
    <path d="M4 5h16v11H11l-5 4v-4H4z" />
  </Icon>
);

export const HopIcon = () => (
  <Icon>
    <path d="M3 18c2-7 5-7 7 0M10 18c2-7 5-7 7 0" />
    <path d="M17 18c1-3 2.5-4 4-4" />
    <path d="M3 21h18" />
  </Icon>
);

export const PeckIcon = () => (
  <Icon>
    <circle cx="9" cy="9" r="4" />
    <path d="M13 9l5 3-5 1" />
    <path d="M4 21h16" />
    <path d="M18 18v1" />
  </Icon>
);

export const FlapIcon = () => (
  <Icon>
    <path d="M12 14c-3-6-7-7-10-6 2 4 5 6 10 6z" />
    <path d="M12 14c3-6 7-7 10-6-2 4-5 6-10 6z" />
    <path d="M12 14v5" />
  </Icon>
);

export const LookoutIcon = () => (
  <Icon>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.5" />
  </Icon>
);

export const RustleIcon = () => (
  <Icon>
    <path d="M3 8h10a3 3 0 1 0-3-3" />
    <path d="M3 12h15a3 3 0 1 1-3 3" />
    <path d="M3 16h6" />
  </Icon>
);

export const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const CloudIcon = () => (
  <Icon>
    <path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 18z" />
  </Icon>
);

/** The properties pane: three sliders. */
export const PropertiesIcon = () => (
  <Icon>
    <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
    <circle cx="15" cy="6" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Icon>
);

/**
 * Attaches the properties pane to the side of the editor. The filled pin
 * shows that the pane is attached.
 */
export const PinIcon = ({ filled = false }: { filled?: boolean }) => (
  <Icon>
    <path
      d="M9 4h6M10 4h4v6l3 4H7l3-4z"
      fill={filled ? 'currentColor' : 'none'}
    />
    <path d="M12 14v6" />
  </Icon>
);

export const MinusIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M5 12h14" strokeWidth={2.2} />
  </Icon>
);

/** Adds a point to a walk before this one. */
export const InsertPointIcon = () => (
  <Icon size={18}>
    <path d="M4 20L20 4" strokeDasharray="2 3" />
    <rect x="8" y="8" width="8" height="8" rx="1.5" />
    <path d="M12 10.5v3M10.5 12h3" />
  </Icon>
);

// The player.

export const EditIcon = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M4 20l1-5L16 4l4 4L9 19z" strokeWidth={2.2} />
    <path d="M14 6l4 4" strokeWidth={2.2} />
  </Icon>
);

export const BigCloseIcon = () => (
  <Icon size={22}>
    <path d="M6 6l12 12M18 6L6 18" strokeWidth={3} />
  </Icon>
);

export const FullscreenIcon = () => (
  <Icon size={22}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeWidth={2.6} />
  </Icon>
);

export const ExitFullscreenIcon = () => (
  <Icon size={22}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeWidth={2.6} />
  </Icon>
);
