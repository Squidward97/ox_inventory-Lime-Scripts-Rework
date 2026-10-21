import React from 'react';

type Tone = 'accent' | 'warning' | 'danger';

interface Props {
  percent: number;
  segments?: number;
  tone?: Tone;
  className?: string;
}

// Skewed segment row from the style guide; never a smooth rounded bar.
const SegmentedBar: React.FC<Props> = ({ percent, segments = 30, tone = 'accent', className }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = clamped > 0 ? Math.max(1, Math.round((clamped / 100) * segments)) : 0;

  // --fill lets a theme draw the fill as one piece instead of segments (glass does)
  return (
    <div
      className={`segmented-bar${className ? ` ${className}` : ''}`}
      data-tone={tone}
      style={{ '--fill': clamped } as React.CSSProperties}
    >
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className={index < filled ? 'segment segment-filled' : 'segment'} />
      ))}
    </div>
  );
};

export const durabilityTone = (percent: number): Tone => (percent >= 50 ? 'accent' : percent >= 20 ? 'warning' : 'danger');

export const weightTone = (percent: number): Tone => (percent > 100 ? 'danger' : percent >= 90 ? 'warning' : 'accent');

export default SegmentedBar;
