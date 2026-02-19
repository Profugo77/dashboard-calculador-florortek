import { DeckResult } from "@/lib/deckCalculations";
import jsPDF from "jspdf";

export function exportPDF(
  input: { ancho: number; largo: number; medidaTabla: string; sentido: string },
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

  const rows = [
    ["Material", "Cantidad"],
    ["Superficie de tablas (m²)", result.superficieConDesperdicio.toFixed(2)],
    ["Estructura aluminio (ml)", result.metrosLinealesAluminio.toFixed(2)],
    ["Pilotines", String(result.pilotines)],
    ["Clips de fijación", String(result.clips)],
    ["Tornillos técnicos", String(result.tornillos)],
  ];

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

  // Footer
  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Generado por Floortek — Calculadora Técnica de Decks | tiendapisos.com", 14, y);

  doc.save(`Presupuesto_Floortek_${input.ancho}x${input.largo}.pdf`);
}
