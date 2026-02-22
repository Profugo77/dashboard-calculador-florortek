import { useMemo } from "react";
import type { BoardDir, BoardLen, AvzCalcResult, LShapeAvz } from "@/lib/deckAvanzadoCalc";

interface Props {
  largo: number;
  ancho: number;
  dir: BoardDir;
  boardLen: BoardLen;
  result: AvzCalcResult;
  shape: "rectangle" | "l-shape";
  lShape?: LShapeAvz;
  svgRef?: React.Ref<SVGSVGElement>;
}

const StructureSchema = ({ largo, ancho, dir, boardLen, result, shape, lShape, svgRef }: Props) => {
  const padding = 60;
  const maxDraw = 380;
  const effLargo = shape === "l-shape" && lShape ? lShape.largoTotal : largo;
  const effAncho = shape === "l-shape" && lShape ? lShape.anchoTotal : ancho;
  const scale = Math.min(maxDraw / effAncho, maxDraw / effLargo);
  const dw = effAncho * scale;
  const dh = effLargo * scale;
  const svgW = dw + padding * 2 + 30;
  const svgH = dh + padding * 2 + 10;
  const ox = padding;
  const oy = padding;

  // Outline path
  const outlinePath = useMemo(() => {
    if (shape === "l-shape" && lShape) {
      const ab = lShape.anchoBrazo * scale;
      const lb = lShape.largoBrazo * scale;
      return `M${ox},${oy} h${dw} v${lb} h${-(dw - ab)} v${dh - lb} h${-ab} Z`;
    }
    return `M${ox},${oy} h${dw} v${dh} h${-dw} Z`;
  }, [shape, lShape, scale, dw, dh, ox, oy]);

  // Regular beam lines
  const beamLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const spacingM = result.sepVigas / 100;
    for (let i = 0; i < result.cantVigas; i++) {
      const pos = i * spacingM;
      if (dir === "horizontal") {
        const y = oy + pos * scale;
        let w = dw;
        if (shape === "l-shape" && lShape && pos > lShape.largoBrazo) {
          w = lShape.anchoBrazo * scale;
        }
        lines.push({ x1: ox, y1: y, x2: ox + w, y2: y });
      } else {
        const x = ox + pos * scale;
        let h = dh;
        if (shape === "l-shape" && lShape && pos > lShape.anchoBrazo) {
          h = lShape.largoBrazo * scale;
        }
        lines.push({ x1: x, y1: oy, x2: x, y2: oy + h });
      }
    }
    return lines;
  }, [result, dir, scale, dw, dh, ox, oy, shape, lShape]);

  // Double beam lines at board joints
  const doubleBeamLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[][] = [];
    const offset = 3 * (scale > 1 ? 1.5 : 3); // visual offset in px
    result.boardJoints.forEach((jointPos) => {
      if (dir === "horizontal") {
        // joints along ancho (X), double beams are vertical
        const x = ox + jointPos * scale;
        lines.push([
          { x1: x - offset, y1: oy, x2: x - offset, y2: oy + dh },
          { x1: x + offset, y1: oy, x2: x + offset, y2: oy + dh },
        ]);
      } else {
        // joints along largo (Y), double beams are horizontal
        const y = oy + jointPos * scale;
        lines.push([
          { x1: ox, y1: y - offset, x2: ox + dw, y2: y - offset },
          { x1: ox, y1: y + offset, x2: ox + dw, y2: y + offset },
        ]);
      }
    });
    return lines;
  }, [result.boardJoints, dir, scale, dw, dh, ox, oy]);

  // Pilotine positions
  const pilotines = useMemo(() => {
    const pts: { cx: number; cy: number }[] = [];
    const spacingM = result.sepVigas / 100;
    const beamLength = dir === "horizontal" ? effAncho : effLargo;
    const pilPerBeam = Math.max(2, Math.ceil(beamLength / 0.80) + 1);
    const pilSpacing = beamLength / (pilPerBeam - 1);

    for (let i = 0; i < result.cantVigas; i++) {
      const beamPos = i * spacingM;
      let len = beamLength;
      if (shape === "l-shape" && lShape) {
        if (dir === "horizontal" && beamPos > lShape.largoBrazo) len = lShape.anchoBrazo;
        if (dir === "vertical" && beamPos > lShape.anchoBrazo) len = lShape.largoBrazo;
      }
      const count = Math.max(2, Math.ceil(len / 0.80) + 1);
      const sp = len / (count - 1);
      for (let j = 0; j < count; j++) {
        const along = j * sp;
        if (dir === "horizontal") {
          pts.push({ cx: ox + along * scale, cy: oy + beamPos * scale });
        } else {
          pts.push({ cx: ox + beamPos * scale, cy: oy + along * scale });
        }
      }
    }
    return pts;
  }, [result, dir, scale, ox, oy, effAncho, effLargo, shape, lShape]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="max-w-full"
      style={{ maxHeight: 480, background: "hsl(200 10% 98%)" }}
    >
      <defs>
        <marker id="arr-s" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="hsl(200 10% 50%)" />
        </marker>
      </defs>

      {/* Deck outline */}
      <path d={outlinePath} fill="hsl(200 10% 94%)" stroke="hsl(200 15% 30%)" strokeWidth={2} />

      {/* Pilotines (draw first so beams overlay) */}
      {pilotines.map((p, i) => (
        <circle key={`pil-${i}`} cx={p.cx} cy={p.cy} r={4} fill="hsl(220 60% 55%)" stroke="hsl(220 60% 35%)" strokeWidth={1} opacity={0.7} />
      ))}

      {/* Regular beams */}
      {beamLines.map((l, i) => (
        <line key={`beam-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="hsl(0 75% 50%)" strokeWidth={2} strokeLinecap="round" />
      ))}

      {/* Double beams at joints */}
      {doubleBeamLines.map((pair, i) => (
        <g key={`dbl-${i}`}>
          <line x1={pair[0].x1} y1={pair[0].y1} x2={pair[0].x2} y2={pair[0].y2}
            stroke="hsl(30 90% 50%)" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={pair[1].x1} y1={pair[1].y1} x2={pair[1].x2} y2={pair[1].y2}
            stroke="hsl(30 90% 50%)" strokeWidth={2.5} strokeLinecap="round" />
        </g>
      ))}

      {/* Dimension labels */}
      <text x={ox + dw / 2} y={oy - 20} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(200 15% 25%)">
        {effAncho} m
      </text>
      <text x={ox - 22} y={oy + dh / 2} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(200 15% 25%)"
        transform={`rotate(-90, ${ox - 22}, ${oy + dh / 2})`}>
        {effLargo} m
      </text>

      {/* Sep annotation */}
      <text x={ox + dw + 10} y={oy + dh / 2} fontSize={10} fill="hsl(0 60% 45%)" fontWeight={600}
        transform={`rotate(-90, ${ox + dw + 10}, ${oy + dh / 2})`} textAnchor="middle">
        Sep: {result.sepVigas} cm
      </text>
    </svg>
  );
};

export default StructureSchema;
