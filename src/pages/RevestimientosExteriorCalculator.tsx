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
import { ArrowLeft, Plus, X, Wallpaper, Calculator, Download, RotateCcw } from "lucide-react";
import jsPDF from "jspdf";

// ─── Panel Catalog (Exterior) ────────────────────────────────────
interface Panel {
  id: string;
  label: string;
  widthCm: number;
  heightM: number;
  usefulWidthCm: number;
}

const PANELS: Panel[] = [
  { id: "21.9x290", label: "Panel 21.9cm × 2.90m", widthCm: 21.9, heightM: 2.90, usefulWidthCm: 20.5 },
  { id: "14.8x290", label: "Panel 14.8cm × 2.90m", widthCm: 14.8, heightM: 2.90, usefulWidthCm: 13.8 },
];

const OMEGA_SPACING_M = 0.35; // Perfil omega cada 35 cm

// ─── Types ───────────────────────────────────────────────────────
type Orientation = "vertical" | "horizontal";

interface Wall {
  id: number;
  name: string;
  ancho: string;
  alto: string;
}

// ─── Calculation Logic ───────────────────────────────────────────
function calcWall(wallWidth: number, wallHeight: number, panel: Panel, orientation: Orientation) {
  if (wallWidth <= 0 || wallHeight <= 0)
    return { panelsAcross: 0, panelsNeeded: 0, omegaML: 0, omegaCount: 0 };

  const usefulW = panel.usefulWidthCm / 100;
  const panelLen = panel.heightM; // largo del panel (2.90m)

  let panelsAcross: number;
  let panelsNeeded: number;
  let omegaCount: number;
  let omegaLength: number;

  if (orientation === "vertical") {
    // Paneles van en vertical: el ancho útil cubre horizontalmente, el largo cubre verticalmente
    panelsAcross = Math.ceil(wallWidth / usefulW);

    if (wallHeight <= panelLen) {
      const piecesPerPanel = Math.floor(panelLen / wallHeight);
      panelsNeeded = Math.ceil(panelsAcross / piecesPerPanel);
    } else {
      const fullSections = Math.floor(wallHeight / panelLen);
      const remainder = wallHeight - fullSections * panelLen;
      const fullPanels = panelsAcross * fullSections;
      if (remainder <= 0.001) {
        panelsNeeded = fullPanels;
      } else {
        const piecesPerPanel = Math.floor(panelLen / remainder);
        const remainderPanels = Math.ceil(panelsAcross / piecesPerPanel);
        panelsNeeded = fullPanels + remainderPanels;
      }
    }

    // Omega profiles van horizontal (opuesto a vertical), separados cada 35cm en el alto
    omegaCount = Math.ceil(wallHeight / OMEGA_SPACING_M) + 1;
    omegaLength = wallWidth; // cada perfil cubre el ancho
  } else {
    // Paneles van en horizontal: el ancho útil cubre verticalmente, el largo cubre horizontalmente
    panelsAcross = Math.ceil(wallHeight / usefulW);

    if (wallWidth <= panelLen) {
      const piecesPerPanel = Math.floor(panelLen / wallWidth);
      panelsNeeded = Math.ceil(panelsAcross / piecesPerPanel);
    } else {
      const fullSections = Math.floor(wallWidth / panelLen);
      const remainder = wallWidth - fullSections * panelLen;
      const fullPanels = panelsAcross * fullSections;
      if (remainder <= 0.001) {
        panelsNeeded = fullPanels;
      } else {
        const piecesPerPanel = Math.floor(panelLen / remainder);
        const remainderPanels = Math.ceil(panelsAcross / piecesPerPanel);
        panelsNeeded = fullPanels + remainderPanels;
      }
    }

    // Omega profiles van vertical (opuesto a horizontal), separados cada 35cm en el ancho
    omegaCount = Math.ceil(wallWidth / OMEGA_SPACING_M) + 1;
    omegaLength = wallHeight; // cada perfil cubre el alto
  }

  const omegaML = omegaCount * omegaLength;

  return { panelsAcross, panelsNeeded, omegaCount, omegaML };
}

