import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, Calculator, LayoutGrid, Sparkles, Download } from "lucide-react";
import jsPDF from "jspdf";

interface Wall {
  id: number;
  name: string;
  ancho: string;
  alto: string;
}

type PlateSize = "small" | "large";
type LayoutMode = "stacked" | "stacked-rotated" | "brick" | "brick-rotated";
type Approach = "optimized" | "aesthetic";

const LAYOUT_OPTIONS: { value: LayoutMode; label: string; desc: string }[] = [
  { value: "stacked", label: "Apilado vertical", desc: "Placas alineadas una arriba de otra" },
  { value: "stacked-rotated", label: "Apilado horizontal", desc: "Placas rotadas, alineadas" },
  { value: "brick", label: "Trabado vertical", desc: "Desfase ½ placa, orientación vertical" },
  { value: "brick-rotated", label: "Trabado horizontal", desc: "Desfase ½ placa, orientación horizontal" },
];

const APPROACH_OPTIONS: { value: Approach; label: string; desc: string }[] = [
  { value: "optimized", label: "Optimizado", desc: "Menos placas, arranque desde esquina" },
  { value: "aesthetic", label: "Estético", desc: "Centrado simétrico, cortes iguales en bordes" },
];

const PLATES = {
  small: { w: 0.61, h: 1.22, label: "61 cm × 1.22 m", adhesivePer: 0.5 },
  large: { w: 1.22, h: 2.44, label: "1.22 m × 2.44 m", adhesivePer: 2 },
};

interface PlacedPlate {
  x: number;
  y: number;
  w: number;
  h: number;
  partial: boolean;
}

function layoutWall(
  wallW: number,
  wallH: number,
  plate: { w: number; h: number },
  mode: LayoutMode,
  approach: Approach
): PlacedPlate[] {
  const placed: PlacedPlate[] = [];
  const rotated = mode === "stacked-rotated" || mode === "brick-rotated";
  const brick = mode === "brick" || mode === "brick-rotated";
  const pw = rotated ? plate.h : plate.w;
  const ph = rotated ? plate.w : plate.h;

  // Aesthetic: center plates so edge cuts are symmetric
  const colsNeeded = Math.ceil(wallW / pw);
  const rowsNeeded = Math.ceil(wallH / ph);
  const totalPlateW = colsNeeded * pw;
  const totalPlateH = rowsNeeded * ph;
  const offsetX = approach === "aesthetic" ? (totalPlateW - wallW) / 2 : 0;
  const offsetY = approach === "aesthetic" ? (totalPlateH - wallH) / 2 : 0;

  let y = -offsetY;
  let row = 0;
  while (y < wallH - 0.001) {
    const brickOffset = brick && row % 2 === 1 ? pw / 2 : 0;
    let x = -offsetX - brickOffset;

    while (x < wallW - 0.001) {
      // Clip to wall bounds
      const x1 = Math.max(0, x);
      const y1 = Math.max(0, y);
      const x2 = Math.min(wallW, x + pw);
      const y2 = Math.min(wallH, y + ph);
      const cw = x2 - x1;
      const ch = y2 - y1;

      if (cw > 0.001 && ch > 0.001) {
        placed.push({
          x: x1,
          y: y1,
          w: cw,
          h: ch,
          partial: cw < pw - 0.001 || ch < ph - 0.001,
        });
      }
      x += pw;
    }
    y += ph;
    row++;
  }

  return placed;
}

interface LayoutVariant {
  mode: LayoutMode;
  approach: Approach;
  plates: PlacedPlate[];
  plateCount: number;
}

interface WallCalcData extends Wall {
  anchoN: number;
  altoN: number;
  area: number;
  layouts: LayoutVariant[];
}

