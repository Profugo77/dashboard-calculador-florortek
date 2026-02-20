export interface DeckInput {
  ancho: number;
  largo: number;
  medidaTabla: "2.2" | "2.9";
  sentido: "horizontal" | "vertical";
}

export interface DeckResult {
  superficieReal: number;
  superficieConDesperdicio: number;
  metrosLinealesAluminio: number;
  cantidadTubos: number;
  pilotines: number;
  clips: number;
  tornillos: number;
  // For SVG drawing
  tubePositions: number[];
  tubeLength: number;
  pilotinPositions: { x: number; y: number }[];
  tubeDirection: "horizontal" | "vertical";
}

export function calculateDeck(input: DeckInput): DeckResult {
  const { ancho, largo } = input;
  
  // Surface
  const superficieReal = ancho * largo;
  const superficieConDesperdicio = superficieReal * 1.10;

  // Tube direction is PERPENDICULAR to board direction
  // If boards are horizontal, tubes run vertical and vice versa
  const tubeDirection = input.sentido === "horizontal" ? "vertical" : "horizontal";

  // Dimension perpendicular to tubes (spacing axis) and parallel (tube length)
  const spacingDimension = tubeDirection === "vertical" ? ancho : largo;
  const tubeLengthDimension = tubeDirection === "vertical" ? largo : ancho;

  // Internal tubes every 35cm
  const cantidadTubos = Math.floor(spacingDimension / 0.35) + 1;
  const tubePositions: number[] = [];
  for (let i = 0; i < cantidadTubos; i++) {
    tubePositions.push(i * 0.35);
  }

  // ML = internal tubes + perimeter frame
  const mlTubosInternos = cantidadTubos * tubeLengthDimension;
  const perimetro = 2 * (ancho + largo);
  const metrosLinealesAluminio = Math.ceil((mlTubosInternos + perimetro) * 100) / 100;

  // Pilotines: 1 every 50cm on each tube line
  const pilotinesPorTubo = Math.floor(tubeLengthDimension / 0.50) + 1;
  const pilotines = cantidadTubos * pilotinesPorTubo;

  // Pilotin positions for SVG
  const pilotinPositions: { x: number; y: number }[] = [];
  for (let i = 0; i < cantidadTubos; i++) {
    for (let j = 0; j < pilotinesPorTubo; j++) {
      if (tubeDirection === "vertical") {
        pilotinPositions.push({ x: i * 0.35, y: j * 0.50 });
      } else {
        pilotinPositions.push({ x: j * 0.50, y: i * 0.35 });
      }
    }
  }

  // Clips & screws
  const clips = Math.ceil(superficieReal * 18);
  const tornillos = clips;

  return {
    superficieReal,
    superficieConDesperdicio: Math.ceil(superficieConDesperdicio * 100) / 100,
    metrosLinealesAluminio,
    cantidadTubos,
    pilotines,
    clips,
    tornillos,
    tubePositions,
    tubeLength: tubeLengthDimension,
    pilotinPositions,
    tubeDirection,
  };
}
