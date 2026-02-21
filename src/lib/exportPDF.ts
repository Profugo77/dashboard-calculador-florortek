import { DeckResult, CoverPerimetral, LShapeConfig } from "@/lib/deckCalculations";
import jsPDF from "jspdf";

export function exportPDF(
  input: { ancho: number; largo: number; medidaTabla: string; sentido: string; cover?: CoverPerimetral; forma?: string; lShape?: LShapeConfig },
  result: DeckResult
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(0, 133, 119);
  doc.rect(0, 0, w, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FLOORTEK", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Calculadora Técnica de Decks", 14, 24);

  const today = new Date().toLocaleDateString("es-AR");
  doc.setFontSize(9);
  doc.text(today, w - 14, 16, { align: "right" });

  // Config section
  let y = 44;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del Proyecto", 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (input.forma === "L" && input.lShape) {
    doc.text(`Forma: En L — ${input.lShape.anchoTotal}×${input.lShape.largoTotal} m (brazo ${input.lShape.anchoBrazo}×${input.lShape.largoBrazo} m)`, 14, y);
  } else {
    doc.text(`Área: ${input.ancho} m × ${input.largo} m`, 14, y);
  }
  y += 6;
  doc.text(`Tabla: ${input.medidaTabla} m | Sentido: ${input.sentido} | Estilo: ${result.estiloColocacion === "panos" ? "Por paños" : "Trabado"}`, 14, y);
  y += 6;
  doc.text(`${result.tipoAluminio} — Sep. tubos: ${result.separacionTubos} cm — Sep. pilotines: ${result.separacionPilotines} cm`, 14, y);
  y += 12;

  // Materials table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumen de Materiales", 14, y);
  y += 8;

  const rows: string[][] = [
    ["Material", "Cantidad"],
    ["Superficie de tablas (m²)", result.superficieConDesperdicio.toFixed(2)],
    ["Estructura aluminio (ml)", result.metrosLinealesAluminio.toFixed(2)],
    ["Pilotines", String(result.pilotines)],
    ["Clips de fijación", String(result.clips)],
    ["Tornillos técnicos", String(result.tornillos)],
  ];
  if (result.mlCoverPerimetral > 0) {
    rows.push(["Cover perimetral (ml)", result.mlCoverPerimetral.toFixed(2)]);
  }

  doc.setFontSize(10);
  const colX = [14, w - 50];

  rows.forEach((row, i) => {
    if (i === 0) {
      doc.setFillColor(0, 133, 119);
      doc.rect(12, y - 4, w - 24, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");
      if (i % 2 === 0) {
        doc.setFillColor(240, 248, 246);
        doc.rect(12, y - 4, w - 24, 7, "F");
      }
    }
    doc.text(row[0], colX[0], y);
    doc.text(row[1], colX[1], y, { align: "right" });
    y += 7;
  });

  // Floor plan
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Plano de Planta", 14, y);
  y += 6;

  const maxDiagramW = w - 28;
  const maxDiagramH = 100;
  const scale = Math.min(maxDiagramW / input.ancho, maxDiagramH / input.largo);
  const dw = input.ancho * scale;
  const dh = input.largo * scale;
  const ox = 14 + (maxDiagramW - dw) / 2;
  const oy = y;

  // Area shape
  if (input.forma === "L" && input.lShape) {
    const ls = input.lShape;
    const ab = ls.anchoBrazo * scale;
    const lb = ls.largoBrazo * scale;

    // Fill L with two rectangles
    doc.setFillColor(230, 245, 243);
    doc.rect(ox, oy, dw, lb, "F");
    doc.rect(ox, oy + lb, ab, dh - lb, "F");

    // Outline
    doc.setDrawColor(0, 133, 119);
    doc.setLineWidth(0.5);
    const pts = [
      [ox, oy], [ox + dw, oy], [ox + dw, oy + lb],
      [ox + ab, oy + lb], [ox + ab, oy + dh], [ox, oy + dh],
    ];
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      doc.line(pts[i][0], pts[i][1], next[0], next[1]);
    }
  } else {
    doc.setFillColor(230, 245, 243);
    doc.setDrawColor(0, 133, 119);
    doc.setLineWidth(0.5);
    doc.rect(ox, oy, dw, dh, "FD");
  }

  // Tubes
  result.tubePositions.forEach((tube) => {
    if (tube.isDouble) {
      doc.setDrawColor(40, 60, 80);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([], 0);
    } else {
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([2, 1.5], 0);
    }

    if (result.tubeDirection === "vertical") {
      const x = ox + tube.position * scale;
      let tubeH = dh;
      if (input.forma === "L" && input.lShape && tube.position > input.lShape.anchoBrazo + 0.001) {
        tubeH = input.lShape.largoBrazo * scale;
      }
      doc.line(x, oy, x, oy + tubeH);
    } else {
      const yy = oy + tube.position * scale;
      let tubeW = dw;
      if (input.forma === "L" && input.lShape && tube.position > input.lShape.largoBrazo + 0.001) {
        tubeW = input.lShape.anchoBrazo * scale;
      }
      doc.line(ox, yy, ox + tubeW, yy);
    }
  });
  doc.setLineDashPattern([], 0);

  // Pilotines
  result.pilotinPositions.forEach((pos) => {
    doc.setFillColor(0, 133, 119);
    doc.circle(ox + pos.x * scale, oy + pos.y * scale, 0.8, "F");
  });

  // Cover
  if (input.cover) {
    doc.setDrawColor(255, 120, 20);
    doc.setLineWidth(1.2);
    const co = 0.6;
    if (input.forma === "L" && input.lShape) {
      const ls = input.lShape;
      if (input.cover.ancho1) doc.line(ox - co, oy, ox + dw + co, oy);
      if (input.cover.ancho2) doc.line(ox - co, oy + dh, ox + ls.anchoBrazo * scale + co, oy + dh);
      if (input.cover.largo1) doc.line(ox, oy - co, ox, oy + dh + co);
      if (input.cover.largo2) doc.line(ox + dw, oy - co, ox + dw, oy + ls.largoBrazo * scale + co);
    } else {
      if (input.cover.ancho1) doc.line(ox - co, oy, ox + dw + co, oy);
      if (input.cover.ancho2) doc.line(ox - co, oy + dh, ox + dw + co, oy + dh);
      if (input.cover.largo1) doc.line(ox, oy - co, ox, oy + dh + co);
      if (input.cover.largo2) doc.line(ox + dw, oy - co, ox + dw, oy + dh + co);
    }
  }

  // Labels
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.text(`${input.ancho} m`, ox + dw / 2, oy - 2, { align: "center" });
  doc.text(`${input.largo} m`, ox - 4, oy + dh / 2, { align: "center", angle: 90 });

  // Legend
  y = oy + dh + 8;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("--- Tubos    ── Doble estructura    ● Pilotines", ox, y);

  // Footer
  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Generado por Floortek — Calculadora Técnica de Decks | tiendapisos.com", 14, y);

  doc.save(`Presupuesto_Floortek_${input.ancho}x${input.largo}.pdf`);
}
