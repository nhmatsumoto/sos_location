import { BUILDING_COLORS, HEIGHT_LIFT_REFERENCE_METERS, liftColorForHeight, rgbaCss } from '../../geo/materials/theme';

const CATEGORY_LABELS: { key: keyof typeof BUILDING_COLORS; label: string }[] = [
  { key: 'residential', label: 'Residential (houses & apartments)' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'industrial', label: 'Industrial' },
  { key: 'public', label: 'Public' },
  { key: 'hospital', label: 'Hospital' },
  { key: 'school', label: 'School' },
  { key: 'unknown', label: 'Unclassified' },
];

/** Silhueta em miniatura: mesma leitura "casa baixa e saturada → prédio alto e claro" do mapa. */
const SKYLINE_BARS = [
  { meters: 4, barHeight: 7 },
  { meters: 15, barHeight: 12 },
  { meters: 30, barHeight: 18 },
  { meters: 55, barHeight: 24 },
  { meters: 90, barHeight: 30 },
  { meters: HEIGHT_LIFT_REFERENCE_METERS, barHeight: 36 },
];
const BAR_WIDTH = 11;
const BAR_GAP = 4;
const SKYLINE_HEIGHT = 36;
const SKYLINE_WIDTH = SKYLINE_BARS.length * BAR_WIDTH + (SKYLINE_BARS.length - 1) * BAR_GAP;

export function BuildingLegend() {
  return (
    <section className="panel" data-testid="building-legend">
      <h2 className="panel-title">Building height &amp; type</h2>
      <ul className="space-y-1">
        {CATEGORY_LABELS.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-2 text-xs text-slate-300">
            <span
              className="h-3 w-3 shrink-0 rounded-sm border border-slate-700"
              style={{ backgroundColor: rgbaCss(BUILDING_COLORS[key]) }}
            />
            {label}
          </li>
        ))}
      </ul>

      <div className="mt-2 border-t border-slate-800 pt-2">
        <p className="mb-1.5 text-[11px] leading-relaxed text-slate-500">
          Within each color, taller buildings render lighter — the same rule the skyline uses.
        </p>
        <div className="flex items-end gap-2">
          <svg
            width={SKYLINE_WIDTH}
            height={SKYLINE_HEIGHT + 2}
            viewBox={`0 0 ${SKYLINE_WIDTH} ${SKYLINE_HEIGHT + 2}`}
            role="img"
            aria-label="Height key: shorter buildings are darker, taller buildings are lighter"
          >
            <line
              x1={0}
              y1={SKYLINE_HEIGHT + 1}
              x2={SKYLINE_WIDTH}
              y2={SKYLINE_HEIGHT + 1}
              stroke="rgb(51 65 85)"
              strokeWidth={1}
            />
            {SKYLINE_BARS.map(({ meters, barHeight }, i) => (
              <rect
                key={meters}
                x={i * (BAR_WIDTH + BAR_GAP)}
                y={SKYLINE_HEIGHT - barHeight}
                width={BAR_WIDTH}
                height={barHeight}
                fill={rgbaCss(liftColorForHeight(BUILDING_COLORS.unknown, meters))}
              />
            ))}
          </svg>
          <div className="flex flex-col justify-between self-stretch py-0.5 text-[10px] text-slate-500">
            <span>{HEIGHT_LIFT_REFERENCE_METERS}+ m</span>
            <span>0 m</span>
          </div>
        </div>
      </div>
    </section>
  );
}
