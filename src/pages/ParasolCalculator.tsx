import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Calculator, Download } from "lucide-react";
import jsPDF from "jspdf";

// ─── Types ───────────────────────────────────────────────────────
type MountType = "piso-techo" | "lateral";

interface BeamSize {
  label: string;
  w: number; // mm - visible face (the smaller dim)
  h: number; // mm - depth
}

const BEAM_SIZES: BeamSize[] = [
  { label: "25 × 50 mm", w: 25, h: 50 },
  { label: "40 × 60 mm", w: 40, h: 60 },
  { label: "45 × 80 mm", w: 45, h: 80 },
  { label: "45 × 90 mm", w: 45, h: 90 },
  { label: "50 × 100 mm", w: 50, h: 100 },
];

// ─── Calculation ─────────────────────────────────────────────────
interface ParasolResult {
  cantVigas: number;
  mlVigas: number;
  cantTubosHierro: number;
  mlTubosHierro: number;
  cantPlanchuelas: number;
  cantTornillos: number;
  separacionReal: number;
}

function calcParasol(
  anchoMm: number,
  altoMm: number,
  beam: BeamSize,
  gapMm: number,
  mount: MountType
): ParasolResult {
  // The dimension along which beams are distributed
  const distDim = mount === "piso-techo" ? anchoMm : altoMm;
  // The length of each beam
  const beamLength = mount === "piso-techo" ? altoMm : anchoMm;

  const pitch = beam.w + gapMm;
  const cantVigas = Math.floor(distDim / pitch) + 1;

  // Actual remaining gap after distributing
  const usedWidth = cantVigas * beam.w + (cantVigas - 1) * gapMm;
  const separacionReal = cantVigas > 1 ? gapMm + (distDim - usedWidth) / (cantVigas - 1) : gapMm;

  const mlVigas = cantVigas * (beamLength / 1000);

  // Structure: 2 iron tubes (top+bottom or left+right) spanning the distribution dimension
  const cantTubosHierro = 2;
  const mlTubosHierro = cantTubosHierro * (distDim / 1000);

  // 2 planchuelas per beam (top+bottom or left+right)
  const cantPlanchuelas = cantVigas * 2;

  // 2 screws per planchuela
  const cantTornillos = cantPlanchuelas * 2;

  return {
    cantVigas,
    mlVigas: Math.round(mlVigas * 100) / 100,
    cantTubosHierro,
    mlTubosHierro: Math.round(mlTubosHierro * 100) / 100,
    cantPlanchuelas,
    cantTornillos,
    separacionReal: Math.round(separacionReal * 10) / 10,
  };
}

