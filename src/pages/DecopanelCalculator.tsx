import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Wand2, Trash2, GripVertical, Check } from "lucide-react";
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

// ─── Draw schema in PDF ──────────────────────────────────────────
function drawSchemaPDF(
  doc: jsPDF,
  panels: string[],
  panelMap: Record<string, PanelType>,
  startY: number,
  pageWidth: number
): number {
  const totalCm = panels.reduce((s, id) => s + (panelMap[id]?.widthCm || 0), 0);
  if (totalCm <= 0) return startY;

  const margin = 14;
  const drawW = pageWidth - margin * 2;
  const drawH = 30;
  let x = margin;
  const y = startY;

  // Border
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, drawW, drawH);

  panels.forEach((id) => {
    const pt = panelMap[id];
    if (!pt) return;
    const w = (pt.widthCm / totalCm) * drawW;

    // Fill
    if (pt.pattern === "varillado") {
      doc.setFillColor(210, 190, 170);
    } else if (pt.widthCm === 120) {
      doc.setFillColor(185, 175, 165);
    } else if (pt.widthCm === 60) {
      doc.setFillColor(200, 188, 178);
    } else {
      doc.setFillColor(215, 205, 195);
    }
    doc.rect(x, y, w, drawH, "F");

    // Varillado lines
    if (pt.pattern === "varillado" && w > 3) {
      doc.setDrawColor(160, 140, 120);
      doc.setLineWidth(0.15);
      const lines = Math.max(2, Math.floor(w / 2));
      for (let l = 1; l < lines; l++) {
        const lx = x + (l / lines) * w;
        doc.line(lx, y + 2, lx, y + drawH - 2);
      }
    }

    // Separator line
    doc.setDrawColor(140, 140, 140);
    doc.setLineWidth(0.2);
    doc.line(x + w, y, x + w, y + drawH);

    // Width label
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`${pt.widthCm}`, x + w / 2, y + drawH + 4, { align: "center" });

    x += w;
  });

  // Dimension line below
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  const dimY = y + drawH + 7;
  doc.line(margin, dimY, margin + drawW, dimY);
  doc.line(margin, dimY - 1.5, margin, dimY + 1.5);
  doc.line(margin + drawW, dimY - 1.5, margin + drawW, dimY + 1.5);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(`${totalCm} cm`, margin + drawW / 2, dimY + 4, { align: "center" });

  return dimY + 8;
}

// ─── Suggestion generator ────────────────────────────────────────
function generateSuggestions(wallCm: number): { name: string; panels: string[] }[] {
  if (wallCm <= 0) return [];
  const results: { name: string; panels: string[]; diff: number }[] = [];

  const tryCombo = (name: string, panelIds: { id: string; w: number }[]) => {
    // Try best fit with these panel types
    let remaining = wallCm;
    const panels: string[] = [];

    // Sort by width descending for greedy fill
    const sorted = [...panelIds].sort((a, b) => b.w - a.w);
    for (const p of sorted) {
      const count = Math.floor(remaining / p.w);
      for (let i = 0; i < count; i++) panels.push(p.id);
      remaining -= count * p.w;
    }

    if (panels.length > 0 && remaining <= wallCm * 0.1) {
      results.push({ name, panels, diff: Math.abs(remaining) });
    }
  };

  // Single type fills
  tryCombo("Todo Liso 120cm", [{ id: "liso120", w: 120 }]);
  tryCombo("Todo Liso 60cm", [{ id: "liso60", w: 60 }]);
  tryCombo("Todo Liso 20cm", [{ id: "liso20", w: 20 }]);
  tryCombo("Todo Varillado 25cm", [{ id: "varillado25", w: 25 }]);

  // Two-type combos
  tryCombo("Liso 120 + 60", [{ id: "liso120", w: 120 }, { id: "liso60", w: 60 }]);
  tryCombo("Liso 120 + 20", [{ id: "liso120", w: 120 }, { id: "liso20", w: 20 }]);
  tryCombo("Liso 60 + 20", [{ id: "liso60", w: 60 }, { id: "liso20", w: 20 }]);
  tryCombo("Liso 120 + Varillado", [{ id: "liso120", w: 120 }, { id: "varillado25", w: 25 }]);
  tryCombo("Liso 60 + Varillado", [{ id: "liso60", w: 60 }, { id: "varillado25", w: 25 }]);
  tryCombo("Liso 20 + Varillado", [{ id: "liso20", w: 20 }, { id: "varillado25", w: 25 }]);

  // Three-type combos
  tryCombo("Liso 120 + 60 + 20", [{ id: "liso120", w: 120 }, { id: "liso60", w: 60 }, { id: "liso20", w: 20 }]);
  tryCombo("Liso 120 + 60 + Varillado", [{ id: "liso120", w: 120 }, { id: "liso60", w: 60 }, { id: "varillado25", w: 25 }]);

  // Alternating pattern
  {
    const unitW = 60 + 25;
    const units = Math.floor(wallCm / unitW);
    const rem = wallCm - units * unitW;
    if (units >= 2 && rem <= wallCm * 0.1) {
      const p: string[] = [];
      for (let i = 0; i < units; i++) { p.push("liso60"); p.push("varillado25"); }
      // Fill remainder with liso20
      const n20 = Math.round(rem / 20);
      for (let i = 0; i < n20; i++) p.push("liso20");
      results.push({ name: "Alternado 60/Varillado", panels: p, diff: Math.abs(rem - n20 * 20) });
    }
  }

  // Dedupe by name, sort by best fit, ensure at least unique combos
  const seen = new Set<string>();
  const unique = results.filter((r) => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });

  unique.sort((a, b) => a.diff - b.diff);
  return unique.slice(0, 6);
}

