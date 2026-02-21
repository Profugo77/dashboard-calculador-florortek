import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Wand2, Trash2, GripVertical } from "lucide-react";
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
  unionAfter?: UnionType; // union profile after this panel (only for liso→liso)
}

const HEIGHT_M = 2.9;

let uidCounter = 0;
const genUid = () => `p-${++uidCounter}-${Date.now()}`;

// ─── Suggestion generator ────────────────────────────────────────
function generateSuggestions(wallCm: number): { name: string; panels: string[] }[] {
  if (wallCm <= 0) return [];
  const suggestions: { name: string; panels: string[] }[] = [];

  // Helper: fill wall with a single panel type
  const fillWith = (typeId: string, widthCm: number): string[] | null => {
    const count = Math.floor(wallCm / widthCm);
    if (count <= 0) return null;
    if (Math.abs(count * widthCm - wallCm) <= 5) return Array(count).fill(typeId);
    return null;
  };

  // 1) All 120cm
  const all120 = fillWith("liso120", 120);
  if (all120) suggestions.push({ name: "Todo Liso 120cm", panels: all120 });

  // 2) All 60cm
  const all60 = fillWith("liso60", 60);
  if (all60) suggestions.push({ name: "Todo Liso 60cm", panels: all60 });

  // 3) All varillado
  const allVar = fillWith("varillado25", 25);
  if (allVar) suggestions.push({ name: "Todo Varillado", panels: allVar });

  // 4) Mix 120 + 60
  {
    const n120 = Math.floor(wallCm / 120);
    const rem = wallCm - n120 * 120;
    const n60 = Math.round(rem / 60);
    if (n120 > 0 && n60 > 0 && Math.abs(n120 * 120 + n60 * 60 - wallCm) <= 5) {
      const p: string[] = [];
      for (let i = 0; i < n120; i++) p.push("liso120");
      for (let i = 0; i < n60; i++) p.push("liso60");
      suggestions.push({ name: "Liso 120 + 60", panels: p });
    }
  }

  // 5) Mix 60 + varillado
  {
    const n60 = Math.floor(wallCm / 60);
    const rem = wallCm - n60 * 60;
    const nVar = Math.round(rem / 25);
    if (n60 > 0 && nVar > 0 && Math.abs(n60 * 60 + nVar * 25 - wallCm) <= 5) {
      const p: string[] = [];
      for (let i = 0; i < n60; i++) p.push("liso60");
      for (let i = 0; i < nVar; i++) p.push("varillado25");
      suggestions.push({ name: "Liso 60 + Varillado", panels: p });
    }
  }

  // 6) Alternating 60 + varillado
  {
    const unitW = 60 + 25;
    const units = Math.floor(wallCm / unitW);
    if (units >= 2 && Math.abs(units * unitW - wallCm) <= 10) {
      const p: string[] = [];
      for (let i = 0; i < units; i++) { p.push("liso60"); p.push("varillado25"); }
      suggestions.push({ name: "Alternado 60/Varillado", panels: p });
    }
  }

  // 7) Mix 120 + varillado
  {
    const n120 = Math.floor(wallCm / 120);
    const rem = wallCm - n120 * 120;
    const nVar = Math.round(rem / 25);
    if (n120 > 0 && nVar > 0 && Math.abs(n120 * 120 + nVar * 25 - wallCm) <= 5) {
      const p: string[] = [];
      for (let i = 0; i < n120; i++) p.push("liso120");
      for (let i = 0; i < nVar; i++) p.push("varillado25");
      suggestions.push({ name: "Liso 120 + Varillado", panels: p });
    }
  }

  return suggestions.slice(0, 5);
}

