import { DeckResult, CoverPerimetral } from "@/lib/deckCalculations";
import jsPDF from "jspdf";

export function exportPDF(
  input: { ancho: number; largo: number; medidaTabla: string; sentido: string; cover?: CoverPerimetral },
  result: DeckResult
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(0, 133, 119); // #008577
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
  doc.text(`Área: ${input.ancho} m × ${input.largo} m`, 14, y);
  y += 6;
  doc.text(`Medida de tabla: ${input.medidaTabla} m`, 14, y);
  y += 6;
  doc.text(`Sentido de instalación: ${input.sentido}`, 14, y);
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

  // Floor plan diagram
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

  // Area rect
  doc.setFillColor(230, 245, 243);
  doc.setDrawColor(0, 133, 119);
  doc.setLineWidth(0.5);
  doc.rect(ox, oy, dw, dh, "FD");

  // Tubes
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 1.5], 0);
  result.tubePositions.forEach((pos) => {
    if (result.tubeDirection === "vertical") {
      const x = ox + pos * scale;
      doc.line(x, oy, x, oy + dh);
    } else {
      const yy = oy + pos * scale;
      doc.line(ox, yy, ox + dw, yy);
    }
  });
  doc.setLineDashPattern([], 0);

  // Pilotines
  result.pilotinPositions.forEach((pos) => {
    const cx = ox + pos.x * scale;
    const cy = oy + pos.y * scale;
    doc.setFillColor(0, 133, 119);
    doc.circle(cx, cy, 0.8, "F");
  });

  // Cover perimetral — líneas naranjas
  if (input.cover) {
    doc.setDrawColor(255, 120, 20);
    doc.setLineWidth(1.2);
    const co = 0.6;
    if (input.cover.ancho1) doc.line(ox - co, oy, ox + dw + co, oy);
    if (input.cover.ancho2) doc.line(ox - co, oy + dh, ox + dw + co, oy + dh);
    if (input.cover.largo1) doc.line(ox, oy - co, ox, oy + dh + co);
    if (input.cover.largo2) doc.line(ox + dw, oy - co, ox + dw, oy + dh + co);
  }

  // Dimension labels
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.text(`${input.ancho} m`, ox + dw / 2, oy - 2, { align: "center" });
  // Vertical label
  doc.text(`${input.largo} m`, ox - 4, oy + dh / 2, { align: "center", angle: 90 });

  // Legend
  y = oy + dh + 8;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("--- Tubos de aluminio    ● Pilotines", ox, y);

  // Footer
  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Generado por Floortek — Calculadora Técnica de Decks | tiendapisos.com", 14, y);

  doc.save(`Presupuesto_Floortek_${input.ancho}x${input.largo}.pdf`);
}
