import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import jsPDF from "jspdf";

// ─── Panel data ──────────────────────────────────────────────────
interface PanelType {
  id: string;
  label: string;
  widthCm: number;
  color: string;
  pattern: "liso" | "varillado";
}

const PANEL_TYPES: PanelType[] = [
  { id: "liso20", label: "Liso 20cm", widthCm: 20, color: "hsl(30 20% 82%)", pattern: "liso" },
  { id: "liso60", label: "Liso 60cm", widthCm: 60, color: "hsl(30 15% 75%)", pattern: "liso" },
  { id: "liso120", label: "Liso 120cm", widthCm: 120, color: "hsl(30 12% 68%)", pattern: "liso" },
  { id: "varillado25", label: "Varillado 25cm", widthCm: 25, color: "hsl(25 22% 78%)", pattern: "varillado" },
];

type UnionType = "visible" | "invisible";

interface PlacedPanel {
  uid: string;
  typeId: string;
  unionAfter?: UnionType;
}

const HEIGHT_M = 2.9;

let uidCounter = 0;
const genUid = () => `p-${++uidCounter}-${Date.now()}`;

const PANEL_MAP: Record<string, PanelType> = {};
PANEL_TYPES.forEach((p) => (PANEL_MAP[p.id] = p));

// ─── Draw schema in PDF ──────────────────────────────────────────
function drawSchemaPDF(doc: jsPDF, panels: string[], startY: number, pageWidth: number): number {
  const totalCm = panels.reduce((s, id) => s + (PANEL_MAP[id]?.widthCm || 0), 0);
  if (totalCm <= 0) return startY;

  const margin = 14;
  const drawW = pageWidth - margin * 2;
  const drawH = 30;
  let x = margin;
  const y = startY;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, drawW, drawH);

  panels.forEach((id) => {
    const pt = PANEL_MAP[id];
    if (!pt) return;
    const w = (pt.widthCm / totalCm) * drawW;

    if (pt.pattern === "varillado") doc.setFillColor(210, 190, 170);
    else if (pt.widthCm === 120) doc.setFillColor(185, 175, 165);
    else if (pt.widthCm === 60) doc.setFillColor(200, 188, 178);
    else doc.setFillColor(215, 205, 195);
    doc.rect(x, y, w, drawH, "F");

    if (pt.pattern === "varillado" && w > 3) {
      doc.setDrawColor(160, 140, 120);
      doc.setLineWidth(0.15);
      const lines = Math.max(2, Math.floor(w / 2));
      for (let l = 1; l < lines; l++) {
        const lx = x + (l / lines) * w;
        doc.line(lx, y + 2, lx, y + drawH - 2);
      }
    }

    doc.setDrawColor(140, 140, 140);
    doc.setLineWidth(0.2);
    doc.line(x + w, y, x + w, y + drawH);

    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`${pt.widthCm}`, x + w / 2, y + drawH + 4, { align: "center" });

    x += w;
  });

  const dimY = y + drawH + 7;
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(margin, dimY, margin + drawW, dimY);
  doc.line(margin, dimY - 1.5, margin, dimY + 1.5);
  doc.line(margin + drawW, dimY - 1.5, margin + drawW, dimY + 1.5);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(`${totalCm} cm`, margin + drawW / 2, dimY + 4, { align: "center" });

  return dimY + 8;
}

// ─── Compute summary ────────────────────────────────────────────
function computeSummary(panels: PlacedPanel[]) {
  const counts: Record<string, number> = {};
  let perfilInicio = panels.length > 0 ? 2 : 0;
  let perfilUnionVisible = 0;
  let perfilUnionInvisible = 0;
  panels.forEach((p) => {
    counts[p.typeId] = (counts[p.typeId] || 0) + 1;
    if (p.unionAfter === "visible") perfilUnionVisible++;
    if (p.unionAfter === "invisible") perfilUnionInvisible++;
  });
  return { counts, perfilInicio, perfilUnionVisible, perfilUnionInvisible };
}

