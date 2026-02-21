import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Plus, Trash2, Calculator, LayoutGrid, Sparkles } from "lucide-react";

interface Wall {
  id: number;
  name: string;
  ancho: string;
  alto: string;
}

type PlateSize = "small" | "large";
type LayoutMode = "optimized" | "aesthetic";

const PLATES = {
  small: { w: 0.61, h: 1.22, label: "61 cm × 1.22 m", adhesivePer: 0.5 },
  large: { w: 1.22, h: 2.44, label: "1.22 m × 2.44 m", adhesivePer: 2 },
};

interface PlacedPlate {
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  partial: boolean;
}

function layoutWall(
  wallW: number,
  wallH: number,
  plate: { w: number; h: number },
  mode: LayoutMode
): PlacedPlate[] {
  const placed: PlacedPlate[] = [];

  if (mode === "aesthetic") {
    // Plates always vertical (h > w), stacked in rows, like brickwork
    const pw = plate.w;
    const ph = plate.h;
    let y = 0;
    let row = 0;
    while (y < wallH) {
      const remainH = wallH - y;
      const effectiveH = Math.min(ph, remainH);
      const offset = row % 2 === 1 ? pw / 2 : 0;
      let x = -offset;
      if (x < 0) {
        // partial plate at start
        placed.push({ x: 0, y, w: pw + x < 0 ? 0 : pw + x, h: effectiveH, rotated: false, partial: true });
        x += pw;
      }
      while (x < wallW) {
        const remainW = wallW - x;
        const effectiveW = Math.min(pw, remainW);
        placed.push({
          x,
          y,
          w: effectiveW,
          h: effectiveH,
          rotated: false,
          partial: effectiveW < pw - 0.001 || effectiveH < ph - 0.001,
        });
        x += pw;
      }
      y += ph;
      row++;
    }
  } else {
    // Optimized: try both orientations, pick the one that uses fewer plates
    const layouts: PlacedPlate[][] = [];

    for (const rotated of [false, true]) {
      const pw = rotated ? plate.h : plate.w;
      const ph = rotated ? plate.w : plate.h;
      const current: PlacedPlate[] = [];
      let y = 0;
      while (y < wallH) {
        const remainH = wallH - y;
        const effectiveH = Math.min(ph, remainH);
        let x = 0;
        while (x < wallW) {
          const remainW = wallW - x;
          const effectiveW = Math.min(pw, remainW);
          current.push({
            x,
            y,
            w: effectiveW,
            h: effectiveH,
            rotated,
            partial: effectiveW < pw - 0.001 || effectiveH < ph - 0.001,
          });
          x += pw;
        }
        y += ph;
      }
      layouts.push(current);
    }

    const best = layouts.reduce((a, b) => (a.length <= b.length ? a : b));
    placed.push(...best);
  }

  return placed;
}

const PedraflexCalculator = () => {
  const navigate = useNavigate();
  const [walls, setWalls] = useState<Wall[]>([
    { id: 1, name: "Pared 1", ancho: "", alto: "" },
  ]);
  const [plateSize, setPlateSize] = useState<PlateSize>("small");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("optimized");
  const [nextId, setNextId] = useState(2);

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

  const wallData = walls.map((w) => {
    const ancho = parseFloat(w.ancho) || 0;
    const alto = parseFloat(w.alto) || 0;
    const area = ancho * alto;
    const platesNeeded = area > 0 ? Math.ceil(area / plateArea) : 0;
    const layout =
      ancho > 0 && alto > 0
        ? layoutWall(ancho, alto, plate, layoutMode)
        : [];
    return { ...w, anchoN: ancho, altoN: alto, area, platesNeeded, layout };
  });

  const totalArea = wallData.reduce((s, w) => s + w.area, 0);
  const totalPlates = wallData.reduce((s, w) => s + w.platesNeeded, 0);
  const totalAdhesive = Math.ceil(totalPlates * plate.adhesivePer);

  const hasData = wallData.some((w) => w.area > 0);

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
          <div>
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

        {/* Layout mode */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Modo de Colocación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={layoutMode}
              onValueChange={(v) => setLayoutMode(v as LayoutMode)}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="mode-optimized"
                className={`flex items-center gap-2 border rounded-lg px-3 py-3 cursor-pointer transition-colors ${
                  layoutMode === "optimized"
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <RadioGroupItem value="optimized" id="mode-optimized" />
                <div>
                  <span className="text-sm font-medium">Optimizado</span>
                  <p className="text-xs text-muted-foreground">
                    Menos desperdicio
                  </p>
                </div>
              </Label>
              <Label
                htmlFor="mode-aesthetic"
                className={`flex items-center gap-2 border rounded-lg px-3 py-3 cursor-pointer transition-colors ${
                  layoutMode === "aesthetic"
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <RadioGroupItem value="aesthetic" id="mode-aesthetic" />
                <div>
                  <span className="text-sm font-medium">Estético</span>
                  <p className="text-xs text-muted-foreground">
                    Trabado tipo ladrillo
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Walls */}
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
                    {wallData[i].platesNeeded} placas
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

        {/* Wall schemes */}
        {wallData
          .filter((w) => w.area > 0)
          .map((w) => (
            <Card key={w.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Esquema — {w.name} ({w.anchoN}m × {w.altoN}m)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WallScheme
                  wallW={w.anchoN}
                  wallH={w.altoN}
                  plates={w.layout}
                />
              </CardContent>
            </Card>
          ))}
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
      style={{ maxHeight: 320 }}
    >
      {/* wall outline */}
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
