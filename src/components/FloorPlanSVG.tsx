import { DeckResult, CoverPerimetral } from "@/lib/deckCalculations";

interface PolyBlock {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FloorPlanSVGProps {
  result: DeckResult;
  ancho: number;
  largo: number;
  cover?: CoverPerimetral;
  polyBlocks?: PolyBlock[];
}

const COVER_COLOR = "hsl(25 100% 55%)";
const BOARD_WIDTH = 0.145; // 14.5cm
const BOARD_GAP = 0.005; // 5mm
const BOARD_PITCH = BOARD_WIDTH + BOARD_GAP;
const BOARD_COLOR = "hsl(30 40% 65%)";
const BOARD_STROKE = "hsl(0 0% 10%)";

interface BoardRect {
  x: number;
  y: number;
  w: number;
  h: number;
  colorIdx: number;
}

function generateBoardRects(
  ancho: number,
  largo: number,
  boardLength: number,
  boardDirection: "horizontal" | "vertical",
  estilo: "panos" | "trabado",
  forma: string,
  lShape?: { anchoTotal: number; largoTotal: number; anchoBrazo: number; largoBrazo: number }
): BoardRect[] {
  const rects: BoardRect[] = [];
  const stackDim = boardDirection === "horizontal" ? largo : ancho;
  const boardDim = boardDirection === "horizontal" ? ancho : largo;
  const numRows = Math.ceil(stackDim / BOARD_PITCH);

  for (let row = 0; row < numRows; row++) {
    const stackPos = row * BOARD_PITCH;
    if (stackPos >= stackDim) break;
    const bw = Math.min(BOARD_WIDTH, stackDim - stackPos);
    const offset = estilo === "trabado" && row % 2 === 1 ? boardLength / 2 : 0;

    let pos = -offset;
    while (pos < boardDim) {
      const segStart = Math.max(0, pos);
      const segEnd = Math.min(pos + boardLength, boardDim);
      pos += boardLength;
      if (segEnd <= segStart + 0.001) continue;
      const segLen = segEnd - segStart;

      let rx: number, ry: number, rw: number, rh: number;
      if (boardDirection === "horizontal") {
        rx = segStart; ry = stackPos; rw = segLen; rh = bw;
      } else {
        rx = stackPos; ry = segStart; rw = bw; rh = segLen;
      }

      if (forma === "L" && lShape) {
        if (rx >= lShape.anchoBrazo && ry >= lShape.largoBrazo) continue;
        if (ry >= lShape.largoBrazo && rx < lShape.anchoBrazo) {
          rw = Math.min(rw, lShape.anchoBrazo - rx);
          if (rw <= 0) continue;
        }
        if (ry < lShape.largoBrazo && ry + rh > lShape.largoBrazo && rx >= lShape.anchoBrazo) {
          rh = Math.min(rh, lShape.largoBrazo - ry);
          if (rh <= 0) continue;
        }
      }

      rects.push({ x: rx, y: ry, w: rw, h: rh, colorIdx: 0 });
    }
  }
  return rects;
}

const FloorPlanSVG = ({ result, ancho, largo, cover, polyBlocks }: FloorPlanSVGProps) => {
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
  const isPoly = !!polyBlocks && polyBlocks.length > 0;

  // Bounding box offset for poly blocks
  const blockMinX = isPoly ? Math.min(...polyBlocks!.map(b => b.x)) : 0;
  const blockMinY = isPoly ? Math.min(...polyBlocks!.map(b => b.y)) : 0;

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
  const clipId = "area-clip-" + Math.random().toString(36).slice(2, 8);

  // Tube endpoint helper for rect/L modes
  const getTubeEndpoints = (pos: number) => {
    if (result.tubeDirection === "vertical") {
      const x = ox + pos * scale;
      let tubeH = dh;
      if (isL && pos > lShape!.anchoBrazo + 0.001) tubeH = lShape!.largoBrazo * scale;
      return { x1: x, y1: oy, x2: x, y2: oy + tubeH };
    } else {
      const y = oy + pos * scale;
      let tubeW = dw;
      if (isL && pos > lShape!.largoBrazo + 0.001) tubeW = lShape!.anchoBrazo * scale;
      return { x1: ox, y1: y, x2: ox + tubeW, y2: y };
    }
  };

  // For poly mode: compute tube positions across bounding box
  const polyTubePositions: number[] = [];
  let polyPilSpacing = 0.5;
  if (isPoly) {
    const spacingDim = result.tubeDirection === "vertical" ? ancho : largo;
    const maxSpacing = 0.37;
    const n = Math.max(1, Math.ceil(spacingDim / maxSpacing));
    const sp = spacingDim / n;
    for (let i = 0; i <= n; i++) polyTubePositions.push(i * sp);

    const perpDim = result.tubeDirection === "vertical" ? largo : ancho;
    const maxPilSp = result.separacionPilotines > 0 ? result.separacionPilotines / 100 : 0.5;
    const nPil = Math.max(1, Math.ceil(perpDim / maxPilSp));
    polyPilSpacing = perpDim / nPil;
  }

  const boardDirection: "horizontal" | "vertical" = result.tubeDirection === "vertical" ? "horizontal" : "vertical";
  const boardRects = generateBoardRects(ancho, largo, result.boardLength, boardDirection, result.estiloColocacion, isPoly ? "rectangular" : result.forma, lShape);

  // Helpers for rendering block shapes
  const renderBlocksFill = (fill: string, stroke: string, sw: number) =>
    polyBlocks!.map((b, i) => (
      <rect key={i}
        x={ox + (b.x - blockMinX) * scale}
        y={oy + (b.y - blockMinY) * scale}
        width={b.w * scale}
        height={b.h * scale}
        fill={fill} stroke={stroke} strokeWidth={sw}
      />
    ));

  const renderBlocksClipPath = () =>
    polyBlocks!.map((b, i) => (
      <rect key={i}
        x={ox + (b.x - blockMinX) * scale}
        y={oy + (b.y - blockMinY) * scale}
        width={b.w * scale}
        height={b.h * scale}
      />
    ));

  // Render structure tubes/pilotines for poly mode (clipped to blocks)
  const renderPolyStructure = () => (
    <g clipPath={`url(#${clipId})`}>
      {polyTubePositions.map((pos, i) => {
        if (result.tubeDirection === "vertical") {
          return <line key={`t-${i}`} x1={ox + pos * scale} y1={oy} x2={ox + pos * scale} y2={oy + dh}
            stroke="hsl(200 10% 35%)" strokeWidth={1.5} strokeDasharray="6 3" />;
        } else {
          return <line key={`t-${i}`} x1={ox} y1={oy + pos * scale} x2={ox + dw} y2={oy + pos * scale}
            stroke="hsl(200 10% 35%)" strokeWidth={1.5} strokeDasharray="6 3" />;
        }
      })}
      {polyTubePositions.flatMap((tubePos, ti) => {
        const perpDim = result.tubeDirection === "vertical" ? largo : ancho;
        const nPil = Math.max(1, Math.ceil(perpDim / polyPilSpacing));
        const sp = perpDim / nPil;
        return Array.from({ length: nPil + 1 }, (_, j) => {
          const pilPos = j * sp;
          const cx = result.tubeDirection === "vertical" ? ox + tubePos * scale : ox + pilPos * scale;
          const cy = result.tubeDirection === "vertical" ? oy + pilPos * scale : oy + tubePos * scale;
          return <circle key={`p-${ti}-${j}`} cx={cx} cy={cy} r={3} fill="hsl(170 100% 26%)" />;
        });
      })}
    </g>
  );

  return (
    <div className="w-full overflow-x-auto space-y-6">
      {/* === STRUCTURE DIAGRAM === */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2 text-center">Esquema de Estructura</h4>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto max-w-full" style={{ maxHeight: 380 }}>
          <defs>
            <clipPath id={clipId}>
              {isPoly ? renderBlocksClipPath()
                : isL ? <polygon points={lPoints} />
                : <rect x={ox} y={oy} width={dw} height={dh} />}
            </clipPath>
          </defs>

          {/* Background shape */}
          {isPoly ? renderBlocksFill("hsl(170 60% 90%)", "hsl(170 100% 26%)", 2)
            : isL ? <polygon points={lPoints} fill="hsl(170 60% 90%)" stroke="hsl(170 100% 26%)" strokeWidth={2} />
            : <rect x={ox} y={oy} width={dw} height={dh} fill="hsl(170 60% 90%)" stroke="hsl(170 100% 26%)" strokeWidth={2} rx={4} />}

          {/* Tubes & pilotines */}
          {isPoly ? renderPolyStructure() : (
            <>
              {result.tubePositions.filter(t => !t.isDouble).map((tube, i) => {
                const ep = getTubeEndpoints(tube.position);
                return <line key={`tube-s-${i}`} x1={ep.x1} y1={ep.y1} x2={ep.x2} y2={ep.y2}
                  stroke="hsl(200 10% 35%)" strokeWidth={1.5} strokeDasharray="6 3" />;
              })}
              {(() => {
                const doubles = result.tubePositions.filter(t => t.isDouble);
                const pairs: [typeof doubles[0], typeof doubles[0]][] = [];
                for (let i = 0; i < doubles.length; i += 2) {
                  if (doubles[i + 1]) pairs.push([doubles[i], doubles[i + 1]]);
                }
                return pairs.map((pair, i) => {
                  const ep1 = getTubeEndpoints(pair[0].position);
                  const ep2 = getTubeEndpoints(pair[1].position);
                  return (
                    <g key={`tube-d-${i}`}>
                      <line x1={ep1.x1} y1={ep1.y1} x2={ep1.x2} y2={ep1.y2} stroke="hsl(30 90% 50%)" strokeWidth={2.5} strokeLinecap="round" />
                      <line x1={ep2.x1} y1={ep2.y1} x2={ep2.x2} y2={ep2.y2} stroke="hsl(30 90% 50%)" strokeWidth={2.5} strokeLinecap="round" />
                    </g>
                  );
                });
              })()}
              {result.pilotinPositions.map((pos, i) => (
                <circle key={`pil-${i}`} cx={ox + pos.x * scale} cy={oy + pos.y * scale} r={3} fill="hsl(170 100% 26%)" />
              ))}
            </>
          )}

          {/* Cover (rect/L only) */}
          {!isPoly && isL && (
            <>
              {cover?.ancho1 && <line x1={ox - coverOffset} y1={oy} x2={ox + dw + coverOffset} y2={oy} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.ancho2 && <line x1={ox - coverOffset} y1={oy + dh} x2={ox + lShape!.anchoBrazo * scale + coverOffset} y2={oy + dh} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.largo1 && <line x1={ox} y1={oy - coverOffset} x2={ox} y2={oy + dh + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.largo2 && <line x1={ox + dw} y1={oy - coverOffset} x2={ox + dw} y2={oy + lShape!.largoBrazo * scale + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
            </>
          )}
          {!isPoly && !isL && (
            <>
              {cover?.ancho1 && <line x1={ox - coverOffset} y1={oy} x2={ox + dw + coverOffset} y2={oy} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.ancho2 && <line x1={ox - coverOffset} y1={oy + dh} x2={ox + dw + coverOffset} y2={oy + dh} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.largo1 && <line x1={ox} y1={oy - coverOffset} x2={ox} y2={oy + dh + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.largo2 && <line x1={ox + dw} y1={oy - coverOffset} x2={ox + dw} y2={oy + dh + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
            </>
          )}

          <text x={ox + dw / 2} y={oy - 12} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(200 10% 30%)">{ancho} m</text>
          <text x={ox - 12} y={oy + dh / 2} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(200 10% 30%)" transform={`rotate(-90, ${ox - 12}, ${oy + dh / 2})`}>{largo} m</text>
        </svg>

        <div className="flex items-center justify-center flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: "hsl(200 10% 35%)" }} />
            Tubos
          </span>
          {!isPoly && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 border-t-[3px]" style={{ borderColor: "hsl(30 90% 50%)" }} />
              Doble viga
            </span>
          )}
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

      {/* === DECK / BOARD LAYOUT DIAGRAM === */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2 text-center">
          Diseño de Tablas — {result.estiloColocacion === "panos" ? "Por Paños" : "Trabado (½ tabla)"}
        </h4>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto max-w-full" style={{ maxHeight: 380 }}>
          <defs>
            <clipPath id={clipId + "-boards"}>
              {isPoly ? renderBlocksClipPath()
                : isL ? <polygon points={lPoints} />
                : <rect x={ox} y={oy} width={dw} height={dh} rx={4} />}
            </clipPath>
          </defs>

          {/* Background */}
          {isPoly ? renderBlocksFill("hsl(30 15% 30%)", "hsl(170 100% 26%)", 2)
            : isL ? <polygon points={lPoints} fill="hsl(30 15% 30%)" stroke="hsl(170 100% 26%)" strokeWidth={2} />
            : <rect x={ox} y={oy} width={dw} height={dh} fill="hsl(30 15% 30%)" stroke="hsl(170 100% 26%)" strokeWidth={2} rx={4} />}

          {/* Boards clipped to area */}
          <g clipPath={`url(#${clipId}-boards)`}>
            {boardRects.map((b, i) => (
              <rect key={`board-${i}`}
                x={ox + b.x * scale} y={oy + b.y * scale}
                width={b.w * scale} height={b.h * scale}
                fill={BOARD_COLOR} stroke={BOARD_STROKE} strokeWidth={0.5} rx={1}
              />
            ))}
          </g>

          {/* Outline on top */}
          {isPoly ? renderBlocksFill("none", "hsl(170 100% 26%)", 2)
            : isL ? <polygon points={lPoints} fill="none" stroke="hsl(170 100% 26%)" strokeWidth={2} />
            : <rect x={ox} y={oy} width={dw} height={dh} fill="none" stroke="hsl(170 100% 26%)" strokeWidth={2} rx={4} />}

          {/* Cover on deck (rect/L only) */}
          {!isPoly && isL && (
            <>
              {cover?.ancho1 && <line x1={ox - coverOffset} y1={oy} x2={ox + dw + coverOffset} y2={oy} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.ancho2 && <line x1={ox - coverOffset} y1={oy + dh} x2={ox + lShape!.anchoBrazo * scale + coverOffset} y2={oy + dh} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.largo1 && <line x1={ox} y1={oy - coverOffset} x2={ox} y2={oy + dh + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.largo2 && <line x1={ox + dw} y1={oy - coverOffset} x2={ox + dw} y2={oy + lShape!.largoBrazo * scale + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
            </>
          )}
          {!isPoly && !isL && (
            <>
              {cover?.ancho1 && <line x1={ox - coverOffset} y1={oy} x2={ox + dw + coverOffset} y2={oy} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.ancho2 && <line x1={ox - coverOffset} y1={oy + dh} x2={ox + dw + coverOffset} y2={oy + dh} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.largo1 && <line x1={ox} y1={oy - coverOffset} x2={ox} y2={oy + dh + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
              {cover?.largo2 && <line x1={ox + dw} y1={oy - coverOffset} x2={ox + dw} y2={oy + dh + coverOffset} stroke={COVER_COLOR} strokeWidth={coverStroke} strokeLinecap="round" />}
            </>
          )}

          <text x={ox + dw / 2} y={oy - 12} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(200 10% 30%)">{ancho} m</text>
          <text x={ox - 12} y={oy + dh / 2} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(200 10% 30%)" transform={`rotate(-90, ${ox - 12}, ${oy + dh / 2})`}>{largo} m</text>
        </svg>

        <div className="flex items-center justify-center flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-3 rounded-sm" style={{ background: BOARD_COLOR, border: `1px solid ${BOARD_STROKE}` }} />
            Tablas
          </span>
          {cover && (cover.ancho1 || cover.ancho2 || cover.largo1 || cover.largo2) && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 border-t-4 rounded" style={{ borderColor: COVER_COLOR }} />
              Cover
            </span>
          )}
        </div>
      </div>

      {/* Technical info */}
      <div className="flex flex-col items-center gap-1 text-sm text-foreground font-medium">
        <span>{result.tipoAluminio} — Separación tubos: {result.separacionTubos} cm</span>
        <span>Separación pilotines: {result.separacionPilotines} cm</span>
        <span>Tabla: {result.boardLength} m — Estilo: {result.estiloColocacion === "panos" ? "Por paños" : "Trabado (½ tabla)"}</span>
      </div>
    </div>
  );
};

export default FloorPlanSVG;
