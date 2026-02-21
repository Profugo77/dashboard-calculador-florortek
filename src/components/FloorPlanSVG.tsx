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

  const isL = result.forma === "L" && result.lShape;
  const lShape = result.lShape;

  const lPoints = isL
    ? [
        `${ox},${oy}`,
        `${ox + dw},${oy}`,
        `${ox + dw},${oy + lShape!.largoBrazo * scale}`,
        `${ox + lShape!.anchoBrazo * scale},${oy + lShape!.largoBrazo * scale}`,
        `${ox + lShape!.anchoBrazo * scale},${oy + dh}`,
        `${ox},${oy + dh}`,
      ].join(" ")
    : "";

  const coverStroke = 4;
  const coverOffset = coverStroke / 2;

  const getTubeEndpoints = (pos: number) => {
    if (result.tubeDirection === "vertical") {
      const x = ox + pos * scale;
      let tubeH = dh;
      if (isL && pos > lShape!.anchoBrazo + 0.001) {
        tubeH = lShape!.largoBrazo * scale;
      }
      return { x1: x, y1: oy, x2: x, y2: oy + tubeH };
    } else {
      const y = oy + pos * scale;
      let tubeW = dw;
      if (isL && pos > lShape!.largoBrazo + 0.001) {
        tubeW = lShape!.anchoBrazo * scale;
      }
      return { x1: ox, y1: y, x2: ox + tubeW, y2: y };
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto max-w-full" style={{ maxHeight: 400 }}>
        {/* Area shape */}
        {isL ? (
          <polygon points={lPoints} fill="hsl(170 60% 90%)" stroke="hsl(170 100% 26%)" strokeWidth={2} />
        ) : (
          <rect x={ox} y={oy} width={dw} height={dh} fill="hsl(170 60% 90%)" stroke="hsl(170 100% 26%)" strokeWidth={2} rx={4} />
        )}

        {/* Tubes */}
        {result.tubePositions.map((tube, i) => {
          const ep = getTubeEndpoints(tube.position);
          return (
            <line
              key={`tube-${i}`}
              x1={ep.x1} y1={ep.y1} x2={ep.x2} y2={ep.y2}
              stroke={tube.isDouble ? "hsl(200 30% 25%)" : "hsl(200 10% 35%)"}
              strokeWidth={tube.isDouble ? 2.2 : 1.5}
              strokeDasharray={tube.isDouble ? "none" : "6 3"}
            />
          );
        })}

        {/* Pilotines */}
        {result.pilotinPositions.map((pos, i) => (
          <circle key={`pil-${i}`} cx={ox + pos.x * scale} cy={oy + pos.y * scale} r={3} fill="hsl(170 100% 26%)" />
        ))}

        {/* Cover perimetral */}
        {isL ? (
          <>
            {cover?.ancho1 && (
              <line x1={ox - coverOffset} y1={oy} x2={ox + dw + coverOffset} y2={oy} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
            )}
            {cover?.ancho2 && (
              <line x1={ox - coverOffset} y1={oy + dh} x2={ox + lShape!.anchoBrazo * scale + coverOffset} y2={oy + dh} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
            )}
            {cover?.largo1 && (
              <line x1={ox} y1={oy - coverOffset} x2={ox} y2={oy + dh + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
            )}
            {cover?.largo2 && (
              <line x1={ox + dw} y1={oy - coverOffset} x2={ox + dw} y2={oy + lShape!.largoBrazo * scale + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
            )}
          </>
        ) : (
          <>
            {cover?.ancho1 && (
              <line x1={ox - coverOffset} y1={oy} x2={ox + dw + coverOffset} y2={oy} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
            )}
            {cover?.ancho2 && (
              <line x1={ox - coverOffset} y1={oy + dh} x2={ox + dw + coverOffset} y2={oy + dh} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
            )}
            {cover?.largo1 && (
              <line x1={ox} y1={oy - coverOffset} x2={ox} y2={oy + dh + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
            )}
            {cover?.largo2 && (
              <line x1={ox + dw} y1={oy - coverOffset} x2={ox + dw} y2={oy + dh + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />
            )}
          </>
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

      {/* Info */}
      <div className="flex flex-col items-center gap-1 mt-3 text-sm text-foreground font-medium">
        <span>{result.tipoAluminio} — Separación tubos: {result.separacionTubos} cm</span>
        <span>Separación pilotines: {result.separacionPilotines} cm</span>
        <span>Estilo: {result.estiloColocacion === "panos" ? "Por paños" : "Trabado (½ tabla)"}</span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: "hsl(200 10% 35%)" }} />
          Tubos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2" style={{ borderColor: "hsl(200 30% 25%)" }} />
          Doble estructura
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "hsl(170 100% 26%)" }} />
          Pilotines
        </span>
        {cover && (cover.ancho1 || cover.ancho2 || cover.largo1 || cover.largo2) && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-4 rounded" style={{ borderColor: COVER_COLOR }} />
            Cover
          </span>
        )}
      </div>
    </div>
  );
};

export default FloorPlanSVG;