// ─── Write option to PDF ─────────────────────────────────────────
function writeOptionToPDF(
  doc: jsPDF,
  label: string,
  panels: PlacedPanel[],
  wallCm: number,
  y: number,
  pw: number
): number {
  const sum = computeSummary(panels);
  const usedCm = panels.reduce((s, p) => s + (PANEL_MAP[p.typeId]?.widthCm || 0), 0);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 133, 119);
  doc.text(label, 14, y);
  y += 7;

  // Schema
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  y = drawSchemaPDF(doc, panels.map((p) => p.typeId), y, pw);
  y += 4;

  // Materials
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Materiales", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  PANEL_TYPES.forEach((pt) => {
    const c = sum.counts[pt.id] || 0;
    if (c > 0) { doc.text(`${pt.label}: ${c} u`, 14, y); y += 5; }
  });
  if (sum.perfilInicio > 0) { doc.text(`Perfil Inicio/Terminación: ${sum.perfilInicio} u`, 14, y); y += 5; }
  if (sum.perfilUnionVisible > 0) { doc.text(`Perfil Unión Visible (2mm): ${sum.perfilUnionVisible} u`, 14, y); y += 5; }
  if (sum.perfilUnionInvisible > 0) { doc.text(`Perfil Unión Invisible: ${sum.perfilUnionInvisible} u`, 14, y); y += 5; }
  doc.text(`Cobertura: ${usedCm}cm / ${wallCm}cm`, 14, y);
  y += 8;

  return y;
}

// ─── Canvas component ────────────────────────────────────────────
interface CanvasProps {
  label: string;
  placed: PlacedPanel[];
  setPlaced: React.Dispatch<React.SetStateAction<PlacedPanel[]>>;
  wallCm: number;
  defaultUnion: UnionType;
}

const CANVAS_W = 600;

function recalcUnions(panels: PlacedPanel[], defaultUnion: UnionType): PlacedPanel[] {
  return panels.map((p, i) => {
    if (i < panels.length - 1) {
      const curr = PANEL_MAP[p.typeId];
      const next = PANEL_MAP[panels[i + 1].typeId];
      if (curr?.pattern === "liso" && next?.pattern === "liso") {
        return { ...p, unionAfter: p.unionAfter || defaultUnion };
      }
    }
    return { ...p, unionAfter: undefined };
  });
}

