// components/training/Speedometer.tsx
'use client';

interface Props {
  value: number;
  max: number;
  unit: string;
  isOver: boolean;
  size?: number;
}

export function Speedometer({ value, max, unit, isOver, size = 120 }: Props) {
  const pct   = Math.min(1, value / max);
  const color = isOver ? '#EF4444' : value > max * 0.8 ? '#F59E0B' : '#22C55E';

  const cx  = 60; const cy = 60; const r = 48;
  const toRad = (deg: number) => (deg - 90) * Math.PI / 180;

  const arc = (startDeg: number, endDeg: number) => {
    const s = toRad(startDeg); const e = toRad(endDeg);
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)}`;
  };

  const needleAngle = -120 + pct * 240;
  const needleRad   = toRad(needleAngle);
  const needleX     = cx + 34 * Math.cos(needleRad);
  const needleY     = cy + 34 * Math.sin(needleRad);

  // Tick marks
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angle  = -120 + i * 24;
    const rad    = toRad(angle);
    const inner  = 40; const outer = 48;
    return {
      x1: cx + inner * Math.cos(rad),
      y1: cy + inner * Math.sin(rad),
      x2: cx + outer * Math.cos(rad),
      y2: cy + outer * Math.sin(rad),
      isMajor: i % 2 === 0,
    };
  });

  return (
    <svg
      viewBox="0 0 120 110"
      width={size}
      height={size * 110 / 120}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={56} fill="#111827" />
      <circle cx={cx} cy={cy} r={55} fill="none" stroke="#1E2A3E" strokeWidth="1" />

      {/* Track */}
      <path d={arc(-120, 120)} fill="none" stroke="#1E2A3E" strokeWidth="6" strokeLinecap="round" />

      {/* Colored zones */}
      <path d={arc(-120, -40)} fill="none" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" opacity="0.3" />
      <path d={arc(-40,   40)} fill="none" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" opacity="0.3" />
      <path d={arc(40,   120)} fill="none" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" opacity="0.3" />

      {/* Active arc */}
      {pct > 0 && (
        <path d={arc(-120, -120 + pct * 240)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      )}

      {/* Ticks */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isMajor ? '#64748B' : '#1E2A3E'} strokeWidth={t.isMajor ? 1.5 : 1}
        />
      ))}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY}
        stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      <circle cx={cx} cy={cy} r="3" fill="#0A0E1A" />

      {/* Value display */}
      <text x={cx} y={cy + 20} textAnchor="middle" fill="white" fontSize="18"
        fontFamily="JetBrains Mono, monospace" fontWeight="500">
        {value}
      </text>
      <text x={cx} y={cy + 32} textAnchor="middle" fill="#64748B" fontSize="8"
        fontFamily="Space Grotesk, sans-serif">
        {unit}
      </text>
    </svg>
  );
}
