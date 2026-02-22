import { useMemo } from "react";
import type { BoardDir, BoardLen, AvzCalcResult } from "@/lib/deckAvanzadoCalc";

interface Props {
  largo: number;
  ancho: number;
  dir: BoardDir;
  boardLen: BoardLen;
  result: AvzCalcResult;
  svgRef?: React.Ref<SVGSVGElement>;
}

const StructureSchema = ({ largo, ancho, dir, boardLen, result, svgRef }: Props) => {
  const padding = 60;
  const maxDraw = 380;
  const scale = Math.min(maxDraw / ancho, maxDraw / largo);
  const dw = ancho * scale;
  const dh = largo * scale;
  const svgW = dw + padding * 2 + 30;
  const svgH = dh + padding * 2 + 10;
  const ox = padding;
  const oy = padding;

  const clipId = "struct-clip";
  const outlinePath = `M${ox},${oy} h${dw} v${dh} h${-dw} Z`;

  const beamLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const spacingM = result.sepVigas / 100;
    for (let i = 0; i < result.cantVigas; i++) {
      const pos = i * spacingM;
      if (dir === "horizontal") {
        const y = oy + pos * scale;
        if (y > oy + dh + 0.5) continue;
        lines.push({ x1: ox, y1: y, x2: ox + dw, y2: y });
      } else {
        const x = ox + pos * scale;
        if (x > ox + dw + 0.5) continue;
        lines.push({ x1: x, y1: oy, x2: x, y2: oy + dh });
      }
    }
    return lines;
  }, [result, dir, scale, dw, dh, ox, oy]);

  const doubleBeamLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[][] = [];
    const offset = 3 * (scale > 1 ? 1.5 : 3);
    result.boardJoints.forEach((jointPos) => {
      if (dir === "horizontal") {
        const x = ox + jointPos * scale;
        if (x > ox + dw + 0.5) return;
        lines.push([
          { x1: x - offset, y1: oy, x2: x - offset, y2: oy + dh },
          { x1: x + offset, y1: oy, x2: x + offset, y2: oy + dh },
        ]);
      } else {
        const y = oy + jointPos * scale;
        if (y > oy + dh + 0.5) return;
        lines.push([
          { x1: ox, y1: y - offset, x2: ox + dw, y2: y - offset },
          { x1: ox, y1: y + offset, x2: ox + dw, y2: y + offset },
        ]);
      }
    });
    return lines;
  }, [result.boardJoints, dir, scale, dw, dh, ox, oy]);

  const pilotines = useMemo(() => {
    const pts: { cx: number; cy: number; isDouble: boolean }[] = [];
    const spacingM = result.sepVigas / 100;
    const MAX_PIL_SPACING = 0.40;

    const addPilotines = (beamPos: number, beamLen: number, isHoriz: boolean, isDouble: boolean) => {
      const count = Math.max(2, Math.ceil(beamLen / MAX_PIL_SPACING) + 1);
      const sp = beamLen / (count - 1);
      for (let j = 0; j < count; j++) {
        const along = j * sp;
        if (isHoriz) {
          pts.push({ cx: ox + along * scale, cy: oy + beamPos * scale, isDouble });
        } else {
          pts.push({ cx: ox + beamPos * scale, cy: oy + along * scale, isDouble });
        }
      }
    };

    for (let i = 0; i < result.cantVigas; i++) {
      const beamPos = i * spacingM;
      const beamLen = dir === "horizontal" ? ancho : largo;
      const beamPx = dir === "horizontal" ? oy + beamPos * scale : ox + beamPos * scale;
      const limit = dir === "horizontal" ? oy + dh : ox + dw;
      if (beamPx > limit + 0.5) continue;
      addPilotines(beamPos, beamLen, dir === "horizontal", false);
    }

    result.boardJoints.forEach((jointPos) => {
      const beamLen = dir === "horizontal" ? largo : ancho;
      addPilotines(jointPos, beamLen, dir !== "horizontal", true);
    });

    return pts;
  }, [result, dir, scale, ox, oy, dw, dh, ancho, largo]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="max-w-full"
      style={{ maxHeight: 480, background: "hsl(200 10% 98%)" }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={outlinePath} />
        </clipPath>
      </defs>

      <path d={outlinePath} fill="hsl(200 10% 94%)" stroke="hsl(200 15% 30%)" strokeWidth={2} />

      <g clipPath={`url(#${clipId})`}>
        {pilotines.map((p, i) => (
          <circle key={`pil-${i}`} cx={p.cx} cy={p.cy} r={p.isDouble ? 5 : 4}
            fill={p.isDouble ? "hsl(30 90% 50%)" : "hsl(220 60% 55%)"}
            stroke={p.isDouble ? "hsl(30 70% 35%)" : "hsl(220 60% 35%)"}
            strokeWidth={1} opacity={0.7} />
        ))}

        {beamLines.map((l, i) => (
          <line key={`beam-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="hsl(0 75% 50%)" strokeWidth={2} strokeLinecap="round" />
        ))}

        {doubleBeamLines.map((pair, i) => (
          <g key={`dbl-${i}`}>
            <line x1={pair[0].x1} y1={pair[0].y1} x2={pair[0].x2} y2={pair[0].y2}
              stroke="hsl(30 90% 50%)" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={pair[1].x1} y1={pair[1].y1} x2={pair[1].x2} y2={pair[1].y2}
              stroke="hsl(30 90% 50%)" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        ))}
      </g>

      <text x={ox + dw / 2} y={oy - 20} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(200 15% 25%)">
        {ancho} m
      </text>
      <text x={ox - 22} y={oy + dh / 2} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(200 15% 25%)"
        transform={`rotate(-90, ${ox - 22}, ${oy + dh / 2})`}>
        {largo} m
      </text>

      <text x={ox + dw + 10} y={oy + dh / 2} fontSize={10} fill="hsl(0 60% 45%)" fontWeight={600}
        transform={`rotate(-90, ${ox + dw + 10}, ${oy + dh / 2})`} textAnchor="middle">
        Sep: {result.sepVigas} cm
      </text>
    </svg>
  );
};

export default StructureSchema;
