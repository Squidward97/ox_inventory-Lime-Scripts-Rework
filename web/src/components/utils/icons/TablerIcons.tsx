import React from 'react';

// Inlined tabler outline icons (24px grid, 2px stroke) so nothing is fetched at runtime in NUI.
const TablerIcon: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
);

export const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
    <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
  </TablerIcon>
);

export const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M15 6l-6 6l6 6" />
  </TablerIcon>
);

export const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M9 6l6 6l-6 6" />
  </TablerIcon>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M6 9l6 6l6 -6" />
  </TablerIcon>
);

export const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
    <path d="M12 7v5l3 3" />
  </TablerIcon>
);

export const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M5 12l5 5l10 -10" />
  </TablerIcon>
);

export const MinusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M5 12l14 0" />
  </TablerIcon>
);

export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
    <path d="M21 21l-6 -6" />
  </TablerIcon>
);

export const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
    <path d="M12 9h.01" />
    <path d="M11 12h1v4h1" />
  </TablerIcon>
);

export const GridIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
    <path d="M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
    <path d="M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
    <path d="M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
  </TablerIcon>
);

export const FoodIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12m0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3" />
  </TablerIcon>
);

export const PistolOutlineIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M3 8h17v4h-6l-1 2h-3l-1.5 5h-4l1.5 -6.5l-3 -1z" />
    <path d="M10 14v-2" />
    <path d="M17 8v-2" />
  </TablerIcon>
);

export const ShirtIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M15 4l6 2v5h-3v8a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-8h-3v-5l6 -2a3 3 0 0 0 6 0" />
  </TablerIcon>
);

export const ToolIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5" />
  </TablerIcon>
);

export const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />
  </TablerIcon>
);

export const WeightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M9 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M6.835 9h10.33a1 1 0 0 1 .984 .821l1.637 9a1 1 0 0 1 -.984 1.179h-13.604a1 1 0 0 1 -.984 -1.179l1.637 -9a1 1 0 0 1 .984 -.821z" />
  </TablerIcon>
);

export const BackpackOutlineIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M5 18v-6a6 6 0 0 1 6 -6h2a6 6 0 0 1 6 6v6a3 3 0 0 1 -3 3h-8a3 3 0 0 1 -3 -3z" />
    <path d="M10 6v-1a2 2 0 1 1 4 0v1" />
    <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
    <path d="M11 10h2" />
  </TablerIcon>
);

export const WalletIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12" />
    <path d="M20 12v4h-4a2 2 0 0 1 0 -4h4" />
  </TablerIcon>
);

export const IdIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v10a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z" />
    <path d="M7 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M15 8l2 0" />
    <path d="M15 12l2 0" />
    <path d="M7 16l10 0" />
  </TablerIcon>
);

// context menu actions

export const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M7 4v16l13 -8z" />
  </TablerIcon>
);

export const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M10 14l11 -11" />
    <path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />
  </TablerIcon>
);

export const DropIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M4 20l16 0" />
    <path d="M12 14l0 -10" />
    <path d="M12 14l4 -4" />
    <path d="M12 14l-4 -4" />
  </TablerIcon>
);

export const CubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M21 16.008v-8.018a1.98 1.98 0 0 0 -1 -1.717l-7 -4.008a2.016 2.016 0 0 0 -2 0l-7 4.008c-.619 .355 -1 1.01 -1 1.718v8.018c0 .709 .381 1.363 1 1.717l7 4.008a2.016 2.016 0 0 0 2 0l7 -4.008c.619 -.355 1 -1.01 1 -1.718z" />
    <path d="M12 22v-10" />
    <path d="M12 12l8.73 -5.04" />
    <path d="M3.27 6.96l8.73 5.04" />
  </TablerIcon>
);

export const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" />
    <path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" />
  </TablerIcon>
);

export const UnloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M9 14l-4 -4l4 -4" />
    <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
  </TablerIcon>
);

export const DotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TablerIcon className={className}>
    <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
  </TablerIcon>
);

// Mouse outline with the pressed button lit in the accent colour.
export const MouseGlyph: React.FC<{ button: 'left' | 'right' }> = ({ button }) => (
  <svg className="mouse-glyph" viewBox="0 0 16 22" aria-hidden>
    <path
      d={button === 'left' ? 'M8 1.5H6.5A5 5 0 0 0 1.5 6.5V9H8z' : 'M8 1.5h1.5a5 5 0 0 1 5 5V9H8z'}
      className="mouse-glyph-lit"
    />
    <rect x="1.5" y="1.5" width="13" height="19" rx="6.5" className="mouse-glyph-body" />
    <path d="M8 1.5V9M1.5 9h13" className="mouse-glyph-body" />
  </svg>
);
