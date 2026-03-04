import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Leaf } from "lucide-react";

type ModuleSize = 0.5 | 1;
type Mode = "rectangular" | "plantilla" | "libre";

interface Template {
  id: string;
  name: string;
  description: string;
  generator: (cols: number, rows: number) => boolean[][];
}

/* ── Template generators ── */
const templates: Template[] = [
  {
    id: "onda",
    name: "Onda",
    description: "Forma ondulada orgánica",
    generator: (cols, rows) => {
      const g = Array.from({ length: rows }, () => Array(cols).fill(false));
      for (let c = 0; c < cols; c++) {
        const amplitude = Math.floor(rows * 0.3);
        const center = Math.floor(rows / 2);
        const offset = Math.round(amplitude * Math.sin((c / cols) * Math.PI * 2));
        const top = Math.max(0, center - Math.floor(rows * 0.2) + offset);
        const bot = Math.min(rows, center + Math.floor(rows * 0.2) + offset);
        for (let r = top; r < bot; r++) g[r][c] = true;
      }
      return g;
    },
  },
  {
    id: "arco",
    name: "Arco",
    description: "Forma de arco semicircular",
    generator: (cols, rows) => {
      const g = Array.from({ length: rows }, () => Array(cols).fill(false));
      const cx = (cols - 1) / 2;
      const cy = rows - 1;
      const rx = cols / 2;
      const ry = rows * 0.85;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const dx = (c - cx) / rx;
          const dy = (r - cy) / ry;
          if (dx * dx + dy * dy <= 1) g[r][c] = true;
        }
      return g;
    },
  },
  {
    id: "diamante",
    name: "Diamante",
    description: "Forma de rombo centrado",
    generator: (cols, rows) => {
      const g = Array.from({ length: rows }, () => Array(cols).fill(false));
      const cx = (cols - 1) / 2;
      const cy = (rows - 1) / 2;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const dx = Math.abs(c - cx) / (cols / 2);
          const dy = Math.abs(r - cy) / (rows / 2);
          if (dx + dy <= 1) g[r][c] = true;
        }
      return g;
    },
  },
  {
    id: "escalera",
    name: "Escalera",
    description: "Escalones descendentes",
    generator: (cols, rows) => {
      const g = Array.from({ length: rows }, () => Array(cols).fill(false));
      for (let c = 0; c < cols; c++) {
        const startRow = Math.floor((c / cols) * rows * 0.6);
        for (let r = startRow; r < rows; r++) g[r][c] = true;
      }
      return g;
    },
  },
  {
    id: "circulo",
    name: "Círculo",
    description: "Forma circular centrada",
    generator: (cols, rows) => {
      const g = Array.from({ length: rows }, () => Array(cols).fill(false));
      const cx = (cols - 1) / 2;
      const cy = (rows - 1) / 2;
      const r2 = Math.min(cols, rows) / 2;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const dist = Math.sqrt((c - cx) ** 2 + (r - cy) ** 2);
          if (dist <= r2) g[r][c] = true;
        }
      return g;
    },
  },
  {
    id: "corazon",
    name: "Corazón",
    description: "Forma de corazón",
    generator: (cols, rows) => {
      const g = Array.from({ length: rows }, () => Array(cols).fill(false));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const x = (c - (cols - 1) / 2) / (cols / 2);
          const y = -((r - (rows - 1) / 2) / (rows / 2)) + 0.2;
          const eq = (x * x + y * y - 1) ** 3 - x * x * y * y * y;
          if (eq <= 0) g[r][c] = true;
        }
      return g;
    },
  },
];

