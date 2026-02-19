import { DeckResult } from "@/lib/deckCalculations";

interface FloorPlanSVGProps {
  result: DeckResult;
  ancho: number;
  largo: number;
}

const FloorPlanSVG = ({ result, ancho, largo }: FloorPlanSVGProps) => {
  const padding = 40;
  const maxWidth = 360;
  const scale = Math.min(maxWidth / ancho, maxWidth / largo);
  const svgW = ancho * scale + padding * 2;
  const svgH = largo * scale + padding * 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="mx-auto max-w-full"
        style={{ maxHeight: 400 }}
      >
        {/* Area rectangle */}
        <rect
          x={padding}
          y={padding}
          width={ancho * scale}
          height={largo * scale}
          fill="hsl(170 60% 90%)"
          stroke="hsl(170 100% 26%)"
          strokeWidth={2}
          rx={4}
        />

        {/* Tubes */}
        {result.tubePositions.map((pos, i) => {
          if (result.tubeDirection === "vertical") {
            const x = padding + pos * scale;
            return (
              <line
                key={`tube-${i}`}
                x1={x}
                y1={padding}
                x2={x}
                y2={padding + largo * scale}
                stroke="hsl(200 10% 35%)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
              />
            );
          } else {
            const y = padding + pos * scale;
            return (
              <line
                key={`tube-${i}`}
                x1={padding}
                y1={y}
                x2={padding + ancho * scale}
                y2={y}
                stroke="hsl(200 10% 35%)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
              />
            );
          }
        })}

        {/* Pilotines */}
        {result.pilotinPositions.map((pos, i) => (
          <circle
            key={`pil-${i}`}
            cx={padding + pos.x * scale}
            cy={padding + pos.y * scale}
            r={3}
            fill="hsl(170 100% 26%)"
          />
        ))}

        {/* Dimension labels */}
        <text
          x={padding + (ancho * scale) / 2}
          y={padding - 12}
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          fill="hsl(200 10% 30%)"
        >
          {ancho} m
        </text>
        <text
          x={padding - 12}
          y={padding + (largo * scale) / 2}
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          fill="hsl(200 10% 30%)"
          transform={`rotate(-90, ${padding - 12}, ${padding + (largo * scale) / 2})`}
        >
          {largo} m
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: "hsl(200 10% 35%)" }} />
          Tubos aluminio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "hsl(170 100% 26%)" }} />
          Pilotines
        </span>
      </div>
    </div>
  );
};

export default FloorPlanSVG;
