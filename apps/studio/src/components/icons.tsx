// Icons from the studio board in design/project/Studio.dc.html.
const common = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export const LogoIcon = () => (
  <svg {...common} width={20} height={20} stroke="#F2B544" strokeWidth={2}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 15l4 2.5-4 2.5z" fill="#F2B544" />
  </svg>
);

export const BonesIcon = () => (
  <svg {...common} width={15} height={15}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8 8l8 8" />
  </svg>
);

export const GroundIcon = () => (
  <svg {...common} width={15} height={15}>
    <path d="M3 16h18" />
    <path d="M6 20l2-4M12 20l2-4M18 20l2-4" />
  </svg>
);

export const FlipIcon = () => (
  <svg {...common} width={15} height={15}>
    <path d="M12 3v18" strokeDasharray="2 2.5" />
    <path d="M9 7L4 12l5 5z" />
    <path d="M15 7l5 5-5 5" />
  </svg>
);

export const MinusIcon = () => (
  <svg {...common} width={14} height={14} strokeWidth={2}>
    <path d="M5 12h14" />
  </svg>
);

export const PlusIcon = () => (
  <svg {...common} width={14} height={14} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const PlayIcon = () => (
  <svg {...common} stroke="none">
    <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
  </svg>
);

export const PauseIcon = () => (
  <svg {...common} stroke="none">
    <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
    <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
  </svg>
);

export const StepBackIcon = () => (
  <svg {...common}>
    <path d="M6 5v14" />
    <path d="M19 5l-10 7 10 7z" />
  </svg>
);

export const StepForwardIcon = () => (
  <svg {...common}>
    <path d="M18 5v14" />
    <path d="M5 5l10 7-10 7z" />
  </svg>
);

export const LoopIcon = () => (
  <svg {...common}>
    <path d="M17 2l3 3-3 3" />
    <path d="M4 11V9a4 4 0 0 1 4-4h12" />
    <path d="M7 22l-3-3 3-3" />
    <path d="M20 13v2a4 4 0 0 1-4 4H4" />
  </svg>
);

const ARROW_TURN = { up: 0, right: 90, down: 180, left: 270 } as const;

export const ArrowIcon = ({ dir }: { dir: keyof typeof ARROW_TURN }) => (
  <svg {...common} strokeWidth={2.2}>
    <g transform={`rotate(${ARROW_TURN[dir]} 12 12)`}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </g>
  </svg>
);

export const BackIcon = () => (
  <svg {...common} width={15} height={15}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

/** A turn to the left (-1, counterclockwise) or to the right (1). */
export const TurnIcon = ({ dir }: { dir: 1 | -1 }) => (
  <svg {...common}>
    <g transform={dir === -1 ? 'translate(24 0) scale(-1 1)' : undefined}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
    </g>
  </svg>
);