// ─── SVG Scheme ──────────────────────────────────────────────────
function ParasolScheme({
  anchoMm,
  altoMm,
  beam,
  gapMm,
  mount,
  result,
}: {
  anchoMm: number;
  altoMm: number;
  beam: BeamSize;
  gapMm: number;
  mount: MountType;
  result: ParasolResult;
}) {
  const padding = 40;
  const maxSvgW = 500;
  const maxSvgH = 400;

  const scaleX = (maxSvgW - padding * 2) / anchoMm;
  const scaleY = (maxSvgH - padding * 2) / altoMm;
  const scale = Math.min(scaleX, scaleY);

  const dw = anchoMm * scale;
  const dh = altoMm * scale;
  const svgW = dw + padding * 2;
  const svgH = dh + padding * 2;
  const ox = padding;
  const oy = padding;

  const beams: { x: number; y: number; w: number; h: number }[] = [];

  if (mount === "piso-techo") {
    // Vertical beams distributed along width
    const pitch = beam.w + gapMm;
    for (let i = 0; i < result.cantVigas; i++) {
      const cx = i * pitch;
      beams.push({
        x: ox + cx * scale,
        y: oy,
        w: beam.w * scale,
        h: dh,
      });
    }
  } else {
    // Horizontal beams distributed along height
    const pitch = beam.w + gapMm;
    for (let i = 0; i < result.cantVigas; i++) {
      const cy = i * pitch;
      beams.push({
        x: ox,
        y: oy + cy * scale,
        w: dw,
        h: beam.w * scale,
      });
    }
  }

  const ironTubeThickness = 4;

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="border rounded-lg bg-muted/30">
      {/* Iron tubes */}
      {mount === "piso-techo" ? (
        <>
          {/* Top tube */}
          <rect x={ox - 6} y={oy - ironTubeThickness - 2} width={dw + 12} height={ironTubeThickness} rx={1} fill="hsl(var(--muted-foreground))" opacity={0.6} />
          {/* Bottom tube */}
          <rect x={ox - 6} y={oy + dh + 2} width={dw + 12} height={ironTubeThickness} rx={1} fill="hsl(var(--muted-foreground))" opacity={0.6} />
          {/* Planchuelas at top */}
          {beams.map((b, i) => (
            <rect key={`pt-${i}`} x={b.x - 1} y={oy - ironTubeThickness - 6} width={b.w + 2} height={4} fill="hsl(var(--muted-foreground))" opacity={0.4} rx={0.5} />
          ))}
          {/* Planchuelas at bottom */}
          {beams.map((b, i) => (
            <rect key={`pb-${i}`} x={b.x - 1} y={oy + dh + ironTubeThickness + 2} width={b.w + 2} height={4} fill="hsl(var(--muted-foreground))" opacity={0.4} rx={0.5} />
          ))}
        </>
      ) : (
        <>
          {/* Left tube */}
          <rect x={ox - ironTubeThickness - 2} y={oy - 6} width={ironTubeThickness} height={dh + 12} rx={1} fill="hsl(var(--muted-foreground))" opacity={0.6} />
          {/* Right tube */}
          <rect x={ox + dw + 2} y={oy - 6} width={ironTubeThickness} height={dh + 12} rx={1} fill="hsl(var(--muted-foreground))" opacity={0.6} />
          {/* Planchuelas left */}
          {beams.map((b, i) => (
            <rect key={`pl-${i}`} x={ox - ironTubeThickness - 6} y={b.y - 1} width={4} height={b.h + 2} fill="hsl(var(--muted-foreground))" opacity={0.4} rx={0.5} />
          ))}
          {/* Planchuelas right */}
          {beams.map((b, i) => (
            <rect key={`pr-${i}`} x={ox + dw + ironTubeThickness + 2} y={b.y - 1} width={4} height={b.h + 2} fill="hsl(var(--muted-foreground))" opacity={0.4} rx={0.5} />
          ))}
        </>
      )}

      {/* WPC Beams */}
      {beams.map((b, i) => (
        <rect
          key={`beam-${i}`}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="hsl(var(--primary))"
          opacity={0.7}
          stroke="hsl(var(--primary))"
          strokeWidth={0.5}
          rx={1}
        />
      ))}

      {/* Dimension labels */}
      <text x={ox + dw / 2} y={12} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontWeight={600}>
        {anchoMm} mm
      </text>
      <text x={10} y={oy + dh / 2} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontWeight={600} transform={`rotate(-90, 10, ${oy + dh / 2})`}>
        {altoMm} mm
      </text>

      {/* Legend */}
      <rect x={ox} y={svgH - 18} width={10} height={6} fill="hsl(var(--primary))" opacity={0.7} rx={1} />
      <text x={ox + 14} y={svgH - 12} fontSize={9} fill="hsl(var(--muted-foreground))">Vigas WPC</text>
      <rect x={ox + 90} y={svgH - 18} width={10} height={6} fill="hsl(var(--muted-foreground))" opacity={0.6} rx={1} />
      <text x={ox + 104} y={svgH - 12} fontSize={9} fill="hsl(var(--muted-foreground))">Tubos H°</text>
      <rect x={ox + 170} y={svgH - 18} width={10} height={6} fill="hsl(var(--muted-foreground))" opacity={0.4} rx={1} />
      <text x={ox + 184} y={svgH - 12} fontSize={9} fill="hsl(var(--muted-foreground))">Planchuelas</text>
    </svg>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────
function exportParasolPDF(
  anchoMm: number,
  altoMm: number,
  beam: BeamSize,
  gapMm: number,
  mount: MountType,
  result: ParasolResult
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(0, 133, 119);
  doc.rect(0, 0, w, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FLOORTEK", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Calculadora Técnica de Parasoles", 14, 24);
  const today = new Date().toLocaleDateString("es-AR");
  doc.setFontSize(9);
  doc.text(today, w - 14, 16, { align: "right" });

  // Config
  let y = 44;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del Proyecto", 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Abertura: ${anchoMm} mm × ${altoMm} mm`, 14, y); y += 6;
  doc.text(`Viga WPC: ${beam.label} (vista ${beam.w} mm)`, 14, y); y += 6;
  doc.text(`Separación: ${gapMm} mm`, 14, y); y += 6;
  doc.text(`Tipo de agarre: ${mount === "piso-techo" ? "Piso y Techo" : "Lateral"}`, 14, y); y += 12;

  // Materials table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumen de Materiales", 14, y); y += 8;

  const rows: string[][] = [
    ["Material", "Cantidad"],
    ["Vigas WPC", `${result.cantVigas} un. (${result.mlVigas} ml)`],
    ["Tubos de hierro", `${result.cantTubosHierro} un. (${result.mlTubosHierro} ml)`],
    ["Planchuelas H°", `${result.cantPlanchuelas} un.`],
    ["Tornillos", `${result.cantTornillos} un.`],
  ];

  doc.setFontSize(10);
  const colX = [14, w - 14];
  rows.forEach((row, i) => {
    if (i === 0) {
      doc.setFillColor(0, 133, 119);
      doc.rect(12, y - 4, w - 24, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");
      if (i % 2 === 0) {
        doc.setFillColor(240, 248, 246);
        doc.rect(12, y - 4, w - 24, 7, "F");
      }
    }
    doc.text(row[0], colX[0], y);
    doc.text(row[1], colX[1], y, { align: "right" });
    y += 7;
  });

  // Diagram
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Esquema de Instalación", 14, y); y += 8;

  const maxDW = w - 28;
  const maxDH = 100;
  const scaleX = maxDW / (anchoMm / 1000);
  const scaleY = maxDH / (altoMm / 1000);
  const scale = Math.min(scaleX, scaleY);
  const anchoM = anchoMm / 1000;
  const altoM = altoMm / 1000;
  const dw2 = anchoM * scale;
  const dh2 = altoM * scale;
  const ox = 14 + (maxDW - dw2) / 2;
  const oy = y;

  // Draw beams
  const pitch = (beam.w + gapMm) / 1000;
  const beamWm = beam.w / 1000;

  if (mount === "piso-techo") {
    // Structure tubes
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.8);
    doc.line(ox - 2, oy, ox + dw2 + 2, oy);
    doc.line(ox - 2, oy + dh2, ox + dw2 + 2, oy + dh2);

    for (let i = 0; i < result.cantVigas; i++) {
      const bx = ox + i * pitch * scale;
      doc.setFillColor(0, 133, 119);
      doc.rect(bx, oy + 1, beamWm * scale, dh2 - 2, "F");
    }
  } else {
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.8);
    doc.line(ox, oy - 2, ox, oy + dh2 + 2);
    doc.line(ox + dw2, oy - 2, ox + dw2, oy + dh2 + 2);

    for (let i = 0; i < result.cantVigas; i++) {
      const by = oy + i * pitch * scale;
      doc.setFillColor(0, 133, 119);
      doc.rect(ox + 1, by, dw2 - 2, beamWm * scale, "F");
    }
  }

  // Dimension labels
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.text(`${anchoMm} mm`, ox + dw2 / 2, oy - 6, { align: "center" });
  doc.text(`${altoMm} mm`, ox - 6, oy + dh2 / 2, { align: "center", angle: 90 });

  // Legend
  y = oy + dh2 + 10;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("█ Vigas WPC    ── Tubos H°    Sep. real: " + result.separacionReal + " mm", ox, y);

  // Footer
  y += 12;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Generado por Floortek — Calculadora Técnica de Parasoles | tiendapisos.com", 14, y);

  doc.save(`Presupuesto_Parasol_${anchoMm}x${altoMm}.pdf`);
}