// ─── Component ───────────────────────────────────────────────────
const DecopanelCalculator = () => {
  const navigate = useNavigate();

  const [wallWidth, setWallWidth] = useState("");
  const [placed, setPlaced] = useState<PlacedPanel[]>([]);
  const [defaultUnion, setDefaultUnion] = useState<UnionType>("invisible");
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragItem = useRef<{ fromPalette: boolean; typeId: string; idx?: number } | null>(null);

  const wallCm = (parseFloat(wallWidth) || 0) * 100;

  const panelMap = useMemo(() => {
    const m: Record<string, PanelType> = {};
    PANEL_TYPES.forEach((p) => (m[p.id] = p));
    return m;
  }, []);

  const usedCm = useMemo(
    () => placed.reduce((s, p) => s + (panelMap[p.typeId]?.widthCm || 0), 0),
    [placed, panelMap]
  );

  const remainingCm = wallCm - usedCm;

  // ─── Drag handlers ────────────────────────────────────────────
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
        return recalcUnions(copy);
      });
    } else if (d.idx !== undefined) {
      setPlaced((prev) => {
        const copy = [...prev];
        const [moved] = copy.splice(d.idx!, 1);
        const adjustedIdx = dropIdx > d.idx! ? dropIdx - 1 : dropIdx;
        copy.splice(adjustedIdx, 0, moved);
        return recalcUnions(copy);
      });
    }
    dragItem.current = null;
  };

  const handleDropCanvas = (e: React.DragEvent) => {
    handleDrop(placed.length)(e);
  };

  const handleDragEnd = () => {
    setDragOverIdx(null);
    dragItem.current = null;
  };

  const recalcUnions = (panels: PlacedPanel[]): PlacedPanel[] => {
    return panels.map((p, i) => {
      if (i < panels.length - 1) {
        const curr = panelMap[p.typeId];
        const next = panelMap[panels[i + 1].typeId];
        if (curr?.pattern === "liso" && next?.pattern === "liso") {
          return { ...p, unionAfter: p.unionAfter || defaultUnion };
        }
      }
      return { ...p, unionAfter: undefined };
    });
  };

  const addPanel = (typeId: string) => {
    const newPanel: PlacedPanel = { uid: genUid(), typeId };
    setPlaced((prev) => recalcUnions([...prev, newPanel]));
  };

  const removePanel = (uid: string) => {
    setPlaced((prev) => recalcUnions(prev.filter((p) => p.uid !== uid)));
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

  const applySuggestion = (panelIds: string[]) => {
    const panels: PlacedPanel[] = panelIds.map((typeId) => ({ uid: genUid(), typeId }));
    setPlaced(recalcUnions(panels));
  };

  // ─── Summary ──────────────────────────────────────────────────
  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    let perfilInicio = placed.length > 0 ? 2 : 0; // 1 inicio + 1 terminación
    let perfilUnionVisible = 0;
    let perfilUnionInvisible = 0;

    placed.forEach((p) => {
      counts[p.typeId] = (counts[p.typeId] || 0) + 1;
      if (p.unionAfter === "visible") perfilUnionVisible++;
      if (p.unionAfter === "invisible") perfilUnionInvisible++;
    });

    return { counts, perfilInicio, perfilUnionVisible, perfilUnionInvisible };
  }, [placed]);

  const suggestions = useMemo(() => generateSuggestions(wallCm), [wallCm]);
  const hasData = placed.length > 0;

  // ─── PDF ──────────────────────────────────────────────────────
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
    doc.text(`Alto: ${HEIGHT_M} m`, 14, y); y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Materiales", 14, y); y += 8;
    doc.setFont("helvetica", "normal");
    PANEL_TYPES.forEach((pt) => {
      const c = summary.counts[pt.id] || 0;
      if (c > 0) {
        doc.text(`${pt.label}: ${c} unidades`, 14, y); y += 6;
      }
    });
    if (summary.perfilInicio > 0) {
      doc.text(`Perfil Inicio/Terminación: ${summary.perfilInicio}`, 14, y); y += 6;
    }
    if (summary.perfilUnionVisible > 0) {
      doc.text(`Perfil Unión Visible (2mm): ${summary.perfilUnionVisible}`, 14, y); y += 6;
    }
    if (summary.perfilUnionInvisible > 0) {
      doc.text(`Perfil Unión Invisible: ${summary.perfilUnionInvisible}`, 14, y); y += 6;
    }
    y += 6;
    doc.text(`Cobertura total: ${usedCm} cm / ${wallCm} cm`, 14, y); y += 12;

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por Floortek — Decopanel | tiendapisos.com", 14, y);
    doc.save(`Decopanel_${wallWidth}m.pdf`);
  };

  // ─── Visual scale ─────────────────────────────────────────────
  const CANVAS_W = 600;
  const scaleFactor = wallCm > 0 ? CANVAS_W / wallCm : 1;

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
          </CardContent>
        </Card>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                Opciones Sugeridas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map((s, i) => {
                const totalCm = s.panels.reduce((sum, id) => sum + (panelMap[id]?.widthCm || 0), 0);
                return (
                  <button
                    key={i}
                    onClick={() => applySuggestion(s.panels)}
                    className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{totalCm}cm</span>
                    </div>
                    {/* Mini preview */}
                    <div className="flex h-6 rounded overflow-hidden border border-border/30">
                      {s.panels.map((id, j) => {
                        const pt = panelMap[id];
                        if (!pt) return null;
                        return (
                          <div
                            key={j}
                            className="h-full border-r border-border/20 last:border-r-0 flex items-center justify-center"
                            style={{
                              width: `${(pt.widthCm / totalCm) * 100}%`,
                              backgroundColor: pt.color,
                            }}
                          >
                            {pt.pattern === "varillado" && (
                              <div className="flex gap-[1px] h-full items-center">
                                {[...Array(3)].map((_, k) => (
                                  <div key={k} className="w-[1px] h-3/4 bg-black/15" />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Palette + Canvas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Diseñá tu Pared</CardTitle>
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

            {/* Union default */}
            <div className="flex items-center gap-3 text-xs">
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
                  {/* Visual wall */}
                  <div className="overflow-x-auto pb-2">
                    <div className="flex items-end" style={{ width: wallCm > 0 ? CANVAS_W : "auto" }}>
                      {placed.map((p, i) => {
                        const pt = panelMap[p.typeId];
                        if (!pt) return null;
                        const w = wallCm > 0 ? pt.widthCm * scaleFactor : 60;
                        return (
                          <div key={p.uid} className="flex items-end">
                            {/* Drop zone indicator */}
                            <div
                              className={`transition-all ${dragOverIdx === i ? "w-1 bg-primary rounded" : "w-0"}`}
                              style={{ height: 100 }}
                              onDragOver={handleDragOver(i)}
                              onDrop={handleDrop(i)}
                            />
                            {/* Panel */}
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
                              {/* Pattern lines for varillado */}
                              {pt.pattern === "varillado" && (
                                <div className="absolute inset-0 flex justify-evenly items-center pointer-events-none">
                                  {[...Array(Math.max(2, Math.floor(w / 8)))].map((_, k) => (
                                    <div key={k} className="w-[1px] h-4/5 bg-black/10" />
                                  ))}
                                </div>
                              )}
                              {/* Width label */}
                              <div className="absolute bottom-0.5 left-0 right-0 text-center text-[9px] text-foreground/70 font-medium">
                                {pt.widthCm}cm
                              </div>
                              {/* Remove button */}
                              <button
                                onClick={() => removePanel(p.uid)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                              >
                                ×
                              </button>
                            </div>
                            {/* Union indicator */}
                            {p.unionAfter && (
                              <button
                                onClick={() => toggleUnion(p.uid)}
                                className="w-1 flex-shrink-0 relative group/union"
                                style={{ height: 100 }}
                                title={`Unión ${p.unionAfter === "visible" ? "visible 2mm" : "invisible"} — click para cambiar`}
                              >
                                <div
                                  className={`w-full h-full ${p.unionAfter === "visible" ? "bg-foreground/40" : "bg-foreground/10"}`}
                                />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {/* Final drop zone */}
                      <div
                        className={`transition-all ${dragOverIdx === placed.length ? "w-1 bg-primary rounded" : "w-0"}`}
                        style={{ height: 100 }}
                        onDragOver={handleDragOver(placed.length)}
                        onDrop={handleDrop(placed.length)}
                      />
                    </div>
                  </div>

                  {/* Info bar */}
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
              Hacé click en la unión entre paneles lisos para alternar entre visible (2mm) e invisible. Los varillados se unen por macho/hembra.
            </p>
          </CardContent>
        </Card>

        {/* Summary */}
        {hasData && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen de Materiales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                {PANEL_TYPES.map((pt) => {
                  const c = summary.counts[pt.id] || 0;
                  if (c === 0) return null;
                  return (
                    <div key={pt.id} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground">{pt.label}</span>
                      <span className="font-medium">{c} u</span>
                    </div>
                  );
                })}
                {summary.perfilInicio > 0 && (
                  <div className="flex justify-between text-sm py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Perfil Inicio/Terminación</span>
                    <span className="font-medium">{summary.perfilInicio} u</span>
                  </div>
                )}
                {summary.perfilUnionVisible > 0 && (
                  <div className="flex justify-between text-sm py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Perfil Unión Visible (2mm)</span>
                    <span className="font-medium">{summary.perfilUnionVisible} u</span>
                  </div>
                )}
                {summary.perfilUnionInvisible > 0 && (
                  <div className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">Perfil Unión Invisible</span>
                    <span className="font-medium">{summary.perfilUnionInvisible} u</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border/50 flex justify-between text-sm">
                  <span className="text-muted-foreground">Cobertura</span>
                  <span className="font-bold text-foreground">{usedCm}cm × {HEIGHT_M}m</span>
                </div>
              </div>

              <Button className="w-full gap-2 mt-4" onClick={handleExportPDF}>
                <Download className="w-4 h-4" /> Descargar PDF
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

export default DecopanelCalculator;
