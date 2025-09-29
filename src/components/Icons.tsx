interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function RefreshIcon({ size = 16, className = '', style = {} }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export function CheckIcon({ size = 16, className = '', style = {} }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function XIcon({ size = 16, className = '', style = {} }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 16, className = '', style = {} }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function CometBFTLogo({ size = 40, className = '', style = {} }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1000 1000"
      fill="currentColor"
      className={className}
      style={style}
    >
      <g transform="translate(0,1000) scale(0.1,-0.1)">
        <path d="M930 9714 c0 -3 346 -570 770 -1259 l769 -1253 -762 -1219 c-419 -670 -773 -1235 -786 -1255 l-23 -38 604 0 603 0 516 858 c451 751 518 857 539 857 21 0 84 -101 512 -814 269 -448 485 -817 481 -821 -4 -4 -851 -297 -1880 -651 l-1873 -644 0 -681 0 -682 163 -56 c89 -31 806 -279 1592 -550 l1430 -494 -3 -283 c-2 -156 -6 -291 -8 -300 -4 -13 83 -46 468 -177 260 -89 480 -163 488 -164 13 -3 16 39 26 284 6 158 13 290 16 293 3 3 193 -60 424 -140 l419 -145 518 0 517 0 0 1581 0 1580 27 -3 c25 -3 153 -186 1109 -1578 l1081 -1575 471 -3 472 -2 0 2510 0 2510 -530 0 -530 0 0 -1586 0 -1585 -26 3 c-23 3 -172 214 -1045 1477 l-1019 1474 0 2269 0 2268 -1127 0 -1128 0 -510 -860 c-458 -771 -513 -859 -535 -860 -23 0 -74 82 -534 860 l-508 860 -594 0 c-327 0 -594 -3 -594 -6z m4470 -2486 c0 -2126 -2 -2480 -14 -2468 -8 8 -354 561 -770 1228 l-757 1213 712 1167 c836 1369 819 1342 825 1342 2 0 4 -1117 4 -2482z m0 -4438 c0 -698 -3 -1270 -6 -1270 -9 0 -778 251 -782 255 -2 2 6 243 17 537 12 293 21 565 21 605 l0 71 -515 -296 -514 -297 -1 -147 c0 -82 -3 -148 -7 -148 -5 0 -469 150 -1033 333 -992 323 -1025 334 -1028 359 -3 23 2 28 45 41 535 173 3005 975 3453 1122 173 57 323 104 333 104 16 1 17 -66 17 -1269z" />
      </g>
    </svg>
  );
}

export function PencilIcon({ size = 16, className = '', style = {} }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
