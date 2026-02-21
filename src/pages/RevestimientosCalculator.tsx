import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, X, Wallpaper, Calculator, Download } from "lucide-react";
import jsPDF from "jspdf";

// ─── Panel Catalog ───────────────────────────────────────────────
interface Panel {
  id: string;
  label: string;
  widthCm: number;       // ancho nominal
  heightM: number;       // alto nominal
  usefulWidthCm: number; // ancho útil para cálculo
}

const PANELS: Panel[] = [
  { id: "12x285", label: "Panel 12cm × 2.85m", widthCm: 12, heightM: 2.85, usefulWidthCm: 11.3 },
  { id: "12x270", label: "Panel 12cm × 2.70m", widthCm: 12, heightM: 2.70, usefulWidthCm: 11.3 },
  { id: "25x285", label: "Panel 25cm × 2.85m", widthCm: 25, heightM: 2.85, usefulWidthCm: 24.3 },
  { id: "25x290", label: "Panel 25cm × 2.90m", widthCm: 25, heightM: 2.90, usefulWidthCm: 24.5 },
];

// ─── Types ───────────────────────────────────────────────────────
interface Wall {
  id: number;
  name: string;
  ancho: string; // metros
  alto: string;  // metros
}

// ─── Calculation Logic ───────────────────────────────────────────
function calcWall(wallWidth: number, wallHeight: number, panel: Panel) {
  if (wallWidth <= 0 || wallHeight <= 0) return { panelsAcross: 0, panelsNeeded: 0, piecesPerColumn: 0 };

  const usefulWidthM = panel.usefulWidthCm / 100;
  const panelH = panel.heightM;

  // Cantidad de franjas (ancho)
  const panelsAcross = Math.ceil(wallWidth / usefulWidthM);

  // Cantidad de tramos verticales por columna
  const piecesPerColumn = Math.ceil(wallHeight / panelH);

  let panelsNeeded: number;

  if (wallHeight <= panelH / 2) {
    // Cada panel rinde 2 piezas → dividimos entre 2
    panelsNeeded = Math.ceil(panelsAcross / 2);
  } else if (wallHeight <= panelH) {
    // 1 panel por columna
    panelsNeeded = panelsAcross;
  } else {
    // Pared más alta que el panel
    const fullSections = Math.floor(wallHeight / panelH);
    const remainder = wallHeight - fullSections * panelH;

    if (remainder <= 0.001) {
      // Encaja exacto
      panelsNeeded = panelsAcross * piecesPerColumn;
    } else if (remainder <= panelH / 2) {
      // El sobrante es chico: cada panel cortado rinde 2 piezas de remanente
      const fullPanels = panelsAcross * fullSections;
      const remainderPanels = Math.ceil(panelsAcross / 2);
      panelsNeeded = fullPanels + remainderPanels;
    } else {
      // El sobrante es más de la mitad → 1 panel extra por columna
      panelsNeeded = panelsAcross * piecesPerColumn;
    }
  }

  return { panelsAcross, panelsNeeded, piecesPerColumn };
}

