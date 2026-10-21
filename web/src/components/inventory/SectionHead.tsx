import React from 'react';
import SegmentedBar from '../utils/SegmentedBar';

interface Props {
  eyebrow?: string;
  title: string;
  /** Readout and controls on the right of the title */
  right?: React.ReactNode;
  /** Fill of the bar under the title; omitted keeps an empty track so headers stay the same height */
  percent?: number;
  tone?: 'accent' | 'warning' | 'danger';
  /** false swaps the bar for a plain hairline of the same height */
  bar?: boolean;
}

// Every section shares this fixed-height head so grids line up across the three columns.
const SectionHead: React.FC<Props> = ({ eyebrow, title, right, percent, tone = 'accent', bar = true }) => (
  <div className="section-head">
    {eyebrow && <div className="eyebrow">{eyebrow}</div>}
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {right && <div className="section-header-right">{right}</div>}
    </div>
    {bar ? (
      <SegmentedBar percent={percent ?? 0} segments={40} tone={tone} className="section-bar" />
    ) : (
      <div className="section-rule" />
    )}
  </div>
);

export const SectionCount: React.FC<{ value: number; total: number; unit: string }> = ({ value, total, unit }) => (
  <span className="section-weight">
    {String(value).padStart(2, '0')}
    <span className="dim">/</span>
    {String(total).padStart(2, '0')}
    <span className="unit">{unit}</span>
  </span>
);

export default SectionHead;