/* ── Component ── */
const JardinesVerticalesCalculator = () => {
  const navigate = useNavigate();
  const [moduleSize, setModuleSize] = useState<ModuleSize>(0.5);
  const [anchoM, setAnchoM] = useState(2);
  const [altoM, setAltoM] = useState(2);
  const [mode, setMode] = useState<Mode>("rectangular");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("onda");
  const [freeGrid, setFreeGrid] = useState<boolean[][] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(true);

  const cols = Math.max(1, Math.ceil(anchoM / moduleSize));
  const rows = Math.max(1, Math.ceil(altoM / moduleSize));

  /* grid for current mode */
  const grid = useMemo(() => {
    if (mode === "rectangular") {
      return Array.from({ length: rows }, () => Array(cols).fill(true));
    }
    if (mode === "plantilla") {
      const tpl = templates.find((t) => t.id === selectedTemplate);
      return tpl ? tpl.generator(cols, rows) : Array.from({ length: rows }, () => Array(cols).fill(true));
    }
    // libre
    if (freeGrid && freeGrid.length === rows && freeGrid[0]?.length === cols) return freeGrid;
    return Array.from({ length: rows }, () => Array(cols).fill(false));
  }, [mode, cols, rows, selectedTemplate, freeGrid]);

  const moduleCount = useMemo(() => grid.flat().filter(Boolean).length, [grid]);

  /* free-grid toggle */
  const toggleCell = useCallback(
    (r: number, c: number, forceValue?: boolean) => {
      const next = grid.map((row) => [...row]);
      next[r][c] = forceValue !== undefined ? forceValue : !next[r][c];
      setFreeGrid(next);
    },
    [grid]
  );

  const handleMouseDown = (r: number, c: number) => {
    if (mode !== "libre") return;
    const newValue = !grid[r][c];
    setIsDragging(true);
    setDragValue(newValue);
    toggleCell(r, c, newValue);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!isDragging || mode !== "libre") return;
    toggleCell(r, c, dragValue);
  };

  const handleMouseUp = () => setIsDragging(false);

  /* init free grid when switching to libre */
  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === "libre" && (!freeGrid || freeGrid.length !== rows || freeGrid[0]?.length !== cols)) {
      setFreeGrid(Array.from({ length: rows }, () => Array(cols).fill(false)));
    }
  };

  /* SVG rendering */
  const cellPx = Math.min(40, 360 / Math.max(cols, rows));
  const gap = 2;
  const svgW = cols * (cellPx + gap) - gap + 2;
  const svgH = rows * (cellPx + gap) - gap + 2;

  return (
    <div className="min-h-screen bg-background flex flex-col" onMouseUp={handleMouseUp}>
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Cotizador de Jardines Verticales</h1>
            <p className="text-xs text-primary-foreground/60">Módulos de 50 × 50 cm</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-5">
        {/* Dimensions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Dimensiones de la pared</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ancho (m)</Label>
              <Input type="number" min={0.5} step={0.5} value={anchoM} onChange={(e) => setAnchoM(Math.max(0.5, +e.target.value))} />
            </div>
            <div>
              <Label>Alto (m)</Label>
              <Input type="number" min={0.5} step={0.5} value={altoM} onChange={(e) => setAltoM(Math.max(0.5, +e.target.value))} />
            </div>
          </CardContent>
        </Card>

        {/* Mode selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Forma de diseño</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {([["rectangular", "Rectangular"], ["plantilla", "Plantillas artísticas"], ["libre", "Diseño libre"]] as [Mode, string][]).map(([m, label]) => (
                <Button key={m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => switchMode(m)}>
                  {label}
                </Button>
              ))}
            </div>

            {/* Template selector */}
            {mode === "plantilla" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      selectedTemplate === tpl.id
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="font-medium text-sm text-foreground">{tpl.name}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{tpl.description}</span>
                  </button>
                ))}
              </div>
            )}

            {mode === "libre" && (
              <p className="text-xs text-muted-foreground">Hacé click o arrastrá sobre la grilla para activar/desactivar módulos.</p>
            )}
          </CardContent>
        </Card>

        {/* Visual preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Leaf className="w-5 h-5 text-primary" />
              Vista previa — {moduleCount} módulos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="max-w-full select-none"
                style={{ maxHeight: 420 }}
              >
                {grid.map((row, r) =>
                  row.map((active, c) => (
                    <rect
                      key={`${r}-${c}`}
                      x={1 + c * (cellPx + gap)}
                      y={1 + r * (cellPx + gap)}
                      width={cellPx}
                      height={cellPx}
                      rx={3}
                      fill={active ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                      stroke={active ? "hsl(var(--primary-foreground) / 0.3)" : "hsl(var(--border))"}
                      strokeWidth={0.5}
                      opacity={active ? 1 : 0.4}
                      className={mode === "libre" ? "cursor-pointer" : ""}
                      onMouseDown={() => handleMouseDown(r, c)}
                      onMouseEnter={() => handleMouseEnter(r, c)}
                    />
                  ))
                )}
                {/* Green leaf icons on active cells */}
                {grid.map((row, r) =>
                  row.map((active, c) =>
                    active ? (
                      <text
                        key={`leaf-${r}-${c}`}
                        x={1 + c * (cellPx + gap) + cellPx / 2}
                        y={1 + r * (cellPx + gap) + cellPx / 2 + 4}
                        textAnchor="middle"
                        fontSize={cellPx * 0.4}
                        fill="hsl(var(--primary-foreground))"
                        pointerEvents="none"
                      >
                        🌿
                      </text>
                    ) : null
                  )
                )}
              </svg>
            </div>

            {/* Dimension labels */}
            <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground font-medium">
              <span>↔ {(cols * MODULE_SIZE).toFixed(1)} m ({cols} col)</span>
              <span>↕ {(rows * MODULE_SIZE).toFixed(1)} m ({rows} fil)</span>
            </div>
          </CardContent>
        </Card>

        {/* Result summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="rounded-lg bg-primary/10 p-3">
                <div className="text-2xl font-bold text-primary">{moduleCount}</div>
                <div className="text-xs text-muted-foreground">Módulos 50×50</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <div className="text-2xl font-bold text-foreground">{(moduleCount * MODULE_SIZE * MODULE_SIZE).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">m² cubiertos</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <div className="text-2xl font-bold text-foreground">{cols}</div>
                <div className="text-xs text-muted-foreground">Columnas</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <div className="text-2xl font-bold text-foreground">{rows}</div>
                <div className="text-xs text-muted-foreground">Filas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="text-center py-5 text-xs text-muted-foreground">Floortek — tiendapisos.com</footer>
    </div>
  );
};

export default JardinesVerticalesCalculator;
