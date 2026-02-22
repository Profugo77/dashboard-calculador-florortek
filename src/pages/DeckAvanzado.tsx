import { useState, useRef, useMemo, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Ruler, Package, Grid3X3, Wrench, Plus, Trash2, Upload, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import StructureSchema from "@/components/deck-avanzado/StructureSchema";
import BoardSchema from "@/components/deck-avanzado/BoardSchema";
import LShapeDragEditor, { type LShapeDragValues } from "@/components/deck-avanzado/LShapeDragEditor";
import {
  type BoardDir, type BoardLen, type ShapeMode, type SubRect, type AvzCalcResult,
  calculateRect, calculateLShape, calculateMultiRect,
} from "@/lib/deckAvanzadoCalc";

const DeckAvanzado = () => {
  const navigate = useNavigate();
  const structRef = useRef<SVGSVGElement>(null);

  // Shape mode
  const [shapeMode, setShapeMode] = useState<ShapeMode>("rectangle");
  const [largo, setLargo] = useState(5);
  const [ancho, setAncho] = useState(3);
  const [lShape, setLShape] = useState<LShapeDragValues>({ anchoTotal: 6, largoTotal: 8, anchoBrazo: 3, largoBrazo: 4 });
  const [subRects, setSubRects] = useState<SubRect[]>([{ id: "1", largo: 5, ancho: 3 }]);
  const [croquisImage, setCroquisImage] = useState<string | null>(null);
  const [croquisLargo, setCroquisLargo] = useState(5);
  const [croquisAncho, setCroquisAncho] = useState(3);

  // Board settings
  const [dir, setDir] = useState<BoardDir>("horizontal");
  const [boardLen, setBoardLen] = useState<BoardLen>(2.2);

  // Pilotin override
  const [pilotinMode, setPilotinMode] = useState<"auto" | "manual">("auto");
  const [pilotinManual, setPilotinManual] = useState(20);

  // Effective dimensions for schemas
  const effLargo = shapeMode === "l-shape" ? lShape.largoTotal : shapeMode === "croquis" ? croquisLargo : largo;
  const effAncho = shapeMode === "l-shape" ? lShape.anchoTotal : shapeMode === "croquis" ? croquisAncho : ancho;

  // Calculation
  const result: AvzCalcResult = useMemo(() => {
    switch (shapeMode) {
      case "rectangle":
        return calculateRect(largo, ancho, dir, boardLen);
      case "l-shape":
        return calculateLShape(lShape, dir, boardLen);
      case "multi-rect":
        return calculateMultiRect(subRects.filter((r) => r.largo > 0 && r.ancho > 0), dir, boardLen);
      case "croquis":
        return calculateRect(croquisLargo, croquisAncho, dir, boardLen);
      default:
        return calculateRect(largo, ancho, dir, boardLen);
    }
  }, [shapeMode, largo, ancho, dir, boardLen, lShape, subRects, croquisLargo, croquisAncho]);

  const finalPilotines = pilotinMode === "manual" ? pilotinManual : result.pilotines;

  // Croquis upload handler
  const handleCroquisUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCroquisImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Multi-rect handlers
  const addSubRect = () => setSubRects((p) => [...p, { id: String(Date.now()), largo: 3, ancho: 2 }]);
  const removeSubRect = (id: string) => setSubRects((p) => p.filter((r) => r.id !== id));
  const updateSubRect = (id: string, key: "largo" | "ancho", val: number) =>
    setSubRects((p) => p.map((r) => (r.id === id ? { ...r, [key]: val } : r)));

  /* ─── PDF ─── */
  const handlePDF = () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = 190;
    const cx = 10;
    let cy = 15;

    pdf.setFillColor(0, 109, 86);
    pdf.rect(0, 0, 210, 28, "F");
    pdf.setFont("helvetica", "bolditalic");
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text("FLOORTEK", cx, 14);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("INGENIERÍA v3.1", cx + 52, 14);
    pdf.setFontSize(11);
    pdf.text("Ingeniería de Decks — Cotización Avanzada", cx, 23);
    cy = 36;

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Parámetros", cx, cy); cy += 7;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    const modeLabel = { rectangle: "Rectangular", "l-shape": "Forma en L", "multi-rect": "Multi-rectángulo", croquis: "Croquis" };
    pdf.text(`Modo: ${modeLabel[shapeMode]}`, cx, cy); cy += 5;
    if (shapeMode === "l-shape") {
      pdf.text(`Ancho total: ${lShape.anchoTotal}m | Largo total: ${lShape.largoTotal}m`, cx, cy); cy += 5;
      pdf.text(`Brazo: ${lShape.anchoBrazo}m × ${lShape.largoBrazo}m`, cx, cy); cy += 5;
    } else {
      pdf.text(`Largo: ${effLargo} m  |  Ancho: ${effAncho} m`, cx, cy); cy += 5;
    }
    pdf.text(`Dirección tablas: ${dir === "horizontal" ? "Horizontal" : "Vertical"}  |  Largo tabla: ${boardLen} m`, cx, cy); cy += 5;
    pdf.text(`Separación vigas: ${result.sepVigas} cm  (${result.cantVigas} vigas)`, cx, cy); cy += 10;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Resultados", cx, cy); cy += 7;

    const rows = [
      ["M² Netos", `${result.m2Netos} m²`],
      ["M² Compra (+10%)", `${result.m2Compra} m²`],
      ["Tablas", `${result.tablasUn} un`],
      ["Vigas (ml)", `${result.vigasMl} ml`],
      ["Clips y Fijaciones", `${result.clips} un`],
      ["Pilotines", `${finalPilotines} un`],
      ["Doble caño (juntas)", `${result.doubleBeamCount} posiciones`],
    ];
    pdf.setFontSize(10);
    rows.forEach(([label, val]) => {
      pdf.setFont("helvetica", "normal");
      pdf.text(label, cx, cy);
      pdf.setFont("helvetica", "bold");
      pdf.text(val, cx + 80, cy);
      cy += 6;
    });
    cy += 6;

    // SVG → canvas → PDF
    const svgEl = structRef.current;
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const canvas = document.createElement("canvas");
      const ctx2 = canvas.getContext("2d")!;
      const img = new Image();
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx2.fillStyle = "#fff";
        ctx2.fillRect(0, 0, canvas.width, canvas.height);
        ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = canvas.toDataURL("image/png");
        const ratio = canvas.height / canvas.width;
        const imgW = Math.min(pw, 160);
        const imgH = imgW * ratio;
        pdf.addImage(imgData, "PNG", cx, cy, imgW, imgH);
        cy += imgH + 8;

        // Add croquis image if present
        if (croquisImage && shapeMode === "croquis") {
          pdf.addPage();
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.text("Croquis de Referencia", cx, 20);
          pdf.addImage(croquisImage, "JPEG", cx, 28, pw, pw * 0.6);
        }

        pdf.save(`Floortek_DeckAvanzado_${effLargo}x${effAncho}.pdf`);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } else {
      pdf.save(`Floortek_DeckAvanzado_${effLargo}x${effAncho}.pdf`);
    }
  };

  /* ─── result cards config ─── */
  const cards = [
    { label: "M² Netos", value: `${result.m2Netos}`, unit: "m²", color: "hsl(170 100% 26%)", icon: Grid3X3 },
    { label: "M² Compra (+10%)", value: `${result.m2Compra}`, unit: "m²", color: "hsl(142 60% 40%)", icon: Package },
    { label: "Tablas", value: `${result.tablasUn}`, unit: "un", color: "hsl(30 70% 50%)", icon: Ruler },
    { label: "Vigas", value: `${result.vigasMl}`, unit: "ml", color: "hsl(200 60% 45%)", icon: Ruler },
    { label: "Clips", value: `${result.clips}`, unit: "un", color: "hsl(260 50% 55%)", icon: Wrench },
    { label: "Pilotines", value: `${finalPilotines}`, unit: "un", color: "hsl(220 60% 50%)", icon: MapPin },
  ];

  const shapeModes: { id: ShapeMode; label: string }[] = [
    { id: "rectangle", label: "Rectangular" },
    { id: "l-shape", label: "Forma L" },
    { id: "multi-rect", label: "Multi-Rect" },
    { id: "croquis", label: "Croquis" },
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", background: "hsl(200 15% 96%)" }}>
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "hsl(170 100% 21%)", borderColor: "hsl(170 80% 16%)" }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white/80 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-lg font-bold italic text-white tracking-tight">FLOORTEK</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(170 70% 30%)", color: "hsl(170 80% 90%)" }}>
              INGENIERÍA v3.1
            </span>
          </div>
          <Button size="sm" onClick={handlePDF} className="gap-1.5 text-xs font-semibold" style={{ background: "hsl(170 70% 30%)", color: "white" }}>
            <Download className="h-3.5 w-3.5" /> Exportar PDF
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* ─── Left: Controls ─── */}
        <aside className="lg:w-80 flex-shrink-0 space-y-4">
          {/* Shape mode */}
          <div className="rounded-xl border p-4 space-y-3" style={{ background: "white", borderColor: "hsl(200 10% 88%)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(200 10% 40%)" }}>Tipo de Superficie</h3>
            <div className="grid grid-cols-2 gap-2">
              {shapeModes.map((m) => (
                <button key={m.id} onClick={() => setShapeMode(m.id)}
                  className="text-xs font-semibold py-2 rounded-lg border transition-all"
                  style={{
                    background: shapeMode === m.id ? "hsl(170 100% 26%)" : "white",
                    color: shapeMode === m.id ? "white" : "hsl(200 10% 35%)",
                    borderColor: shapeMode === m.id ? "hsl(170 100% 26%)" : "hsl(200 10% 85%)",
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shape dimensions */}
          <div className="rounded-xl border p-4 space-y-3" style={{ background: "white", borderColor: "hsl(200 10% 88%)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(200 10% 40%)" }}>
              {shapeMode === "croquis" ? "Croquis y Dimensiones" : "Dimensiones"}
            </h3>

            {shapeMode === "rectangle" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Largo (m)</Label>
                  <Input type="number" min={0.5} max={30} step={0.1} value={largo}
                    onChange={(e) => setLargo(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                    className="mt-1 text-center font-semibold" />
                </div>
                <div>
                  <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Ancho (m)</Label>
                  <Input type="number" min={0.5} max={30} step={0.1} value={ancho}
                    onChange={(e) => setAncho(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                    className="mt-1 text-center font-semibold" />
                </div>
              </div>
            )}

            {shapeMode === "l-shape" && (
              <LShapeDragEditor value={lShape} onChange={setLShape} />
            )}

            {shapeMode === "multi-rect" && (
              <div className="space-y-2">
                {subRects.map((r, idx) => (
                  <div key={r.id} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-[10px]">L {idx + 1} (m)</Label>
                      <Input type="number" min={0.5} step={0.1} value={r.largo}
                        onChange={(e) => updateSubRect(r.id, "largo", Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                        className="text-center text-xs h-8" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px]">A {idx + 1} (m)</Label>
                      <Input type="number" min={0.5} step={0.1} value={r.ancho}
                        onChange={(e) => updateSubRect(r.id, "ancho", Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                        className="text-center text-xs h-8" />
                    </div>
                    {subRects.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600"
                        onClick={() => removeSubRect(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addSubRect} className="w-full gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Agregar rectángulo
                </Button>
              </div>
            )}

            {shapeMode === "croquis" && (
              <div className="space-y-3">
                <label className="flex flex-col items-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors hover:border-[hsl(170,100%,26%)]"
                  style={{ borderColor: croquisImage ? "hsl(170 100% 26%)" : "hsl(200 10% 80%)" }}>
                  <Upload className="h-5 w-5" style={{ color: "hsl(200 10% 50%)" }} />
                  <span className="text-xs text-center" style={{ color: "hsl(200 10% 50%)" }}>
                    {croquisImage ? "Cambiar imagen" : "Subir croquis"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCroquisUpload} />
                </label>
                {croquisImage && (
                  <img src={croquisImage} alt="Croquis" className="rounded-lg border max-h-40 w-full object-contain" />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Largo (m)</Label>
                    <Input type="number" min={0.5} max={30} step={0.1} value={croquisLargo}
                      onChange={(e) => setCroquisLargo(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                      className="mt-1 text-center font-semibold" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Ancho (m)</Label>
                    <Input type="number" min={0.5} max={30} step={0.1} value={croquisAncho}
                      onChange={(e) => setCroquisAncho(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                      className="mt-1 text-center font-semibold" />
                  </div>
                </div>
                <p className="text-[10px]" style={{ color: "hsl(200 10% 55%)" }}>
                  Ingresá las dimensiones manualmente. El croquis se adjunta como referencia.
                </p>
              </div>
            )}
          </div>

          {/* Board settings */}
          <div className="rounded-xl border p-4 space-y-3" style={{ background: "white", borderColor: "hsl(200 10% 88%)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(200 10% 40%)" }}>Tablas y Estructura</h3>
            <div>
              <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Dirección de tablas</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(["horizontal", "vertical"] as BoardDir[]).map((d) => (
                  <button key={d} onClick={() => setDir(d)}
                    className="text-xs font-semibold py-2 rounded-lg border transition-all"
                    style={{
                      background: dir === d ? "hsl(170 100% 26%)" : "white",
                      color: dir === d ? "white" : "hsl(200 10% 35%)",
                      borderColor: dir === d ? "hsl(170 100% 26%)" : "hsl(200 10% 85%)",
                    }}>
                    {d === "horizontal" ? "Horizontal" : "Vertical"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Largo de tabla</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {([2.2, 2.9] as BoardLen[]).map((bl) => (
                  <button key={bl} onClick={() => setBoardLen(bl)}
                    className="text-xs font-semibold py-2 rounded-lg border transition-all"
                    style={{
                      background: boardLen === bl ? "hsl(170 100% 26%)" : "white",
                      color: boardLen === bl ? "white" : "hsl(200 10% 35%)",
                      borderColor: boardLen === bl ? "hsl(170 100% 26%)" : "hsl(200 10% 85%)",
                    }}>
                    {bl} m
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-1" style={{ color: "hsl(200 10% 55%)" }}>Ancho fijo: 15 cm</p>
            </div>
          </div>

          {/* Pilotines */}
          <div className="rounded-xl border p-4 space-y-3" style={{ background: "white", borderColor: "hsl(200 10% 88%)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(200 10% 40%)" }}>Pilotines</h3>
            <div className="grid grid-cols-2 gap-2">
              {(["auto", "manual"] as const).map((m) => (
                <button key={m} onClick={() => setPilotinMode(m)}
                  className="text-xs font-semibold py-2 rounded-lg border transition-all"
                  style={{
                    background: pilotinMode === m ? "hsl(170 100% 26%)" : "white",
                    color: pilotinMode === m ? "white" : "hsl(200 10% 35%)",
                    borderColor: pilotinMode === m ? "hsl(170 100% 26%)" : "hsl(200 10% 85%)",
                  }}>
                  {m === "auto" ? "Automático" : "Manual"}
                </button>
              ))}
            </div>
            {pilotinMode === "manual" && (
              <div>
                <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Cantidad</Label>
                <Input type="number" min={1} value={pilotinManual}
                  onChange={(e) => setPilotinManual(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 text-center font-semibold" />
              </div>
            )}
          </div>

          {/* Beam info */}
          <div className="rounded-lg p-3 text-center" style={{ background: "hsl(170 60% 93%)", border: "1px solid hsl(170 40% 80%)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(170 60% 30%)" }}>Separación vigas</p>
            <p className="text-2xl font-bold" style={{ color: "hsl(170 100% 21%)" }}>{result.sepVigas} cm</p>
            <p className="text-[10px]" style={{ color: "hsl(170 50% 35%)" }}>{result.cantVigas} vigas · {result.doubleBeamCount} doble caño</p>
          </div>
        </aside>

        {/* ─── Right: Results + Schemas ─── */}
        <main className="flex-1 space-y-5">
          {/* Result cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border bg-white p-3 relative overflow-hidden" style={{ borderColor: "hsl(200 10% 88%)" }}>
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: c.color }} />
                <div className="flex items-center gap-1 mb-0.5">
                  <c.icon className="h-3 w-3" style={{ color: c.color }} />
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "hsl(200 10% 50%)" }}>{c.label}</span>
                </div>
                <p className="text-lg font-bold" style={{ color: "hsl(200 15% 15%)" }}>
                  {c.value} <span className="text-[10px] font-normal" style={{ color: "hsl(200 10% 50%)" }}>{c.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Schemas side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Structure Schema */}
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: "hsl(200 10% 88%)" }}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "hsl(200 10% 40%)" }}>
                Esquema de Estructura
              </h4>
              <div className="w-full overflow-x-auto flex justify-center">
                {(shapeMode === "rectangle" || shapeMode === "croquis") && (
                  <StructureSchema svgRef={structRef} largo={effLargo} ancho={effAncho} dir={dir} boardLen={boardLen}
                    result={result} shape="rectangle" />
                )}
                {shapeMode === "l-shape" && (
                  <StructureSchema svgRef={structRef} largo={lShape.largoTotal} ancho={lShape.anchoTotal} dir={dir} boardLen={boardLen}
                    result={result} shape="l-shape" lShape={lShape} />
                )}
                {shapeMode === "multi-rect" && (
                  <div className="flex flex-col gap-4 w-full items-center">
                    {subRects.filter(r => r.largo > 0 && r.ancho > 0).map((r, idx) => {
                      const rResult = calculateRect(r.largo, r.ancho, dir, boardLen);
                      return (
                        <Fragment key={r.id}>
                          <p className="text-[10px] font-semibold" style={{ color: "hsl(200 10% 50%)" }}>Rectángulo {idx + 1}</p>
                          <StructureSchema
                            svgRef={idx === 0 ? structRef : undefined}
                            largo={r.largo} ancho={r.ancho} dir={dir} boardLen={boardLen}
                            result={rResult} shape="rectangle" />
                        </Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[10px]" style={{ color: "hsl(200 10% 45%)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-0.5 rounded" style={{ background: "hsl(0 75% 50%)" }} /> Vigas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-1 rounded" style={{ background: "hsl(30 90% 50%)" }} /> Doble caño
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "hsl(220 60% 55%)" }} /> Pilotines
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm border" style={{ background: "hsl(200 10% 94%)", borderColor: "hsl(200 15% 30%)" }} /> Área
                </span>
              </div>
            </div>

            {/* Board Schema */}
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: "hsl(200 10% 88%)" }}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "hsl(200 10% 40%)" }}>
                Esquema de Tablas
              </h4>
              <div className="w-full overflow-x-auto flex justify-center">
                {(shapeMode === "rectangle" || shapeMode === "croquis") && (
                  <BoardSchema largo={effLargo} ancho={effAncho} dir={dir} boardLen={boardLen} shape="rectangle" />
                )}
                {shapeMode === "l-shape" && (
                  <BoardSchema largo={lShape.largoTotal} ancho={lShape.anchoTotal} dir={dir} boardLen={boardLen}
                    shape="l-shape" lShape={lShape} />
                )}
                {shapeMode === "multi-rect" && (
                  <div className="flex flex-col gap-4 w-full items-center">
                    {subRects.filter(r => r.largo > 0 && r.ancho > 0).map((r, idx) => (
                      <Fragment key={r.id}>
                        <p className="text-[10px] font-semibold" style={{ color: "hsl(200 10% 50%)" }}>Rectángulo {idx + 1}</p>
                        <BoardSchema largo={r.largo} ancho={r.ancho} dir={dir} boardLen={boardLen} shape="rectangle" />
                      </Fragment>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-[10px]" style={{ color: "hsl(200 10% 45%)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-3 rounded-sm" style={{ background: "hsl(30 35% 65%)" }} /> Tablas WPC
                </span>
              </div>
            </div>
          </div>

          {/* Croquis display */}
          {shapeMode === "croquis" && croquisImage && (
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: "hsl(200 10% 88%)" }}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "hsl(200 10% 40%)" }}>
                Croquis de Referencia
              </h4>
              <img src={croquisImage} alt="Croquis" className="max-h-72 mx-auto rounded-lg" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DeckAvanzado;
