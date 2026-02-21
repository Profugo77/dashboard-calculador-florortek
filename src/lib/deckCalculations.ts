export interface CoverPerimetral {
  ancho1: boolean;
  ancho2: boolean;
  largo1: boolean;
  largo2: boolean;
}

export type AlturaDisponible = "5a7" | "mas7";

export interface DeckInput {
  ancho: number;
  largo: number;
  medidaTabla: "2.2" | "2.9";
  sentido: "horizontal" | "vertical";
  altura: AlturaDisponible;
  coverPerimetral?: CoverPerimetral;
}

export interface DeckResult {
  superficieReal: number;
  superficieConDesperdicio: number;
  metrosLinealesAluminio: number;
  cantidadTubos: number;
  pilotines: number;
  clips: number;
  tornillos: number;
  mlCoverPerimetral: number;
  // For SVG drawing
  tubePositions: number[];
  tubeLength: number;
  pilotinPositions: { x: number; y: number }[];
  tubeDirection: "horizontal" | "vertical";
  // Info for display
  separacionTubos: number; // in cm
  separacionPilotines: number; // in cm
  tipoAluminio: string;
}

export function calculateDeck(input: DeckInput): DeckResult {
  const { ancho, largo } = input;
  
  // Surface
  const superficieReal = ancho * largo;
  const superficieConDesperdicio = superficieReal * 1.10;

  // Tube direction is PERPENDICULAR to board direction
  const tubeDirection = input.sentido === "horizontal" ? "vertical" : "horizontal";

  // Dimension perpendicular to tubes (spacing axis) and parallel (tube length)
  const spacingDimension = tubeDirection === "vertical" ? ancho : largo;
  const tubeLengthDimension = tubeDirection === "vertical" ? largo : ancho;

  // Tubes: max 37cm spacing, distributed proportionally
  // Must start and end with a tube
  const maxTubeSpacing = 0.37;
  const numTubeSpaces = Math.ceil(spacingDimension / maxTubeSpacing);
  const actualTubeSpacing = spacingDimension / numTubeSpaces;
  const cantidadTubos = numTubeSpaces + 1;
  
  const tubePositions: number[] = [];
  for (let i = 0; i < cantidadTubos; i++) {
    tubePositions.push(i * actualTubeSpacing);
  }

  // ML = internal tubes + perimeter frame
  const mlTubosInternos = cantidadTubos * tubeLengthDimension;
  const perimetro = 2 * (ancho + largo);
  const metrosLinealesAluminio = Math.ceil((mlTubosInternos + perimetro) * 100) / 100;

  // Pilotines spacing depends on height
  // 5-7cm: every 50cm max | >7cm: every 75cm max (40x40 tubes)
  // Must start and end with a pilotin, distributed proportionally
  const maxPilotinSpacing = input.altura === "mas7" ? 0.75 : 0.50;
  const numPilotinSpaces = Math.ceil(tubeLengthDimension / maxPilotinSpacing);
  const actualPilotinSpacing = tubeLengthDimension / numPilotinSpaces;
  const pilotinesPorTubo = numPilotinSpaces + 1;
  const pilotines = cantidadTubos * pilotinesPorTubo;

  // Pilotin positions for SVG
  const pilotinPositions: { x: number; y: number }[] = [];
  for (let i = 0; i < cantidadTubos; i++) {
    for (let j = 0; j < pilotinesPorTubo; j++) {
      if (tubeDirection === "vertical") {
        pilotinPositions.push({ x: i * actualTubeSpacing, y: j * actualPilotinSpacing });
      } else {
        pilotinPositions.push({ x: j * actualPilotinSpacing, y: i * actualTubeSpacing });
      }
    }
  }

  // Clips & screws
  const clips = Math.ceil(superficieReal * 18);
  const tornillos = clips;

  // Cover perimetral (ml por lado seleccionado)
  const cover = input.coverPerimetral;
  const mlCoverPerimetral = cover
    ? (cover.ancho1 ? ancho : 0) +
      (cover.ancho2 ? ancho : 0) +
      (cover.largo1 ? largo : 0) +
      (cover.largo2 ? largo : 0)
    : 0;

  const tipoAluminio = input.altura === "mas7" ? "Aluminio 40×40" : "Aluminio 20×40";

  return {
    superficieReal,
    superficieConDesperdicio: Math.ceil(superficieConDesperdicio * 100) / 100,
    metrosLinealesAluminio,
    cantidadTubos,
    pilotines,
    clips,
    tornillos,
    mlCoverPerimetral: Math.ceil(mlCoverPerimetral * 100) / 100,
    tubePositions,
    tubeLength: tubeLengthDimension,
    pilotinPositions,
    tubeDirection,
    separacionTubos: Math.round(actualTubeSpacing * 100 * 100) / 100,
    separacionPilotines: Math.round(actualPilotinSpacing * 100 * 100) / 100,
    tipoAluminio,
  };
}
