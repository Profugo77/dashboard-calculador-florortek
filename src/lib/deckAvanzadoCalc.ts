export type BoardDir = "horizontal" | "vertical";
export type BoardLen = 2.2 | 2.9;
export type ShapeMode = "rectangle" | "multi-rect" | "croquis";


export interface SubRect {
  id: string;
  largo: number;
  ancho: number;
}

export interface AvzCalcResult {
  m2Netos: number;
  m2Compra: number;
  tablasUn: number;
  vigasMl: number;
  cantVigas: number;
  sepVigas: number;
  clips: number;
  filasTablas: number;
  pilotines: number;
  boardJoints: number[];
  doubleBeamCount: number;
}

/* ─── Max overhang (voladizo) for boards ─── */
const MAX_VOLADIZO = 0.10; // 10 cm max board overhang past last beam
const MAX_PILOTINE_SPACING = 0.40; // 40 cm max between pilotines along a beam

/* ─── Optimization: 35–40 cm beam spacing, with ≤10cm voladizo ─── */
export function optimizeBeamSpacing(dist: number): { count: number; spacing: number } {
  // Beams at 0 and dist (edges), inner beams spaced 35-40 cm
  // With voladizo: first beam can be up to 10cm from edge, last beam up to 10cm from other edge
  // This means the "beam span" can be dist - 2*voladizo at minimum
  // But for simplicity and structural safety, we place beams at 0 and dist (no overhang)
  // and optimize inner spacing between 35-40cm
  const nMax = Math.ceil(dist / 0.35);
  const spacingMax = dist / nMax;
  const nLess = nMax - 1;
  if (nLess >= 1) {
    const spacingLess = dist / nLess;
    if (spacingLess <= 0.40) {
      return { count: nLess + 1, spacing: spacingLess };
    }
  }
  return { count: nMax + 1, spacing: spacingMax };
}

/* ─── Calculate pilotines for a beam, max 40cm spacing ─── */
export function pilotinesForBeam(beamLength: number): number {
  if (beamLength <= 0) return 0;
  return Math.max(2, Math.ceil(beamLength / MAX_PILOTINE_SPACING) + 1);
}

/* ─── Rectangle calculation ─── */
export function calculateRect(
  largo: number,
  ancho: number,
  dir: BoardDir,
  boardLen: BoardLen
): AvzCalcResult {
  const BOARD_W = 0.15;
  const m2Netos = largo * ancho;
  const m2Compra = Math.ceil(m2Netos * 1.10 * 100) / 100;

  // Beams: spaced along beamRunDim, each beam spans beamLength
  const beamRunDim = dir === "horizontal" ? largo : ancho;
  const beamLength = dir === "horizontal" ? ancho : largo;
  const { count: cantVigas, spacing: sepVigas } = optimizeBeamSpacing(beamRunDim);
  const vigasMl = Math.ceil(cantVigas * beamLength * 100) / 100;

  // Board rows
  const stackDim = dir === "horizontal" ? largo : ancho;
  const filasTablas = Math.ceil(stackDim / BOARD_W);

  // Pieces per row
  const boardDim = dir === "horizontal" ? ancho : largo;
  const piecesPerRow = Math.ceil(boardDim / boardLen);
  const tablasUn = filasTablas * piecesPerRow;

  // Board joints (where boards meet end-to-end)
  const boardJoints: number[] = [];
  for (let p = boardLen; p < boardDim - 0.05; p += boardLen) {
    boardJoints.push(Math.round(p * 100) / 100);
  }

  // Clips: 1 per beam×row intersection + 10%
  const rawClips = cantVigas * filasTablas;
  const clips = Math.ceil(rawClips * 1.10);

  // Pilotines: max 40cm spacing along each beam
  // At double beam joints, pilotines are shared (not doubled)
  const pilotinesPerBeam = pilotinesForBeam(beamLength);
  // Regular beams get their own pilotines; double beams at joints share pilotines
  const regularBeamCount = cantVigas;
  const sharedJointPilotines = boardJoints.length > 0
    ? boardJoints.length * pilotinesForBeam(beamRunDim <= 0 ? beamLength : beamLength)
    : 0;
  // Total: each regular beam gets pilotines, double beams share (count once not twice)
  const pilotines = regularBeamCount * pilotinesPerBeam + sharedJointPilotines;

  return {
    m2Netos: Math.round(m2Netos * 100) / 100,
    m2Compra,
    tablasUn,
    vigasMl,
    cantVigas,
    sepVigas: Math.round(sepVigas * 1000) / 10,
    clips,
    filasTablas,
    pilotines,
    boardJoints,
    doubleBeamCount: boardJoints.length,
  };
}


/* ─── Multi-rect: sum of independent rectangles ─── */
export function calculateMultiRect(
  rects: SubRect[],
  dir: BoardDir,
  boardLen: BoardLen
): AvzCalcResult {
  const results = rects.map((r) => calculateRect(r.largo, r.ancho, dir, boardLen));
  return {
    m2Netos: Math.round(results.reduce((s, r) => s + r.m2Netos, 0) * 100) / 100,
    m2Compra: Math.round(results.reduce((s, r) => s + r.m2Compra, 0) * 100) / 100,
    tablasUn: results.reduce((s, r) => s + r.tablasUn, 0),
    vigasMl: Math.round(results.reduce((s, r) => s + r.vigasMl, 0) * 100) / 100,
    cantVigas: results.reduce((s, r) => s + r.cantVigas, 0),
    sepVigas: results[0]?.sepVigas ?? 0,
    clips: results.reduce((s, r) => s + r.clips, 0),
    filasTablas: results.reduce((s, r) => s + r.filasTablas, 0),
    pilotines: results.reduce((s, r) => s + r.pilotines, 0),
    boardJoints: results[0]?.boardJoints ?? [],
    doubleBeamCount: results.reduce((s, r) => s + r.doubleBeamCount, 0),
  };
}
