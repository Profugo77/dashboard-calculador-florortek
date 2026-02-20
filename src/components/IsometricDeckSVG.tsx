import { DeckResult, CoverPerimetral } from "@/lib/deckCalculations";

interface IsometricDeckSVGProps {
  result: DeckResult;
  ancho: number;
  largo: number;
  cover?: CoverPerimetral;
}

// Isometric projection: converts 3D (x, y, z) to 2D SVG coords
// Standard isometric: x-axis goes right-down, y-axis goes left-down, z-axis goes up
const iso = (x: number, y: number, z: number, scale: number, ox: number, oy: number) => {
  const sx = (x - y) * Math.cos(Math.PI / 6) * scale;
  const sy = (x + y) * Math.sin(Math.PI / 6) * scale - z * scale;
  return { x: ox + sx, y: oy + sy };
};

const COVER_COLOR = "hsl(25 100% 55%)";
const DECK_COLOR = "#c8a06e";       // Madera
const DECK_DARK = "#a07848";        // Madera sombra
const STRUCT_COLOR = "hsl(200 10% 55%)";  // Aluminio
const PILOTIN_COLOR = "hsl(170 100% 26%)";

const IsometricDeckSVG = ({ result, ancho, largo, cover }: IsometricDeckSVGProps) => {
  const maxDim = Math.max(ancho, largo);
  const scale = Math.min(120 / maxDim, 60);
  const boardThickness = 0.04;
  const boardWidth = 0.14; // ~14 cm de ancho de tabla visible
  const structHeight = 0.08;
  const deckHeight = boardThickness;

  // SVG canvas
  const svgW = 420;
  const svgH = 280;
  const ox = svgW / 2;
  const oy = svgH * 0.72;

  // Corners of the deck base
  const c00 = iso(0, 0, 0, scale, ox, oy);
  const cA0 = iso(ancho, 0, 0, scale, ox, oy);
  const c0L = iso(0, largo, 0, scale, ox, oy);
  const cAL = iso(ancho, largo, 0, scale, ox, oy);

  // Deck top surface corners
  const top = (x: number, y: number) => iso(x, y, structHeight + deckHeight, scale, ox, oy);
  const t00 = top(0, 0);
  const tA0 = top(ancho, 0);
  const t0L = top(0, largo);
  const tAL = top(ancho, largo);

  // Structural base corners (bottom of structure)
  const bot = (x: number, y: number) => iso(x, y, 0, scale, ox, oy);

  // Front face (y=0) and left face (x=0) of the structure block
  const mid = (x: number, y: number) => iso(x, y, structHeight, scale, ox, oy);
  const m00 = mid(0, 0);
  const mA0 = mid(ancho, 0);
  const m0L = mid(0, largo);
  const mAL = mid(ancho, largo);

  // Boards (tablas) — visible on top surface
  const boards: JSX.Element[] = [];
  const numBoards = Math.ceil(ancho / (boardWidth + 0.005));

  if (result.tubeDirection === "vertical") {
    // Boards run along largo (y), separated in x
    for (let i = 0; i < numBoards; i++) {
      const bx = i * (boardWidth + 0.005);
      if (bx >= ancho) break;
      const bx2 = Math.min(bx + boardWidth, ancho);
      const p0 = top(bx, 0);
      const p1 = top(bx2, 0);
      const p2 = top(bx2, largo);
      const p3 = top(bx, largo);
      const fill = i % 2 === 0 ? DECK_COLOR : DECK_DARK;
      boards.push(
        <polygon key={`board-${i}`}
          points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
          fill={fill} stroke="#8a5c30" strokeWidth={0.5}
        />
      );
    }
  } else {
    // Boards run along ancho (x), separated in y
    const numBoardsY = Math.ceil(largo / (boardWidth + 0.005));
    for (let i = 0; i < numBoardsY; i++) {
      const by = i * (boardWidth + 0.005);
      if (by >= largo) break;
      const by2 = Math.min(by + boardWidth, largo);
      const p0 = top(0, by);
      const p1 = top(ancho, by);
      const p2 = top(ancho, by2);
      const p3 = top(0, by2);
      const fill = i % 2 === 0 ? DECK_COLOR : DECK_DARK;
      boards.push(
        <polygon key={`board-${i}`}
          points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
          fill={fill} stroke="#8a5c30" strokeWidth={0.5}
        />
      );
    }
  }

  // Tube lines on the top surface
  const tubeLines: JSX.Element[] = [];
  result.tubePositions.forEach((pos, i) => {
    if (result.tubeDirection === "vertical") {
      const p1 = top(pos, 0);
      const p2 = top(pos, largo);
      tubeLines.push(
        <line key={`tube-${i}`}
          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke={STRUCT_COLOR} strokeWidth={1.5} strokeDasharray="4 2"
        />
      );
    } else {
      const p1 = top(0, pos);
      const p2 = top(ancho, pos);
      tubeLines.push(
        <line key={`tube-${i}`}
          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke={STRUCT_COLOR} strokeWidth={1.5} strokeDasharray="4 2"
        />
      );
    }
  });

  // Pilotines on front-visible tubes
  const pilotins: JSX.Element[] = [];
  result.pilotinPositions.forEach((pos, i) => {
    const top3d = iso(pos.x, pos.y, structHeight, scale, ox, oy);
    const bot3d = iso(pos.x, pos.y, 0, scale, ox, oy);
    pilotins.push(
      <line key={`pil-${i}`}
        x1={top3d.x} y1={top3d.y} x2={bot3d.x} y2={bot3d.y}
        stroke={PILOTIN_COLOR} strokeWidth={1.2}
      />
    );
    pilotins.push(
      <circle key={`pil-c-${i}`}
        cx={bot3d.x} cy={bot3d.y} r={2}
        fill={PILOTIN_COLOR}
      />
    );
  });

  // Cover perimetral lines on top edges
  const coverLines: JSX.Element[] = [];
  const coverZ = structHeight + deckHeight + 0.02;
  if (cover?.ancho1) {
    const p1 = iso(0, 0, coverZ, scale, ox, oy);
    const p2 = iso(ancho, 0, coverZ, scale, ox, oy);
    coverLines.push(<line key="cov-a1" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={COVER_COLOR} strokeWidth={4} strokeLinecap="round" />);
  }
  if (cover?.ancho2) {
    const p1 = iso(0, largo, coverZ, scale, ox, oy);
    const p2 = iso(ancho, largo, coverZ, scale, ox, oy);
    coverLines.push(<line key="cov-a2" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={COVER_COLOR} strokeWidth={4} strokeLinecap="round" />);
  }
  if (cover?.largo1) {
    const p1 = iso(0, 0, coverZ, scale, ox, oy);
    const p2 = iso(0, largo, coverZ, scale, ox, oy);
    coverLines.push(<line key="cov-l1" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={COVER_COLOR} strokeWidth={4} strokeLinecap="round" />);
  }
  if (cover?.largo2) {
    const p1 = iso(ancho, 0, coverZ, scale, ox, oy);
    const p2 = iso(ancho, largo, coverZ, scale, ox, oy);
    coverLines.push(<line key="cov-l2" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={COVER_COLOR} strokeWidth={4} strokeLinecap="round" />);
  }

  // Structure side face points (front: y=0, left: x=0)
  const frontFace = [
    `${c00.x},${c00.y}`,
    `${cA0.x},${cA0.y}`,
    `${mA0.x},${mA0.y}`,
    `${m00.x},${m00.y}`,
  ].join(" ");

  const leftFace = [
    `${c00.x},${c00.y}`,
    `${c0L.x},${c0L.y}`,
    `${m0L.x},${m0L.y}`,
    `${m00.x},${m00.y}`,
  ].join(" ");

  const rightFace = [
    `${cA0.x},${cA0.y}`,
    `${cAL.x},${cAL.y}`,
    `${mAL.x},${mAL.y}`,
    `${mA0.x},${mA0.y}`,
  ].join(" ");

  const backFace = [
    `${c0L.x},${c0L.y}`,
    `${cAL.x},${cAL.y}`,
    `${mAL.x},${mAL.y}`,
    `${m0L.x},${m0L.y}`,
  ].join(" ");

  const topStructFace = [
    `${m00.x},${m00.y}`,
    `${mA0.x},${mA0.y}`,
    `${mAL.x},${mAL.y}`,
    `${m0L.x},${m0L.y}`,
  ].join(" ");

  const topDeckFace = [
    `${t00.x},${t00.y}`,
    `${tA0.x},${tA0.y}`,
    `${tAL.x},${tAL.y}`,
    `${t0L.x},${t0L.y}`,
  ].join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="mx-auto max-w-full"
        style={{ maxHeight: 320 }}
      >
        {/* Ground shadow */}
        <ellipse cx={ox} cy={oy + 8} rx={ancho * scale * 0.9} ry={12} fill="rgba(0,0,0,0.08)" />

        {/* Structure body - back faces first (painter's algo) */}
        <polygon points={backFace} fill="hsl(200 10% 75%)" stroke="hsl(200 10% 55%)" strokeWidth={0.5} />
        <polygon points={rightFace} fill="hsl(200 10% 65%)" stroke="hsl(200 10% 50%)" strokeWidth={0.5} />
        <polygon points={leftFace} fill="hsl(200 10% 70%)" stroke="hsl(200 10% 50%)" strokeWidth={0.5} />
        <polygon points={frontFace} fill="hsl(200 10% 72%)" stroke="hsl(200 10% 50%)" strokeWidth={0.5} />
        <polygon points={topStructFace} fill="hsl(200 10% 80%)" stroke="hsl(200 10% 55%)" strokeWidth={0.5} />

        {/* Pilotines (behind boards) */}
        {pilotins}

        {/* Boards on top */}
        {boards}

        {/* Tube lines over boards */}
        {tubeLines}

        {/* Cover perimetral */}
        {coverLines}

        {/* Dimension labels */}
        <text
          x={(cA0.x + c00.x) / 2}
          y={(cA0.y + c00.y) / 2 + 14}
          textAnchor="middle" fontSize={10} fontWeight={600}
          fill="hsl(200 10% 30%)"
        >
          {ancho} m
        </text>
        <text
          x={(c0L.x + c00.x) / 2 - 10}
          y={(c0L.y + c00.y) / 2}
          textAnchor="middle" fontSize={10} fontWeight={600}
          fill="hsl(200 10% 30%)"
        >
          {largo} m
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm" style={{ background: DECK_COLOR }} />
          Tablas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-2 rounded-sm" style={{ background: "hsl(200 10% 70%)" }} />
          Estructura
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1 h-4 rounded" style={{ background: PILOTIN_COLOR }} />
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

export default IsometricDeckSVG;
