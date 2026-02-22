import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Ruler, Package, Grid3X3, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";

/* ─── types ─── */
type BoardDir = "horizontal" | "vertical";
type BoardLen = 2.2 | 2.9;

interface CalcResult {
  m2Netos: number;
  m2Compra: number;
  tablasUn: number;
  vigasMl: number;
  cantVigas: number;
  sepVigas: number;
  clips: number;
  filasTablas: number;
}

/* ─── optimisation logic ─── */
function optimizeBeamSpacing(dist: number): { count: number; spacing: number } {
  const nMax = Math.ceil(dist / 0.35);
  const spacingMax = dist / nMax;

  const nLess = nMax - 1;
  if (nLess >= 1) {
    const spacingLess = dist / nLess;
    if (spacingLess <= 0.40) {
      return { count: nLess + 1, spacing: spacingLess };
    }
  }
  return { count: nMax + 1, spacing: spacingMax };
}

function calculate(
  largo: number,
  ancho: number,
  dir: BoardDir,
  boardLen: BoardLen
): CalcResult {
  const BOARD_W = 0.15;
  const m2Netos = largo * ancho;
  const m2Compra = Math.ceil(m2Netos * 1.10 * 100) / 100;

  // Beams run perpendicular to boards
  const beamRunDim = dir === "horizontal" ? largo : ancho; // dimension across which beams are spaced
  const beamLength = dir === "horizontal" ? ancho : largo; // each beam's length

  const { count: cantVigas, spacing: sepVigas } = optimizeBeamSpacing(beamRunDim);

  const vigasMl = Math.ceil(cantVigas * beamLength * 100) / 100;

  // Boards stack perpendicular
  const stackDim = dir === "horizontal" ? largo : ancho;
  const filasTablas = Math.ceil(stackDim / BOARD_W);

  // How many board pieces per row
  const boardDim = dir === "horizontal" ? ancho : largo;
  const piecesPerRow = Math.ceil(boardDim / boardLen);
  const tablasUn = filasTablas * piecesPerRow;

  // Clips: 1 per beam-row intersection + 10%
  const rawClips = cantVigas * filasTablas;
  const clips = Math.ceil(rawClips * 1.10);

  return {
    m2Netos: Math.round(m2Netos * 100) / 100,
    m2Compra,
    tablasUn,
    vigasMl,
    cantVigas,
    sepVigas: Math.round(sepVigas * 1000) / 10,
    clips,
    filasTablas,
  };
}

