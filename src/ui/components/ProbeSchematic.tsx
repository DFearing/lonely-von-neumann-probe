export function ProbeSchematic({ size = 60, accent = "#4ddbff" }: { size?: number; accent?: string }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 160 100">
      <g stroke={accent} strokeWidth="1.2" fill="none">
        <rect x="36" y="38" width="20" height="24" />
        <line x1="42" y1="38" x2="42" y2="62" opacity="0.4" />
        <line x1="48" y1="38" x2="48" y2="62" opacity="0.4" />
        <line x1="54" y1="38" x2="54" y2="62" opacity="0.4" />
        <line x1="56" y1="50" x2="62" y2="50" />
        <rect x="62" y="34" width="36" height="32" />
        <rect x="68" y="40" width="24" height="3" fill={accent} opacity="0.7" />
        <rect x="68" y="46" width="16" height="2" fill={accent} opacity="0.4" />
        <rect x="68" y="51" width="20" height="2" fill={accent} opacity="0.4" />
        <rect x="68" y="56" width="14" height="2" fill={accent} opacity="0.4" />
        <line x1="80" y1="34" x2="80" y2="22" />
        <circle cx="80" cy="20" r="2" fill={accent} />
        <line x1="98" y1="50" x2="104" y2="50" />
        <polygon points="104,42 118,50 104,58" fill={accent} fillOpacity="0.3" />
        <line x1="118" y1="50" x2="138" y2="50" strokeDasharray="3 3" opacity="0.5" />
        <circle cx="48" cy="50" r="6" stroke="#ffcb47" />
        <circle cx="48" cy="50" r="2" fill="#ffcb47" opacity="0.6" />
      </g>
    </svg>
  );
}