// ─── Main Component ──────────────────────────────────────────────
const RevestimientosCalculator = () => {
  const navigate = useNavigate();

  const [panelId, setPanelId] = useState(PANELS[0].id);
  const panel = PANELS.find((p) => p.id === panelId) ?? PANELS[0];

  const [walls, setWalls] = useState<Wall[]>([{ id: 1, name: "Pared 1", ancho: "", alto: "" }]);
  const [nextWallId, setNextWallId] = useState(2);

  const addWall = () => {
    setWalls((prev) => [...prev, { id: nextWallId, name: `Pared ${nextWallId}`, ancho: "", alto: "" }]);
    setNextWallId((n) => n + 1);
  };
  const removeWall = (id: number) => {
    if (walls.length <= 1) return;
    setWalls((prev) => prev.filter((w) => w.id !== id));
  };
  const updateWall = (id: number, field: "ancho" | "alto", value: string) => {
    setWalls((prev) => prev.map((w) => (w.id === id ? { ...w, [field]: value } : w)));
  };

  // ─── Calculations ──────────────────────────────────────────────
  const wallResults = useMemo(() => {
    return walls.map((w) => {
      const ancho = parseFloat(w.ancho) || 0;
      const alto = parseFloat(w.alto) || 0;
      const result = calcWall(ancho, alto, panel);
      return { ...w, ancho, alto, area: ancho * alto, ...result };
    });
  }, [walls, panel]);

  const totalPanels = wallResults.reduce((s, w) => s + w.panelsNeeded, 0);
  const totalArea = wallResults.reduce((s, w) => s + w.area, 0);
  const hasData = totalArea > 0;

  // ─── PDF Export ────────────────────────────────────────────────
  const handleExportPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(0, 133, 119);
    doc.rect(0, 0, pw, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("REVESTIMIENTOS", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Esquema de Materiales", 14, 24);
    const today = new Date().toLocaleDateString("es-AR");
    doc.setFontSize(9);
    doc.text(today, pw - 14, 16, { align: "right" });

    let y = 44;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Panel seleccionado", 14, y); y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${panel.label} — Ancho útil: ${panel.usefulWidthCm} cm`, 14, y); y += 10;

    // Summary table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detalle por pared", 14, y); y += 8;

    const rows: string[][] = [["Pared", "Medida", "Paneles"]];
    wallResults.filter((w) => w.area > 0).forEach((w) => {
      rows.push([w.name, `${w.ancho}m × ${w.alto}m`, String(w.panelsNeeded)]);
    });
    rows.push(["TOTAL", `${totalArea.toFixed(2)} m²`, String(totalPanels)]);

    doc.setFontSize(10);
    rows.forEach((row, i) => {
      if (i === 0) {
        doc.setFillColor(0, 133, 119);
        doc.rect(12, y - 4, pw - 24, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else if (i === rows.length - 1) {
        doc.setFillColor(0, 133, 119);
        doc.rect(12, y - 4, pw - 24, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
        if (i % 2 === 0) {
          doc.setFillColor(240, 248, 246);
          doc.rect(12, y - 4, pw - 24, 7, "F");
        }
      }
      doc.text(row[0], 14, y);
      doc.text(row[1], pw / 2, y, { align: "center" });
      doc.text(row[2], pw - 14, y, { align: "right" });
      y += 7;
    });

    // ─── Wall Diagrams ─────────────────────────────────────────
    const usefulWidthM = panel.usefulWidthCm / 100;
    const panelH = panel.heightM;

    wallResults.filter((w) => w.area > 0).forEach((w) => {
      const maxDiagH = 80;
      if (y + maxDiagH + 25 > ph - 20) { doc.addPage(); y = 20; }

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(`${w.name} (${w.ancho}m × ${w.alto}m) — ${w.panelsNeeded} paneles`, 14, y);
      y += 6;

      const maxW = pw - 28;
      const maxH = 70;
      const scale = Math.min(maxW / w.ancho, maxH / w.alto);
      const dw = w.ancho * scale;
      const dh = w.alto * scale;
      const ox = 14 + (maxW - dw) / 2;
      const oy = y;

      // Wall background
      doc.setFillColor(235, 235, 230);
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.4);
      doc.rect(ox, oy, dw, dh, "FD");

      // Draw panels
      const gap = 0.4;
      let col = 0;
      let px = 0;
      while (px < w.ancho - 0.001) {
        const thisW = Math.min(usefulWidthM, w.ancho - px);
        let row = 0;
        let py = 0;
        while (py < w.alto - 0.001) {
          const thisH = Math.min(panelH, w.alto - py);
          const shade = (col + row) % 2 === 0;
          doc.setFillColor(shade ? 190 : 170, shade ? 160 : 140, shade ? 120 : 100);
          doc.setDrawColor(60, 50, 40);
          doc.setLineWidth(0.15);
          doc.rect(
            ox + px * scale + gap / 2,
            oy + py * scale + gap / 2,
            thisW * scale - gap,
            thisH * scale - gap,
            "FD"
          );
          py += panelH;
          row++;
        }
        px += usefulWidthM;
        col++;
      }

      // Outline
      doc.setDrawColor(0, 133, 119);
      doc.setLineWidth(0.6);
      doc.rect(ox, oy, dw, dh, "S");

      // Labels
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      doc.text(`${w.ancho} m`, ox + dw / 2, oy - 2, { align: "center" });
      doc.text(`${w.alto} m`, ox - 4, oy + dh / 2, { align: "center", angle: 90 });

      y = oy + dh + 8;
    });

    // Footer
    y += 8;
    if (y > ph - 15) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por Floortek — Cotizador de Revestimientos | tiendapisos.com", 14, y);

    doc.save(`Revestimientos_${panel.id}_${totalPanels}paneles.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              REVESTIMIENTOS
            </h1>
            <p className="text-xs text-primary-foreground/70">Calculadora de Paneles</p>
          </div>
          {hasData && (
            <Button size="sm" variant="secondary" onClick={handleExportPDF} className="gap-1.5">
              <Download className="w-4 h-4" />
              PDF
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Panel selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallpaper className="w-4 h-4 text-primary" />
              Tipo de Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={panelId} onValueChange={setPanelId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PANELS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} (útil {p.usefulWidthCm}cm)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="bg-muted/50 rounded-lg px-3 py-2.5 text-xs text-muted-foreground space-y-0.5">
              <p className="font-medium text-foreground text-sm">{panel.label}</p>
              <p>Ancho útil: {panel.usefulWidthCm} cm — Alto: {panel.heightM} m</p>
            </div>
          </CardContent>
        </Card>

        {/* Walls input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Medidas de Paredes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {walls.map((w) => (
              <div key={w.id} className="flex items-end gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Ancho (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={w.ancho}
                      onChange={(e) => updateWall(w.id, "ancho", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Alto (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={w.alto}
                      onChange={(e) => updateWall(w.id, "alto", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {walls.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeWall(w.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addWall} className="gap-1 text-xs w-full">
              <Plus className="w-3.5 h-3.5" />
              Agregar Pared
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {hasData && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 mb-4">
                {wallResults
                  .filter((w) => w.area > 0)
                  .map((w) => (
                    <div key={w.id} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground">
                        {w.name}: {w.ancho}m × {w.alto}m
                      </span>
                      <span className="font-medium">{w.panelsNeeded} paneles</span>
                    </div>
                  ))}
              </div>

              <div className="bg-accent/50 rounded-lg p-4 space-y-2.5">
                <div className="text-center pb-2 border-b border-border/50">
                  <p className="text-3xl font-bold text-foreground">{totalPanels} paneles</p>
                  <p className="text-sm text-muted-foreground">{totalArea.toFixed(2)} m² de superficie</p>
                </div>
              </div>

              <Button className="w-full gap-2 mt-4" onClick={handleExportPDF}>
                <Download className="w-4 h-4" />
                Descargar PDF con Esquema
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        Floortek — tiendapisos.com
      </footer>
    </div>
  );
};

export default RevestimientosCalculator;