// ─── Component ───────────────────────────────────────────────────
const DecopanelCalculator = () => {
  const navigate = useNavigate();

  const [wallWidth, setWallWidth] = useState("");
  const [placed, setPlaced] = useState<PlacedPanel[]>([]);
  const [defaultUnion, setDefaultUnion] = useState<UnionType>("invisible");
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
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

  const applySuggestion = (panelIds: string[], idx: number) => {
    const panels: PlacedPanel[] = panelIds.map((typeId) => ({ uid: genUid(), typeId }));
    setPlaced(recalcUnions(panels));
    setSelectedSuggestion(idx);
  };

  const getSuggestionSummary = (panelIds: string[]) => {
    const counts: Record<string, number> = {};
    let perfilInicio = panelIds.length > 0 ? 2 : 0;
    let unionVisible = 0;
    let unionInvisible = 0;
    panelIds.forEach((id, i) => {
      counts[id] = (counts[id] || 0) + 1;
      if (i < panelIds.length - 1) {
        const curr = panelMap[id];
        const next = panelMap[panelIds[i + 1]];
        if (curr?.pattern === "liso" && next?.pattern === "liso") {
          if (defaultUnion === "visible") unionVisible++;
          else unionInvisible++;
        }
      }
    });
    return { counts, perfilInicio, unionVisible, unionInvisible };
  };

  const handleExportSuggestionPDF = (s: { name: string; panels: string[] }) => {
    const ss = getSuggestionSummary(s.panels);
    const totalCm = s.panels.reduce((sum, id) => sum + (panelMap[id]?.widthCm || 0), 0);
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
    doc.text(`Opción: ${s.name}`, 14, 24);
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

    // Draw visual schema
    doc.setFont("helvetica", "bold");
    doc.text("Esquema", 14, y); y += 6;
    y = drawSchemaPDF(doc, s.panels, panelMap, y, pw);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Materiales", 14, y); y += 8;
    doc.setFont("helvetica", "normal");
    PANEL_TYPES.forEach((pt) => {
      const c = ss.counts[pt.id] || 0;
      if (c > 0) { doc.text(`${pt.label}: ${c} u`, 14, y); y += 6; }
    });
    if (ss.perfilInicio > 0) { doc.text(`Perfil Inicio/Terminación: ${ss.perfilInicio} u`, 14, y); y += 6; }
    if (ss.unionVisible > 0) { doc.text(`Perfil Unión Visible (2mm): ${ss.unionVisible} u`, 14, y); y += 6; }
    if (ss.unionInvisible > 0) { doc.text(`Perfil Unión Invisible: ${ss.unionInvisible} u`, 14, y); y += 6; }
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por Floortek — Decopanel | tiendapisos.com", 14, y);
    doc.save(`Decopanel_${s.name.replace(/ /g, "_")}_${wallWidth}m.pdf`);
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

    // Draw visual schema
    doc.setFont("helvetica", "bold");
    doc.text("Esquema", 14, y); y += 6;
    const placedTypeIds = placed.map((p) => p.typeId);
    y = drawSchemaPDF(doc, placedTypeIds, panelMap, y, pw);
    y += 6;

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
              <p className="text-xs text-muted-foreground mt-1">Seleccioná una opción para ver el detalle y cargarla al lienzo</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestions.map((s, i) => {
                const totalCm = s.panels.reduce((sum, id) => sum + (panelMap[id]?.widthCm || 0), 0);
                const isSelected = selectedSuggestion === i;
                const ss = isSelected ? getSuggestionSummary(s.panels) : null;
                const coverPct = wallCm > 0 ? Math.min((totalCm / wallCm) * 100, 100) : 100;

                return (
                  <div
                    key={i}
                    className={`rounded-xl border-2 transition-all overflow-hidden ${
                      isSelected
                        ? "border-primary bg-accent/20 shadow-md"
                        : "border-border/40 hover:border-primary/40 hover:shadow-sm"
                    }`}
                  >
                    {/* Header + Preview */}
                    <button
                      onClick={() => applySuggestion(s.panels, i)}
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                          <span className="font-semibold text-sm text-foreground">{s.name}</span>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {totalCm}cm — {s.panels.length} paneles
                        </span>
                      </div>

                      {/* Full-width proportional preview */}
                      <div className="relative rounded-lg overflow-hidden border border-border/30 bg-muted/30" style={{ height: 80 }}>
                        <div className="flex h-full" style={{ width: `${coverPct}%` }}>
                          {s.panels.map((id, j) => {
                            const pt = panelMap[id];
                            if (!pt) return null;
                            return (
                              <div
                                key={j}
                                className="h-full border-r border-black/5 last:border-r-0 relative"
                                style={{
                                  width: `${(pt.widthCm / totalCm) * 100}%`,
                                  backgroundColor: pt.color,
                                }}
                              >
                                {pt.pattern === "varillado" && (
                                  <div className="absolute inset-0 flex justify-evenly items-center pointer-events-none">
                                    {[...Array(Math.max(3, Math.floor(pt.widthCm / 4)))].map((_, k) => (
                                      <div key={k} className="w-[1px] h-4/5 bg-black/10" />
                                    ))}
                                  </div>
                                )}
                                <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium text-foreground/60">
                                  {pt.widthCm}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </button>

                    {/* Expanded material detail */}
                    {isSelected && ss && (
                      <div className="px-4 pb-4 pt-0 border-t border-border/30">
                        <div className="bg-background rounded-lg p-3 mt-3 space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Materiales</p>
                          {PANEL_TYPES.map((pt) => {
                            const c = ss.counts[pt.id] || 0;
                            if (c === 0) return null;
                            return (
                              <div key={pt.id} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{pt.label}</span>
                                <span className="font-medium">{c} u</span>
                              </div>
                            );
                          })}
                          {ss.perfilInicio > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Perfil Inicio/Terminación</span>
                              <span className="font-medium">{ss.perfilInicio} u</span>
                            </div>
                          )}
                          {ss.unionVisible > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Perfil Unión Visible (2mm)</span>
                              <span className="font-medium">{ss.unionVisible} u</span>
                            </div>
                          )}
                          {ss.unionInvisible > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Perfil Unión Invisible</span>
                              <span className="font-medium">{ss.unionInvisible} u</span>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-3 gap-1.5 text-xs"
                          onClick={(e) => { e.stopPropagation(); handleExportSuggestionPDF(s); }}
                        >
                          <Download className="w-3.5 h-3.5" /> Descargar PDF de esta opción
                        </Button>
                      </div>
                    )}
                  </div>
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
