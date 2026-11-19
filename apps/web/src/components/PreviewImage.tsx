import { useId } from 'react';

/** The x and y of the top of the trunk, and the size of the crown. */
const trees = [
  [20, 61.5, 7],
  [31, 60.5, 5],
  [112, 59.5, 6],
] as const;

/**
 * The preview image of a cartoon on the home page. Until the user sets one in
 * the editor, every cartoon shows the same placeholder: a summer sky with the
 * sun, over a green hill with trees.
 */
export function PreviewImage() {
  // Each card on the page has its own copy of the gradient.
  const skyId = useId();
  return (
    <svg
      className="preview-art"
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD3FA" />
          <stop offset="1" stopColor="#D9F1FF" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill={`url(#${skyId})`} />
      <circle cx="128" cy="20" r="13" fill="#FFF3B0" opacity="0.6" />
      <circle cx="128" cy="20" r="9" fill="#FFD54A" />
      {trees.map(([x, y, r]) => (
        <g key={x}>
          <rect x={x - 1} y={y} width="2" height="14" fill="#8A5A3B" />
          <circle cx={x} cy={y - r / 2} r={r} fill="#4FA83A" />
        </g>
      ))}
      <path
        d="M0 74.5 C35 65.5 75 64.5 105 68.5 C125 71.5 145 71.5 160 69.5 V90 H0 Z"
        fill="#7ACB4F"
        stroke="#23262F"
        strokeWidth="1"
      />
    </svg>
  );
}
