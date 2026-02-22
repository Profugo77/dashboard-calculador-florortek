export type BoardDir = "horizontal" | "vertical";
export type BoardLen = 2.2 | 2.9;
export type ShapeMode = "rectangle" | "l-shape" | "multi-rect" | "croquis";

export interface LShapeAvz {
  anchoTotal: number;
  largoTotal: number;
  anchoBrazo: number;
  largoBrazo: number;
}

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

/* ─── Optimization: 35–40 cm beam spacing ─── */
export function optimizeBeamSpacing(dist: number): { count: number; spacing: number } {
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

  // Pilotines: ~80cm along each beam
  const pilotinesPerBeam = Math.max(2, Math.ceil(beamLength / 0.80) + 1);
  const pilotines = cantVigas * pilotinesPerBeam;

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

/* ─── L-shape calculation ─── */
export function calculateLShape(
  ls: LShapeAvz,
  dir: BoardDir,
  boardLen: BoardLen
): AvzCalcResult {
  const BOARD_W = 0.15;
  const m2Netos = ls.anchoTotal * ls.largoBrazo + ls.anchoBrazo * (ls.largoTotal - ls.largoBrazo);
  const m2Compra = Math.ceil(m2Netos * 1.10 * 100) / 100;

  // Treat as bounding rectangle for beam/board calcs
  const largo = ls.largoTotal;
  const ancho = ls.anchoTotal;

  const beamRunDim = dir === "horizontal" ? largo : ancho;
  const beamLength = dir === "horizontal" ? ancho : largo;
  const { count: cantVigas, spacing: sepVigas } = optimizeBeamSpacing(beamRunDim);

  // Beams may be shorter in the L cutout
  let vigasMl = 0;
  for (let i = 0; i < cantVigas; i++) {
    const pos = i * (sepVigas / 100);
    let len = beamLength;
    if (dir === "horizontal") {
      // Beams are horizontal, positioned along largo (Y)
      if (pos > ls.largoBrazo) len = ls.anchoBrazo;
    } else {
      if (pos > ls.anchoBrazo) len = ls.largoBrazo;
    }
    vigasMl += len;
  }
  vigasMl = Math.ceil(vigasMl * 100) / 100;

  const stackDim = dir === "horizontal" ? largo : ancho;
  const filasTablas = Math.ceil(stackDim / BOARD_W);
  const boardDim = dir === "horizontal" ? ancho : largo;
  const piecesPerRow = Math.ceil(boardDim / boardLen);
  const tablasUn = Math.ceil(filasTablas * piecesPerRow * (m2Netos / (largo * ancho)));

  const boardJoints: number[] = [];
  for (let p = boardLen; p < boardDim - 0.05; p += boardLen) {
    boardJoints.push(Math.round(p * 100) / 100);
  }

  const rawClips = cantVigas * filasTablas;
  const clips = Math.ceil(rawClips * 1.10 * (m2Netos / (largo * ancho)));

  const pilotinesPerBeam = Math.max(2, Math.ceil(beamLength / 0.80) + 1);
  const pilotines = Math.ceil(cantVigas * pilotinesPerBeam * (m2Netos / (largo * ancho)));

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