// ─── Main Component ──────────────────────────────────────────────
const RevestimientosExteriorCalculator = () => {
  const navigate = useNavigate();

  const [panelId, setPanelId] = useState(PANELS[0].id);
  const panel = PANELS.find((p) => p.id === panelId) ?? PANELS[0];

  const [orientation, setOrientation] = useState<Orientation>("vertical");
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
      const result = calcWall(ancho, alto, panel, orientation);
      return { ...w, ancho, alto, area: ancho * alto, ...result };
    });
  }, [walls, panel, orientation]);

  const totalPanels = wallResults.reduce((s, w) => s + w.panelsNeeded, 0);
  const totalArea = wallResults.reduce((s, w) => s + w.area, 0);
  const totalOmegaML = wallResults.reduce((s, w) => s + w.omegaML, 0);
  const hasData = totalArea > 0;

  // ─── PDF Export ────────────────────────────────────────────────
  const handleExportPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(0, 100, 80);
    doc.rect(0, 0, pw, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("REVESTIMIENTOS EXTERIOR", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Esquema de Materiales y Estructura", 14, 24);
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
    doc.text(`${panel.label} — Útil: ${panel.usefulWidthCm} cm — Colocación: ${orientation === "vertical" ? "Vertical" : "Horizontal"}`, 14, y); y += 10;

    // Summary table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detalle por pared", 14, y); y += 8;

    const rows: string[][] = [["Pared", "Medida", "Paneles", "Omega (ml)"]];
    wallResults.filter((w) => w.area > 0).forEach((w) => {
      rows.push([w.name, `${w.ancho}m × ${w.alto}m`, String(w.panelsNeeded), w.omegaML.toFixed(2)]);
    });
    rows.push(["TOTAL", `${totalArea.toFixed(2)} m²`, String(totalPanels), totalOmegaML.toFixed(2)]);

    doc.setFontSize(10);
    const colX = [14, 60, 120, pw - 14];
    rows.forEach((row, i) => {
      const isHeader = i === 0;
      const isFooter = i === rows.length - 1;
      if (isHeader || isFooter) {
        doc.setFillColor(0, 100, 80);
        doc.rect(12, y - 4, pw - 24, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
        if (i % 2 === 0) {
          doc.setFillColor(235, 245, 240);
          doc.rect(12, y - 4, pw - 24, 7, "F");
        }
      }
      doc.text(row[0], colX[0], y);
      doc.text(row[1], colX[1], y);
      doc.text(row[2], colX[2], y);
      doc.text(row[3], colX[3], y, { align: "right" });
      y += 7;
    });

    // ─── Wall Diagrams ─────────────────────────────────────────
    const usefulW = panel.usefulWidthCm / 100;
    const panelLen = panel.heightM;

    wallResults.filter((w) => w.area > 0).forEach((w) => {
      // ── Schema 1: Omega Profile Structure ────────────────────
      const maxDiagH = 60;
      if (y + maxDiagH + 35 > ph - 20) { doc.addPage(); y = 20; }

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(`${w.name} — Estructura (Perfil Omega)`, 14, y);
      y += 6;

      const maxW = pw - 28;
      const maxH = 55;
      const scale = Math.min(maxW / w.ancho, maxH / w.alto);
      const dw = w.ancho * scale;
      const dh = w.alto * scale;
      const ox = 14 + (maxW - dw) / 2;
      const oy = y;

      // Wall background
      doc.setFillColor(240, 240, 235);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.4);
      doc.rect(ox, oy, dw, dh, "FD");

      // Draw omega profiles
      doc.setDrawColor(80, 80, 200);
      doc.setLineWidth(0.6);

      if (orientation === "vertical") {
        // Panels vertical → omega horizontal
        let py = 0;
        let count = 0;
        while (py <= w.alto + 0.001) {
          const yy = oy + Math.min(py, w.alto) * scale;
          doc.line(ox, yy, ox + dw, yy);
          count++;
          py += OMEGA_SPACING_M;
        }
        // Label
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 200);
        doc.text(`${w.omegaCount} perfiles Ω horizontales c/35cm`, ox + dw / 2, oy + dh + 5, { align: "center" });
      } else {
        // Panels horizontal → omega vertical
        let px = 0;
        while (px <= w.ancho + 0.001) {
          const xx = ox + Math.min(px, w.ancho) * scale;
          doc.line(xx, oy, xx, oy + dh);
          px += OMEGA_SPACING_M;
        }
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 200);
        doc.text(`${w.omegaCount} perfiles Ω verticales c/35cm`, ox + dw / 2, oy + dh + 5, { align: "center" });
      }

      // Outline
      doc.setDrawColor(0, 100, 80);
      doc.setLineWidth(0.6);
      doc.rect(ox, oy, dw, dh, "S");

      // Dimension labels
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      doc.text(`${w.ancho} m`, ox + dw / 2, oy - 2, { align: "center" });
      doc.text(`${w.alto} m`, ox - 4, oy + dh / 2, { align: "center", angle: 90 });

      y = oy + dh + 10;

      // ── Schema 2: Panel Layout ───────────────────────────────
      if (y + maxDiagH + 25 > ph - 20) { doc.addPage(); y = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(`${w.name} — Revestimiento (${orientation === "vertical" ? "Vertical" : "Horizontal"}) — ${w.panelsNeeded} paneles`, 14, y);
      y += 6;

      const oy2 = y;
      // Wall background
      doc.setFillColor(240, 240, 235);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.4);
      doc.rect(ox, oy2, dw, dh, "FD");

      const gap = 0.3;

      if (orientation === "vertical") {
        // Panels as vertical strips
        let col = 0;
        let px = 0;
        while (px < w.ancho - 0.001) {
          const thisW = Math.min(usefulW, w.ancho - px);
          let row = 0;
          let py = 0;
          while (py < w.alto - 0.001) {
            const thisH = Math.min(panelLen, w.alto - py);
            const shade = (col + row) % 2 === 0;
            doc.setFillColor(shade ? 160 : 140, shade ? 120 : 100, shade ? 80 : 65);
            doc.setDrawColor(60, 50, 40);
            doc.setLineWidth(0.15);
            doc.rect(
              ox + px * scale + gap / 2, oy2 + py * scale + gap / 2,
              thisW * scale - gap, thisH * scale - gap, "FD"
            );
            py += panelLen;
            row++;
          }
          px += usefulW;
          col++;
        }
      } else {
        // Panels as horizontal strips
        let row = 0;
        let py = 0;
        while (py < w.alto - 0.001) {
          const thisH = Math.min(usefulW, w.alto - py);
          let col = 0;
          let px = 0;
          while (px < w.ancho - 0.001) {
            const thisW = Math.min(panelLen, w.ancho - px);
            const shade = (col + row) % 2 === 0;
            doc.setFillColor(shade ? 160 : 140, shade ? 120 : 100, shade ? 80 : 65);
            doc.setDrawColor(60, 50, 40);
            doc.setLineWidth(0.15);
            doc.rect(
              ox + px * scale + gap / 2, oy2 + py * scale + gap / 2,
              thisW * scale - gap, thisH * scale - gap, "FD"
            );
            px += panelLen;
            col++;
          }
          py += usefulW;
          row++;
        }
      }

      // Outline
      doc.setDrawColor(0, 100, 80);
      doc.setLineWidth(0.6);
      doc.rect(ox, oy2, dw, dh, "S");

      // Dimension labels
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(`${w.ancho} m`, ox + dw / 2, oy2 - 2, { align: "center" });
      doc.text(`${w.alto} m`, ox - 4, oy2 + dh / 2, { align: "center", angle: 90 });

      y = oy2 + dh + 8;
    });

    // Footer
    y += 8;
    if (y > ph - 15) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por Floortek — Cotizador de Revestimientos Exterior | tiendapisos.com", 14, y);

    doc.save(`Revestimientos_Ext_${panel.id}_${totalPanels}paneles.pdf`);
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
              REVESTIMIENTOS EXTERIOR
            </h1>
            <p className="text-xs text-primary-foreground/70">Calculadora de Paneles + Perfil Omega</p>
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
              <p>Ancho útil: {panel.usefulWidthCm} cm — Largo: {panel.heightM} m</p>
            </div>
          </CardContent>
        </Card>

        {/* Orientation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" />
              Sentido de Colocación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={orientation === "vertical" ? "default" : "outline"}
                className="w-full"
                onClick={() => setOrientation("vertical")}
              >
                ↕ Vertical
              </Button>
              <Button
                variant={orientation === "horizontal" ? "default" : "outline"}
                className="w-full"
                onClick={() => setOrientation("horizontal")}
              >
                ↔ Horizontal
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Perfil Omega se coloca en sentido {orientation === "vertical" ? "horizontal" : "vertical"} cada 35 cm
            </p>
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
                      <span className="font-medium">{w.panelsNeeded} paneles · {w.omegaML.toFixed(2)} ml Ω</span>
                    </div>
                  ))}
              </div>

              <div className="bg-accent/50 rounded-lg p-4 space-y-2.5">
                <div className="text-center pb-2 border-b border-border/50">
                  <p className="text-3xl font-bold text-foreground">{totalPanels} paneles</p>
                  <p className="text-sm text-muted-foreground">{totalArea.toFixed(2)} m² de superficie</p>
                </div>
                <div className="text-center pt-1">
                  <p className="text-xl font-bold text-foreground">{totalOmegaML.toFixed(2)} ml</p>
                  <p className="text-sm text-muted-foreground">Perfil Omega</p>
                </div>
              </div>

              <Button className="w-full gap-2 mt-4" onClick={handleExportPDF}>
                <Download className="w-4 h-4" />
                Descargar PDF con Esquemas
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

export default RevestimientosExteriorCalculator;