const PedraflexCalculator = () => {
  const navigate = useNavigate();
  const [walls, setWalls] = useState<Wall[]>([
    { id: 1, name: "Pared 1", ancho: "", alto: "" },
  ]);
  const [plateSize, setPlateSize] = useState<PlateSize>("small");
  const [selectedModes, setSelectedModes] = useState<LayoutMode[]>(["stacked"]);
  const [selectedApproaches, setSelectedApproaches] = useState<Approach[]>(["optimized"]);
  const [nextId, setNextId] = useState(2);

  const toggleMode = (mode: LayoutMode) => {
    setSelectedModes((prev) => {
      if (prev.includes(mode)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((m) => m !== mode);
      }
      return [...prev, mode];
    });
  };

  const selectAll = () => {
    const allModes: LayoutMode[] = LAYOUT_OPTIONS.map((o) => o.value);
    setSelectedModes((prev) => (prev.length === allModes.length ? [allModes[0]] : allModes));
  };

  const toggleApproach = (approach: Approach) => {
    setSelectedApproaches((prev) => {
      if (prev.includes(approach)) {
        if (prev.length === 1) return prev;
        return prev.filter((a) => a !== approach);
      }
      return [...prev, approach];
    });
  };

  const addWall = () => {
    setWalls((prev) => [
      ...prev,
      { id: nextId, name: `Pared ${nextId}`, ancho: "", alto: "" },
    ]);
    setNextId((n) => n + 1);
  };

  const removeWall = (id: number) => {
    if (walls.length <= 1) return;
    setWalls((prev) => prev.filter((w) => w.id !== id));
  };

  const updateWall = (id: number, field: "ancho" | "alto", value: string) => {
    setWalls((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
  };

  const plate = PLATES[plateSize];
  const plateArea = plate.w * plate.h;

  const wallData: WallCalcData[] = walls.map((w) => {
    const ancho = parseFloat(w.ancho) || 0;
    const alto = parseFloat(w.alto) || 0;
    const area = ancho * alto;
    const layouts: LayoutVariant[] = [];
    if (ancho > 0 && alto > 0) {
      for (const mode of selectedModes) {
        for (const approach of selectedApproaches) {
          const plates = layoutWall(ancho, alto, plate, mode, approach);
          layouts.push({ mode, approach, plates, plateCount: plates.length });
        }
      }
    }
    return { ...w, anchoN: ancho, altoN: alto, area, layouts };
  });

  // Use the first layout variant's plate count for summary (optimized if available)
  const getWallPlates = (w: WallCalcData) => {
    if (w.layouts.length === 0) return 0;
    const opt = w.layouts.find((l) => l.approach === "optimized");
    return opt ? opt.plateCount : w.layouts[0].plateCount;
  };

  const totalArea = wallData.reduce((s, w) => s + w.area, 0);
  const totalPlates = wallData.reduce((s, w) => s + getWallPlates(w), 0);
  const totalAdhesive = Math.ceil(totalPlates * plate.adhesivePer);
  const hasData = wallData.some((w) => w.area > 0);

  const getModeLabel = (mode: LayoutMode) =>
    LAYOUT_OPTIONS.find((o) => o.value === mode)?.label ?? mode;
  const getApproachLabel = (approach: Approach) =>
    APPROACH_OPTIONS.find((o) => o.value === approach)?.label ?? approach;

  const handleExportPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(0, 133, 119);
    doc.rect(0, 0, pageW, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PEDRAFLEX", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Calculadora de Placas", 14, 24);
    const today = new Date().toLocaleDateString("es-AR");
    doc.setFontSize(9);
    doc.text(today, pageW - 14, 16, { align: "right" });

    let y = 44;

    // Config
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Configuración", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Placa: ${plate.label}`, 14, y);
    y += 6;
    doc.text(`Modos: ${selectedModes.map(getModeLabel).join(", ")}`, 14, y);
    y += 6;
    doc.text(`Criterio: ${selectedApproaches.map(getApproachLabel).join(", ")}`, 14, y);
    y += 10;

    // Summary table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resumen", 14, y);
    y += 8;
    doc.setFontSize(10);

    const rows = [
      ["Concepto", "Cantidad"],
      ["Superficie total (m²)", totalArea.toFixed(2)],
      ["Placas necesarias", String(totalPlates)],
      ["Cartuchos de adhesivo", String(totalAdhesive)],
    ];

    rows.forEach((row, i) => {
      if (i === 0) {
        doc.setFillColor(0, 133, 119);
        doc.rect(12, y - 4, pageW - 24, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
        if (i % 2 === 0) {
          doc.setFillColor(240, 248, 246);
          doc.rect(12, y - 4, pageW - 24, 7, "F");
        }
      }
      doc.text(row[0], 14, y);
      doc.text(row[1], pageW - 14, y, { align: "right" });
      y += 7;
    });

    y += 6;

    // Wall details
    wallData
      .filter((w) => w.area > 0)
      .forEach((w) => {
        if (y + 20 > pageH - 20) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(`${w.name} — ${w.anchoN}m × ${w.altoN}m (${w.area.toFixed(2)} m²)`, 14, y);
        y += 8;

        // Draw each layout mode
        w.layouts.forEach((layout) => {
          const maxDiagW = pageW - 28;
          const maxDiagH = 70;
          const scale = Math.min(maxDiagW / w.anchoN, maxDiagH / w.altoN);
          const dw = w.anchoN * scale;
          const dh = w.altoN * scale;

          if (y + dh + 18 > pageH - 20) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80, 80, 80);
          doc.text(`${getModeLabel(layout.mode)} — ${getApproachLabel(layout.approach)} (${layout.plateCount} placas)`, 14, y);
          y += 4;

          const ox = 14 + (maxDiagW - dw) / 2;
          const oy = y;

          // Wall outline
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.3);
          doc.rect(ox, oy, dw, dh, "S");

          // Plates
          const colors = [
            [200, 230, 225],
            [180, 215, 210],
            [210, 225, 235],
            [195, 230, 220],
          ];

          layout.plates.forEach((p, pi) => {
            const rx = ox + p.x * scale;
            const ry = oy + p.y * scale;
            const rw = Math.min(p.w * scale, dw - p.x * scale);
            const rh = Math.min(p.h * scale, dh - p.y * scale);
            if (rw <= 0 || rh <= 0) return;
            const c = p.partial ? [230, 230, 230] : colors[pi % colors.length];
            doc.setFillColor(c[0], c[1], c[2]);
            doc.setDrawColor(120, 120, 120);
            doc.setLineWidth(0.15);
            doc.rect(rx, ry, rw, rh, "FD");
          });

          // Dims
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          doc.text(`${w.anchoN}m`, ox + dw / 2, oy - 1.5, { align: "center" });
          doc.text(`${w.altoN}m`, ox - 3, oy + dh / 2, { align: "center", angle: 90 });

          y = oy + dh + 6;
        });

        y += 4;
      });

    // Footer
    if (y + 10 > pageH - 10) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por Floortek — Calculadora Pedraflex | tiendapisos.com", 14, y);

    doc.save(`Pedraflex_${totalArea.toFixed(0)}m2.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              PEDRAFLEX
            </h1>
            <p className="text-xs text-primary-foreground/70">
              Calculadora de Placas
            </p>
          </div>
          {hasData && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportPDF}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              PDF
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Plate size selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" />
              Medida de Placa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={plateSize}
              onValueChange={(v) => setPlateSize(v as PlateSize)}
              className="grid grid-cols-2 gap-3"
            >
              {(["small", "large"] as const).map((s) => (
                <Label
                  key={s}
                  htmlFor={`plate-${s}`}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-3 cursor-pointer transition-colors ${
                    plateSize === s
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <RadioGroupItem value={s} id={`plate-${s}`} />
                  <span className="text-sm font-medium">{PLATES[s].label}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Layout modes - multi select */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Modos de Colocación
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={selectAll} className="text-xs h-7">
              {selectedModes.length === LAYOUT_OPTIONS.length ? "Deseleccionar" : "Seleccionar todos"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {LAYOUT_OPTIONS.map((opt) => {
                const checked = selectedModes.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2.5 border rounded-lg px-3 py-3 cursor-pointer transition-colors ${
                      checked
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleMode(opt.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium">{opt.label}</span>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Approach selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Criterio de Colocación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {APPROACH_OPTIONS.map((opt) => {
                const checked = selectedApproaches.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2.5 border rounded-lg px-3 py-3 cursor-pointer transition-colors ${
                      checked
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleApproach(opt.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium">{opt.label}</span>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Paredes</CardTitle>
            <Button size="sm" variant="outline" onClick={addWall}>
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {walls.map((w, i) => (
              <div
                key={w.id}
                className="border rounded-lg p-3 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {w.name}
                  </span>
                  {walls.length > 1 && (
                    <button
                      onClick={() => removeWall(w.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Ancho (m)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="ej: 3.5"
                      value={w.ancho}
                      onChange={(e) => updateWall(w.id, "ancho", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Alto (m)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="ej: 2.6"
                      value={w.alto}
                      onChange={(e) => updateWall(w.id, "alto", e.target.value)}
                    />
                  </div>
                </div>
                {wallData[i].area > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Superficie: {wallData[i].area.toFixed(2)} m² —{" "}
                    {getWallPlates(wallData[i])} placas
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Results */}
        {hasData && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-accent rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">
                    {totalArea.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">m² totales</p>
                </div>
                <div className="bg-accent rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">
                    {totalPlates}
                  </p>
                  <p className="text-xs text-muted-foreground">placas</p>
                </div>
                <div className="bg-accent rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">
                    {totalAdhesive}
                  </p>
                  <p className="text-xs text-muted-foreground">adhesivos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wall schemes per mode */}
        {wallData
          .filter((w) => w.area > 0)
          .map((w) => (
            <Card key={w.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {w.name} ({w.anchoN}m × {w.altoN}m)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {w.layouts.map((layout) => (
                  <div key={`${layout.mode}-${layout.approach}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {getModeLabel(layout.mode)} — {getApproachLabel(layout.approach)}
                      </p>
                      <span className="text-xs font-semibold text-primary">
                        {layout.plateCount} placas
                      </span>
                    </div>
                    <WallScheme
                      wallW={w.anchoN}
                      wallH={w.altoN}
                      plates={layout.plates}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

        {/* PDF download button at bottom too */}
        {hasData && (
          <Button onClick={handleExportPDF} className="w-full gap-2">
            <Download className="w-4 h-4" />
            Descargar PDF
          </Button>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        Floortek — tiendapisos.com
      </footer>
    </div>
  );
};

function WallScheme({
  wallW,
  wallH,
  plates,
}: {
  wallW: number;
  wallH: number;
  plates: PlacedPlate[];
}) {
  const maxSvgW = 600;
  const padding = 2;
  const scale = Math.min(maxSvgW / wallW, 300 / wallH);
  const svgW = wallW * scale + padding * 2;
  const svgH = wallH * scale + padding * 2;

  const colors = [
    "hsl(170, 60%, 85%)",
    "hsl(170, 40%, 75%)",
    "hsl(200, 30%, 82%)",
    "hsl(170, 50%, 90%)",
  ];

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full border rounded-lg bg-card"
      style={{ maxHeight: 280 }}
    >
      <rect
        x={padding}
        y={padding}
        width={wallW * scale}
        height={wallH * scale}
        fill="none"
        stroke="hsl(200, 10%, 70%)"
        strokeWidth={1}
      />
      {plates.map((p, i) => {
        const rx = padding + p.x * scale;
        const ry = padding + p.y * scale;
        const rw = Math.min(p.w * scale, wallW * scale - p.x * scale);
        const rh = Math.min(p.h * scale, wallH * scale - p.y * scale);
        if (rw <= 0 || rh <= 0) return null;
        return (
          <g key={i}>
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              fill={p.partial ? "hsl(0, 0%, 90%)" : colors[i % colors.length]}
              stroke="hsl(200, 10%, 50%)"
              strokeWidth={0.5}
              rx={1}
            />
            {rw > 25 && rh > 14 && (
              <text
                x={rx + rw / 2}
                y={ry + rh / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.min(10, rw / 4)}
                fill="hsl(200, 10%, 35%)"
              >
                {p.partial ? "corte" : `P${i + 1}`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default PedraflexCalculator;