/* ─── Component ─── */
const DeckAvanzado = () => {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const [largo, setLargo] = useState(5);
  const [ancho, setAncho] = useState(3);
  const [dir, setDir] = useState<BoardDir>("horizontal");
  const [boardLen, setBoardLen] = useState<BoardLen>(2.2);

  const result = useMemo(() => calculate(largo, ancho, dir, boardLen), [largo, ancho, dir, boardLen]);

  /* ─── PDF ─── */
  const handlePDF = () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = 190;
    const cx = 10;
    let cy = 15;

    // Header
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
    pdf.text(`Largo: ${largo} m  |  Ancho: ${ancho} m`, cx, cy); cy += 5;
    pdf.text(`Dirección tablas: ${dir === "horizontal" ? "Horizontal" : "Vertical"}  |  Largo tabla: ${boardLen} m`, cx, cy); cy += 5;
    pdf.text(`Separación vigas: ${result.sepVigas} cm  (${result.cantVigas} vigas)`, cx, cy); cy += 10;

    // Results table
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Resultados", cx, cy); cy += 7;

    const rows = [
      ["M² Netos", `${result.m2Netos} m²`],
      ["M² Compra (+10%)", `${result.m2Compra} m²`],
      ["Tablas", `${result.tablasUn} un`],
      ["Vigas (ml)", `${result.vigasMl} ml`],
      ["Clips y Fijaciones", `${result.clips} un`],
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

    // SVG to canvas → PDF
    if (svgRef.current) {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = canvas.toDataURL("image/png");
        const ratio = canvas.height / canvas.width;
        const imgW = Math.min(pw, 160);
        const imgH = imgW * ratio;
        pdf.addImage(imgData, "PNG", cx, cy, imgW, imgH);
        pdf.save(`Floortek_DeckAvanzado_${largo}x${ancho}.pdf`);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } else {
      pdf.save(`Floortek_DeckAvanzado_${largo}x${ancho}.pdf`);
    }
  };

  /* ─── SVG Drawing ─── */
  const svgPadding = 50;
  const maxDraw = 400;
  const scale = Math.min(maxDraw / ancho, maxDraw / largo);
  const dw = ancho * scale;
  const dh = largo * scale;
  const svgW = dw + svgPadding * 2;
  const svgH = dh + svgPadding * 2;
  const ox = svgPadding;
  const oy = svgPadding;

  const beamLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const spacingM = result.sepVigas / 100;
    for (let i = 0; i < result.cantVigas; i++) {
      const pos = i * spacingM;
      if (dir === "horizontal") {
        const y = oy + pos * scale;
        lines.push({ x1: ox, y1: y, x2: ox + dw, y2: y });
      } else {
        const x = ox + pos * scale;
        lines.push({ x1: x, y1: oy, x2: x, y2: oy + dh });
      }
    }
    return lines;
  }, [result, dir, scale, dw, dh, ox, oy]);

  /* ─── result cards config ─── */
  const cards = [
    { label: "M² Netos", value: `${result.m2Netos}`, unit: "m²", color: "hsl(170 100% 26%)", icon: Grid3X3 },
    { label: "M² Compra (+10%)", value: `${result.m2Compra}`, unit: "m²", color: "hsl(142 60% 40%)", icon: Package },
    { label: "Tablas", value: `${result.tablasUn}`, unit: "un", color: "hsl(30 70% 50%)", icon: Ruler },
    { label: "Vigas", value: `${result.vigasMl}`, unit: "ml", color: "hsl(200 60% 45%)", icon: Ruler },
    { label: "Clips", value: `${result.clips}`, unit: "un", color: "hsl(260 50% 55%)", icon: Wrench },
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", background: "hsl(200 15% 96%)" }}>
      {/* ─── Navbar ─── */}
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
        <aside className="lg:w-72 flex-shrink-0 space-y-5">
          <div className="rounded-xl border p-5 space-y-4" style={{ background: "white", borderColor: "hsl(200 10% 88%)" }}>
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "hsl(200 10% 40%)" }}>Panel Geométrico</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Largo (m)</Label>
                <Input
                  type="number" min={0.5} max={30} step={0.1}
                  value={largo} onChange={(e) => setLargo(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                  className="mt-1 text-center font-semibold"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Ancho (m)</Label>
                <Input
                  type="number" min={0.5} max={30} step={0.1}
                  value={ancho} onChange={(e) => setAncho(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                  className="mt-1 text-center font-semibold"
                />
              </div>
            </div>

            {/* Direction */}
            <div>
              <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Dirección de tablas</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {(["horizontal", "vertical"] as BoardDir[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDir(d)}
                    className="text-xs font-semibold py-2 rounded-lg border transition-all"
                    style={{
                      background: dir === d ? "hsl(170 100% 26%)" : "white",
                      color: dir === d ? "white" : "hsl(200 10% 35%)",
                      borderColor: dir === d ? "hsl(170 100% 26%)" : "hsl(200 10% 85%)",
                    }}
                  >
                    {d === "horizontal" ? "Horizontal" : "Vertical"}
                  </button>
                ))}
              </div>
            </div>

            {/* Board length */}
            <div>
              <Label className="text-xs font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Largo de tabla</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {([2.2, 2.9] as BoardLen[]).map((bl) => (
                  <button
                    key={bl}
                    onClick={() => setBoardLen(bl)}
                    className="text-xs font-semibold py-2 rounded-lg border transition-all"
                    style={{
                      background: boardLen === bl ? "hsl(170 100% 26%)" : "white",
                      color: boardLen === bl ? "white" : "hsl(200 10% 35%)",
                      borderColor: boardLen === bl ? "hsl(170 100% 26%)" : "hsl(200 10% 85%)",
                    }}
                  >
                    {bl} m
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-1" style={{ color: "hsl(200 10% 55%)" }}>Ancho fijo: 15 cm</p>
            </div>

            {/* Beam info */}
            <div className="rounded-lg p-3 text-center" style={{ background: "hsl(170 60% 93%)", border: "1px solid hsl(170 40% 80%)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(170 60% 30%)" }}>Separación vigas</p>
              <p className="text-2xl font-bold" style={{ color: "hsl(170 100% 21%)" }}>{result.sepVigas} cm</p>
              <p className="text-[10px]" style={{ color: "hsl(170 50% 35%)" }}>{result.cantVigas} vigas optimizadas</p>
            </div>
          </div>
        </aside>

        {/* ─── Right: Visualization + Results ─── */}
        <main className="flex-1 space-y-5">
          {/* Result cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-xl border bg-white p-4 relative overflow-hidden"
                style={{ borderColor: "hsl(200 10% 88%)" }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: c.color }} />
                <div className="flex items-center gap-1.5 mb-1">
                  <c.icon className="h-3.5 w-3.5" style={{ color: c.color }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(200 10% 50%)" }}>{c.label}</span>
                </div>
                <p className="text-xl font-bold" style={{ color: "hsl(200 15% 15%)" }}>
                  {c.value} <span className="text-xs font-normal" style={{ color: "hsl(200 10% 50%)" }}>{c.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* SVG Visualization */}
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: "hsl(200 10% 88%)" }}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "hsl(200 10% 40%)" }}>
              Esquema de Ingeniería
            </h4>
            <div className="w-full overflow-x-auto flex justify-center">
              <svg ref={svgRef} viewBox={`0 0 ${svgW} ${svgH}`} className="max-w-full" style={{ maxHeight: 450, background: "hsl(200 10% 98%)" }}>
                {/* Deck outline */}
                <rect
                  x={ox} y={oy} width={dw} height={dh}
                  fill="hsl(200 10% 94%)" stroke="hsl(200 15% 30%)" strokeWidth={2} rx={3}
                />

                {/* Beams */}
                {beamLines.map((l, i) => (
                  <line
                    key={`beam-${i}`}
                    x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                    stroke="hsl(0 75% 50%)" strokeWidth={2.5} strokeLinecap="round"
                  />
                ))}

                {/* Dims */}
                <text x={ox + dw / 2} y={oy - 16} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(200 15% 25%)">{ancho} m</text>
                <text
                  x={ox - 18} y={oy + dh / 2} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(200 15% 25%)"
                  transform={`rotate(-90, ${ox - 18}, ${oy + dh / 2})`}
                >{largo} m</text>

                {/* Sep annotation */}
                <text x={ox + dw + 8} y={oy + dh / 2} fontSize={10} fill="hsl(0 60% 45%)" fontWeight={600}
                  transform={`rotate(-90, ${ox + dw + 8}, ${oy + dh / 2})`}
                  textAnchor="middle"
                >
                  Sep: {result.sepVigas} cm
                </text>
              </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-5 mt-3 text-xs" style={{ color: "hsl(200 10% 45%)" }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 rounded" style={{ background: "hsl(0 75% 50%)" }} />
                Vigas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-3 rounded-sm border" style={{ background: "hsl(200 10% 94%)", borderColor: "hsl(200 15% 30%)" }} />
                Área deck
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DeckAvanzado;