// ─── Main Component ──────────────────────────────────────────────
const ParasolCalculator = () => {
  const navigate = useNavigate();
  const [anchoStr, setAnchoStr] = useState("2000");
  const [altoStr, setAltoStr] = useState("2500");
  const [beamIdx, setBeamIdx] = useState(0);
  const [gapStr, setGapStr] = useState("");
  const [mount, setMount] = useState<MountType>("piso-techo");

  const beam = BEAM_SIZES[beamIdx];
  const anchoMm = parseFloat(anchoStr) || 0;
  const altoMm = parseFloat(altoStr) || 0;
  const defaultGap = beam.w;
  const gapMm = gapStr === "" ? defaultGap : parseFloat(gapStr) || 0;

  const result = useMemo(() => {
    if (anchoMm <= 0 || altoMm <= 0) return null;
    return calcParasol(anchoMm, altoMm, beam, gapMm, mount);
  }, [anchoMm, altoMm, beam, gapMm, mount]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Parasoles
            </h1>
            <p className="text-xs text-primary-foreground/70">Calculadora Técnica</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Dimensions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dimensiones de la abertura</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Ancho (mm)</Label>
              <Input type="number" value={anchoStr} onChange={(e) => setAnchoStr(e.target.value)} min={100} />
            </div>
            <div>
              <Label className="text-xs">Alto (mm)</Label>
              <Input type="number" value={altoStr} onChange={(e) => setAltoStr(e.target.value)} min={100} />
            </div>
          </CardContent>
        </Card>

        {/* Beam size */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Medida de viga WPC</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={String(beamIdx)}
              onValueChange={(v) => {
                const idx = Number(v);
                setBeamIdx(idx);
                setGapStr(""); // reset gap to default
              }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {BEAM_SIZES.map((b, i) => (
                <Label
                  key={i}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    beamIdx === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <RadioGroupItem value={String(i)} />
                  <span className="text-sm font-medium">{b.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Gap */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Separación entre vigas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs">Separación (mm)</Label>
                <Input
                  type="number"
                  value={gapStr}
                  onChange={(e) => setGapStr(e.target.value)}
                  placeholder={`${defaultGap} (estándar)`}
                  min={5}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Estándar: {defaultGap} mm (igual a la vista)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mount type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tipo de agarre</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={mount} onValueChange={(v) => setMount(v as MountType)} className="grid grid-cols-2 gap-3">
              <Label className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${mount === "piso-techo" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                <RadioGroupItem value="piso-techo" />
                <span className="text-sm font-semibold">Piso y Techo</span>
                <span className="text-xs text-muted-foreground text-center">Vigas verticales con estructura arriba y abajo</span>
              </Label>
              <Label className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${mount === "lateral" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                <RadioGroupItem value="lateral" />
                <span className="text-sm font-semibold">Lateral</span>
                <span className="text-xs text-muted-foreground text-center">Vigas horizontales con estructura a los costados</span>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Resumen de Materiales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/5 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{result.cantVigas}</p>
                    <p className="text-xs text-muted-foreground">Vigas WPC</p>
                    <p className="text-xs font-medium">{result.mlVigas} ml</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{result.cantTubosHierro}</p>
                    <p className="text-xs text-muted-foreground">Tubos de hierro</p>
                    <p className="text-xs font-medium">{result.mlTubosHierro} ml</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{result.cantPlanchuelas}</p>
                    <p className="text-xs text-muted-foreground">Planchuelas H°</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{result.cantTornillos}</p>
                    <p className="text-xs text-muted-foreground">Tornillos</p>
                  </div>
                </div>
                {result.separacionReal !== gapMm && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Separación real ajustada: <span className="font-semibold">{result.separacionReal} mm</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Scheme */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Esquema de Instalación</CardTitle>
              </CardHeader>
              <CardContent>
                <ParasolScheme
                  anchoMm={anchoMm}
                  altoMm={altoMm}
                  beam={beam}
                  gapMm={gapMm}
                  mount={mount}
                  result={result}
                />
              </CardContent>
            </Card>

            {/* PDF */}
            <Button
              className="w-full"
              size="lg"
              onClick={() => exportParasolPDF(anchoMm, altoMm, beam, gapMm, mount, result)}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
          </>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        Floortek — tiendapisos.com
      </footer>
    </div>
  );
};

export default ParasolCalculator;
