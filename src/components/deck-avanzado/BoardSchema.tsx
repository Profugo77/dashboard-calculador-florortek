import { useMemo } from "react";
import type { BoardDir, BoardLen } from "@/lib/deckAvanzadoCalc";

interface Props {
  largo: number;
  ancho: number;
  dir: BoardDir;
  boardLen: BoardLen;
}

const BoardSchema = ({ largo, ancho, dir, boardLen }: Props) => {
  const padding = 60;
  const maxDraw = 380;
  const scale = Math.min(maxDraw / ancho, maxDraw / largo);
  const dw = ancho * scale;
  const dh = largo * scale;
  const svgW = dw + padding * 2;
  const svgH = dh + padding * 2;
  const ox = padding;
  const oy = padding;

  const BOARD_W = 0.15;
  const GAP = 1.5;

  const clipPath = `M${ox},${oy} h${dw} v${dh} h${-dw} Z`;

  const boards = useMemo(() => {
    const rects: { x: number; y: number; w: number; h: number }[] = [];

    if (dir === "horizontal") {
      const boardPxW = boardLen * scale;
      const boardPxH = BOARD_W * scale - GAP;
      const rows = Math.ceil(largo / BOARD_W);
      const cols = Math.ceil(ancho / boardLen);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = ox + c * boardLen * scale;
          const y = oy + r * BOARD_W * scale + GAP / 2;
          const w = Math.min(boardPxW - GAP, ox + dw - x);
          const h = Math.min(boardPxH, oy + dh - y);
          if (w > 0 && h > 0) rects.push({ x, y, w, h });
        }
      }
    } else {
      const boardPxH = boardLen * scale;
      const boardPxW = BOARD_W * scale - GAP;
      const cols = Math.ceil(ancho / BOARD_W);
      const rows = Math.ceil(largo / boardLen);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = ox + c * BOARD_W * scale + GAP / 2;
          const y = oy + r * boardLen * scale;
          const w = Math.min(boardPxW, ox + dw - x);
          const h = Math.min(boardPxH - GAP, oy + dh - y);
          if (w > 0 && h > 0) rects.push({ x, y, w, h });
        }
      }
    }
    return rects;
  }, [dir, boardLen, largo, ancho, scale, dw, dh, ox, oy]);

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="max-w-full" style={{ maxHeight: 480, background: "hsl(200 10% 98%)" }}>
      <defs>
        <clipPath id="board-clip">
          <path d={clipPath} />
        </clipPath>
      </defs>

      <path d={clipPath} fill="none" stroke="hsl(200 15% 30%)" strokeWidth={2} />

      <g clipPath="url(#board-clip)">
        {boards.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h}
            fill="hsl(30 35% 65%)" stroke="hsl(30 20% 40%)" strokeWidth={0.5} rx={1} />
        ))}
      </g>

      <text x={ox + dw / 2} y={oy - 18} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(200 15% 25%)">
        {ancho} m
      </text>
      <text x={ox - 20} y={oy + dh / 2} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(200 15% 25%)"
        transform={`rotate(-90, ${ox - 20}, ${oy + dh / 2})`}>
        {largo} m
      </text>

      <g>
        <text x={ox + dw / 2} y={oy + dh + 24} textAnchor="middle" fontSize={10} fill="hsl(30 40% 40%)" fontWeight={600}>
          Tablas: {dir === "horizontal" ? "Horizontal" : "Vertical"} — {boardLen}m × 15cm
        </text>
      </g>
    </svg>
  );
};

export default BoardSchema;