const PanelCanvas = ({ label, placed, setPlaced, wallCm, defaultUnion }: CanvasProps) => {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragItem = useRef<{ fromPalette: boolean; typeId: string; idx?: number } | null>(null);

  const scaleFactor = wallCm > 0 ? CANVAS_W / wallCm : 1;
  const usedCm = placed.reduce((s, p) => s + (PANEL_MAP[p.typeId]?.widthCm || 0), 0);
  const remainingCm = wallCm - usedCm;

  const addPanel = (typeId: string) => {
    const newPanel: PlacedPanel = { uid: genUid(), typeId };
    setPlaced((prev) => recalcUnions([...prev, newPanel], defaultUnion));
  };
  const removePanel = (uid: string) => {
    setPlaced((prev) => recalcUnions(prev.filter((p) => p.uid !== uid), defaultUnion));
  };
  const toggleUnion = (uid: string) => {
    setPlaced((prev) =>
      prev.map((p) =>
        p.uid === uid && p.unionAfter
          ? { ...p, unionAfter: p.unionAfter === "visible" ? "invisible" : "visible" }
          : p
      )
    );
  };
  const clearAll = () => setPlaced([]);

  const handleDragStartPalette = (typeId: string) => (e: React.DragEvent) => {
    dragItem.current = { fromPalette: true, typeId };
    e.dataTransfer.effectAllowed = "copy";
  };
  const handleDragStartPlaced = (idx: number, typeId: string) => (e: React.DragEvent) => {
    dragItem.current = { fromPalette: false, typeId, idx };
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDragOverCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverIdx === null) setDragOverIdx(placed.length);
  };
  const handleDrop = (dropIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIdx(null);
    const d = dragItem.current;
    if (!d) return;
    if (d.fromPalette) {
      const newPanel: PlacedPanel = { uid: genUid(), typeId: d.typeId };
      setPlaced((prev) => {
        const copy = [...prev];
        copy.splice(dropIdx, 0, newPanel);
        return recalcUnions(copy, defaultUnion);
      });
    } else if (d.idx !== undefined) {
      setPlaced((prev) => {
        const copy = [...prev];
        const [moved] = copy.splice(d.idx!, 1);
        const adjustedIdx = dropIdx > d.idx! ? dropIdx - 1 : dropIdx;
        copy.splice(adjustedIdx, 0, moved);
        return recalcUnions(copy, defaultUnion);
      });
    }
    dragItem.current = null;
  };
  const handleDropCanvas = (e: React.DragEvent) => handleDrop(placed.length)(e);
  const handleDragEnd = () => { setDragOverIdx(null); dragItem.current = null; };

  const summary = computeSummary(placed);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Palette */}
        <div>
          <Label className="text-xs mb-2 block">Arrastrá o hacé click para agregar paneles</Label>
          <div className="flex flex-wrap gap-2">
            {PANEL_TYPES.map((pt) => (
              <div
                key={pt.id}
                draggable
                onDragStart={handleDragStartPalette(pt.id)}
                onDragEnd={handleDragEnd}
                onClick={() => addPanel(pt.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-accent/30 transition-colors select-none"
              >
                <div
                  className="w-6 h-8 rounded-sm border border-border/50 flex items-center justify-center"
                  style={{ backgroundColor: pt.color }}
                >
                  {pt.pattern === "varillado" && (
                    <div className="flex gap-[1px]">
                      {[...Array(2)].map((_, k) => (
                        <div key={k} className="w-[1px] h-5 bg-black/15" />
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium">{pt.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div
          className="relative border-2 border-dashed border-border/60 rounded-lg p-3 min-h-[140px] bg-muted/20"
          onDragOver={handleDragOverCanvas}
          onDrop={handleDropCanvas}
          onDragLeave={() => setDragOverIdx(null)}
        >
          {placed.length === 0 ? (
            <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
              Arrastrá paneles acá o hacé click en la paleta
            </div>
          ) : (
            <>
              <div className="overflow-x-auto pb-2">
                <div className="flex items-end" style={{ width: wallCm > 0 ? CANVAS_W : "auto" }}>
                  {placed.map((p, i) => {
                    const pt = PANEL_MAP[p.typeId];
                    if (!pt) return null;
                    const w = wallCm > 0 ? pt.widthCm * scaleFactor : 60;
                    return (
                      <div key={p.uid} className="flex items-end">
                        <div
                          className={`transition-all ${dragOverIdx === i ? "w-1 bg-primary rounded" : "w-0"}`}
                          style={{ height: 100 }}
                          onDragOver={handleDragOver(i)}
                          onDrop={handleDrop(i)}
                        />
                        <div
                          draggable
                          onDragStart={handleDragStartPlaced(i, p.typeId)}
                          onDragEnd={handleDragEnd}
                          className="relative group cursor-grab active:cursor-grabbing"
                          style={{
                            width: Math.max(w, 24),
                            height: 100,
                            backgroundColor: pt.color,
                            borderRadius: 3,
                            border: "1px solid hsl(0 0% 70%)",
                          }}
                        >
                          {pt.pattern === "varillado" && (
                            <div className="absolute inset-0 flex justify-evenly items-center pointer-events-none">
                              {[...Array(Math.max(2, Math.floor(w / 8)))].map((_, k) => (
                                <div key={k} className="w-[1px] h-4/5 bg-black/10" />
                              ))}
                            </div>
                          )}
                          <div className="absolute bottom-0.5 left-0 right-0 text-center text-[9px] text-foreground/70 font-medium">
                            {pt.widthCm}cm
                          </div>
                          <button
                            onClick={() => removePanel(p.uid)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            ×
                          </button>
                        </div>
                        {p.unionAfter && (
                          <button
                            onClick={() => toggleUnion(p.uid)}
                            className="w-1 flex-shrink-0 relative"
                            style={{ height: 100 }}
                            title={`Unión ${p.unionAfter === "visible" ? "visible 2mm" : "invisible"} — click para cambiar`}
                          >
                            <div className={`w-full h-full ${p.unionAfter === "visible" ? "bg-foreground/40" : "bg-foreground/10"}`} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div
                    className={`transition-all ${dragOverIdx === placed.length ? "w-1 bg-primary rounded" : "w-0"}`}
                    style={{ height: 100 }}
                    onDragOver={handleDragOver(placed.length)}
                    onDrop={handleDrop(placed.length)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-muted-foreground">
                  {usedCm}cm usados{wallCm > 0 && ` / ${wallCm}cm`}
                  {wallCm > 0 && remainingCm !== 0 && (
                    <span className={remainingCm < 0 ? "text-destructive ml-1" : "text-primary ml-1"}>
                      ({remainingCm > 0 ? `faltan ${remainingCm}cm` : `excede ${Math.abs(remainingCm)}cm`})
                    </span>
                  )}
                </span>
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-muted-foreground" onClick={clearAll}>
                  <Trash2 className="w-3 h-3" /> Limpiar
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Click en la unión entre lisos para alternar visible (2mm) / invisible. Varillados se unen por macho/hembra.
        </p>

        {/* Summary */}
        {placed.length > 0 && (
          <div className="bg-accent/50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Materiales</p>
            {PANEL_TYPES.map((pt) => {
              const c = summary.counts[pt.id] || 0;
              if (c === 0) return null;
              return (
                <div key={pt.id} className="flex justify-between text-sm py-0.5">
                  <span className="text-muted-foreground">{pt.label}</span>
                  <span className="font-medium">{c} u</span>
                </div>
              );
            })}
            {summary.perfilInicio > 0 && (
              <div className="flex justify-between text-sm py-0.5">
                <span className="text-muted-foreground">Perfil Inicio/Terminación</span>
                <span className="font-medium">{summary.perfilInicio} u</span>
              </div>
            )}
            {summary.perfilUnionVisible > 0 && (
              <div className="flex justify-between text-sm py-0.5">
                <span className="text-muted-foreground">Perfil Unión Visible (2mm)</span>
                <span className="font-medium">{summary.perfilUnionVisible} u</span>
              </div>
            )}
            {summary.perfilUnionInvisible > 0 && (
              <div className="flex justify-between text-sm py-0.5">
                <span className="text-muted-foreground">Perfil Unión Invisible</span>
                <span className="font-medium">{summary.perfilUnionInvisible} u</span>
              </div>
            )}
            <div className="pt-1.5 border-t border-border/50 flex justify-between text-sm">
              <span className="text-muted-foreground">Cobertura</span>
              <span className="font-bold text-foreground">{usedCm}cm × {HEIGHT_M}m</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Main Component ──────────────────────────────────────────────
const DecopanelCalculator = () => {
  const navigate = useNavigate();

  const [wallWidth, setWallWidth] = useState("");
  const [placedA, setPlacedA] = useState<PlacedPanel[]>([]);
  const [placedB, setPlacedB] = useState<PlacedPanel[]>([]);
  const [defaultUnion, setDefaultUnion] = useState<UnionType>("invisible");

  const wallCm = (parseFloat(wallWidth) || 0) * 100;
  const hasData = placedA.length > 0 || placedB.length > 0;

  const handleExportPDF = () => {
    if (!hasData) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();

    doc.setFillColor(0, 133, 119);
    doc.rect(0, 0, pw, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("DECOPANEL", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Diseño de Pared", 14, 24);
    const today = new Date().toLocaleDateString("es-AR");
    doc.setFontSize(9);
    doc.text(today, pw - 14, 16, { align: "right" });

    let y = 44;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Datos", 14, y); y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Ancho de pared: ${wallWidth} m (${wallCm} cm)`, 14, y); y += 6;
    doc.text(`Alto: ${HEIGHT_M} m`, 14, y); y += 12;

    if (placedA.length > 0) {
      y = writeOptionToPDF(doc, "Opción A", placedA, wallCm, y, pw);
      y += 4;
    }

    if (placedB.length > 0) {
      // Check if we need a new page
      if (y > 200) {
        doc.addPage();
        y = 20;
      }
      y = writeOptionToPDF(doc, "Opción B", placedB, wallCm, y, pw);
    }

    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por Floortek — Decopanel | tiendapisos.com", 14, y);
    doc.save(`Decopanel_${wallWidth}m.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>DECOPANEL</h1>
            <p className="text-xs text-primary-foreground/70">Diseño de Pared</p>
          </div>
          {hasData && (
            <Button size="sm" variant="secondary" onClick={handleExportPDF} className="gap-1.5">
              <Download className="w-4 h-4" /> PDF
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Wall width */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Medida de Pared</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ancho (m)</Label>
                <Input type="number" step="0.01" value={wallWidth} onChange={(e) => setWallWidth(e.target.value)} placeholder="Ej: 3.60" />
              </div>
              <div>
                <Label className="text-xs">Alto (m)</Label>
                <Input type="number" value={HEIGHT_M.toString()} disabled className="bg-muted" />
              </div>
            </div>

            {/* Union default */}
            <div className="flex items-center gap-3 text-xs mt-3 pt-3 border-t border-border/50">
              <span className="text-muted-foreground">Unión entre lisos:</span>
              <Button
                size="sm"
                variant={defaultUnion === "invisible" ? "default" : "outline"}
                className="h-6 text-xs px-2"
                onClick={() => setDefaultUnion("invisible")}
              >
                Invisible
              </Button>
              <Button
                size="sm"
                variant={defaultUnion === "visible" ? "default" : "outline"}
                className="h-6 text-xs px-2"
                onClick={() => setDefaultUnion("visible")}
              >
                Visible (2mm)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Option A */}
        <PanelCanvas label="Opción A" placed={placedA} setPlaced={setPlacedA} wallCm={wallCm} defaultUnion={defaultUnion} />

        {/* Option B */}
        <PanelCanvas label="Opción B" placed={placedB} setPlaced={setPlacedB} wallCm={wallCm} defaultUnion={defaultUnion} />

        {/* Download */}
        {hasData && (
          <Button className="w-full gap-2" onClick={handleExportPDF}>
            <Download className="w-4 h-4" /> Descargar PDF con ambas opciones
          </Button>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        Floortek — tiendapisos.com
      </footer>
    </div>
  );
};

export default DecopanelCalculator;
