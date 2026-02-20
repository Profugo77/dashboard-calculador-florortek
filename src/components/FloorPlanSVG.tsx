import { DeckResult, CoverPerimetral } from "@/lib/deckCalculations";

interface FloorPlanSVGProps {
  result: DeckResult;
  ancho: number;
  largo: number;
  cover?: CoverPerimetral;
}

const COVER_COLOR = "hsl(25 100% 55%)";

const FloorPlanSVG = ({ result, ancho, largo, cover }: FloorPlanSVGProps) => {
  const padding = 40;
  const maxWidth = 360;
  const scale = Math.min(maxWidth / ancho, maxWidth / largo);
  const svgW = ancho * scale + padding * 2;
  const svgH = largo * scale + padding * 2;

  const ox = padding;
  const oy = padding;
  const dw = ancho * scale;
  const dh = largo * scale;
  const coverStroke = 4;
  const coverOffset = coverStroke / 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="mx-auto max-w-full"
        style={{ maxHeight: 400 }}
      >
        {/* Area rectangle */}
        <rect
          x={ox} y={oy}
          width={dw} height={dh}
          fill="hsl(170 60% 90%)"
          stroke="hsl(170 100% 26%)"
          strokeWidth={2}
          rx={4}
        />

        {/* Tubes */}
        {result.tubePositions.map((pos, i) => {
          if (result.tubeDirection === "vertical") {
            const x = ox + pos * scale;
            return (
              <line key={`tube-${i}`}
                x1={x} y1={oy} x2={x} y2={oy + dh}
                stroke="hsl(200 10% 35%)" strokeWidth={1.5} strokeDasharray="6 3"
              />
            );
          } else {
            const y = oy + pos * scale;
            return (
              <line key={`tube-${i}`}
                x1={ox} y1={y} x2={ox + dw} y2={y}
                stroke="hsl(200 10% 35%)" strokeWidth={1.5} strokeDasharray="6 3"
              />
            );
          }
        })}

        {/* Pilotines */}
        {result.pilotinPositions.map((pos, i) => (
          <circle key={`pil-${i}`}
            cx={ox + pos.x * scale} cy={oy + pos.y * scale}
            r={3} fill="hsl(170 100% 26%)"
          />
        ))}

        {/* Cover perimetral — líneas naranjas */}
        {cover?.ancho1 && (
          <line x1={ox - coverOffset} y1={oy} x2={ox + dw + coverOffset} y2={oy}
            stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
        )}
        {cover?.ancho2 && (
          <line x1={ox - coverOffset} y1={oy + dh} x2={ox + dw + coverOffset} y2={oy + dh}
            stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
        )}
        {cover?.largo1 && (
          <line x1={ox} y1={oy - coverOffset} x2={ox} y2={oy + dh + coverOffset}
            stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
        )}
        {cover?.largo2 && (
          <line x1={ox + dw} y1={oy - coverOffset} x2={ox + dw} y2={oy + dh + coverOffset}
            stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
        )}

        {/* Dimension labels */}
        <text x={ox + dw / 2} y={oy - 12} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(200 10% 30%)">
          {ancho} m
        </text>
        <text
          x={ox - 12} y={oy + dh / 2}
          textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(200 10% 30%)"
          transform={`rotate(-90, ${ox - 12}, ${oy + dh / 2})`}
        >
          {largo} m
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: "hsl(200 10% 35%)" }} />
          Tubos aluminio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "hsl(170 100% 26%)" }} />
          Pilotines
        </span>
        {cover && (cover.ancho1 || cover.ancho2 || cover.largo1 || cover.largo2) && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-4 rounded" style={{ borderColor: COVER_COLOR }} />
            Cover perimetral
          </span>
        )}
      </div>
    </div>
  );
};

export default FloorPlanSVG;
