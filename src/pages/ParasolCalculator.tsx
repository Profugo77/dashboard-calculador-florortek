import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Calculator, Download, RotateCw, Info } from "lucide-react";
import jsPDF from "jspdf";

// ─── Types ───────────────────────────────────────────────────────
type MountType = "piso-techo" | "giratorio";

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

const BEAM_STOCK_LENGTH = 2900; // mm

// ─── Calculation ─────────────────────────────────────────────────
const TUBO_MIN_INSIDE = 400; // mm — mínimo dentro de cada viga

interface ParasolResult {
  cantVigas: number;
  vigasPorUnidad: number;
  stockUnits: number;
  mlVigas: number;
  cantPlanchuelas: number; // planchuelas de hierro (barras horizontales de estructura)
  mlPlanchuelas: number;
  cantTubos: number; // tubos de hierro que entran dentro de cada viga (2 por viga)
  mlTubos: number;
  cantPivotes: number;
  cantTornillos: number;
  separacionReal: number;
  maxGapCiega: number;
  puedeSerCiega: boolean;
}

function calcParasol(
  anchoMm: number,
  altoMm: number,
  beam: BeamSize,
  gapMm: number,
  mount: MountType
): ParasolResult {
  const isGiratorio = mount === "giratorio";
  const isVertical = mount === "piso-techo" || mount === "giratorio";

  const distDim = isVertical ? anchoMm : altoMm;
  const beamLengthMm = isVertical ? altoMm : anchoMm;

  const pitch = beam.w + gapMm;
  const cantVigas = Math.floor(distDim / pitch) + 1;

  const usedWidth = cantVigas * beam.w + (cantVigas - 1) * gapMm;
  const separacionReal = cantVigas > 1 ? gapMm + (distDim - usedWidth) / (cantVigas - 1) : gapMm;

  const vigasPorUnidad = Math.floor(BEAM_STOCK_LENGTH / beamLengthMm);
  const stockUnits = vigasPorUnidad > 0 ? Math.ceil(cantVigas / vigasPorUnidad) : cantVigas;

  const mlVigas = cantVigas * (beamLengthMm / 1000);

  const maxGapCiega = beam.h - beam.w;
  const puedeSerCiega = gapMm <= maxGapCiega;

  let cantPlanchuelas = 0;
  let mlPlanchuelas = 0;
  let cantTubos = 0;
  let mlTubos = 0;
  let cantPivotes = 0;

  if (isGiratorio) {
    cantPivotes = cantVigas * 2;
  } else {
    // 2 planchuelas horizontales de estructura (arriba y abajo)
    cantPlanchuelas = 2;
    mlPlanchuelas = Math.round(cantPlanchuelas * (distDim / 1000) * 100) / 100;
    // 2 tubos por viga (arriba y abajo), cada uno entra mín 40cm dentro de la viga
    cantTubos = cantVigas * 2;
    mlTubos = Math.round(cantTubos * (TUBO_MIN_INSIDE / 1000) * 100) / 100;
  }

  const cantTornillos = isGiratorio ? cantPivotes * 2 : cantTubos * 2;

  return {
    cantVigas,
    vigasPorUnidad: vigasPorUnidad > 0 ? vigasPorUnidad : 1,
    stockUnits,
    mlVigas: Math.round(mlVigas * 100) / 100,
    cantPlanchuelas,
    mlPlanchuelas,
    cantTubos,
    mlTubos,
    cantPivotes,
    cantTornillos,
    separacionReal: Math.round(separacionReal * 10) / 10,
    maxGapCiega,
    puedeSerCiega,
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
  const padding = 44;
  const maxSvgW = 500;
  const maxSvgH = 400;

  const scaleX = (maxSvgW - padding * 2) / anchoMm;
  const scaleY = (maxSvgH - padding * 2) / altoMm;
  const scale = Math.min(scaleX, scaleY);

  const dw = anchoMm * scale;
  const dh = altoMm * scale;
  const svgW = dw + padding * 2;
  const svgH = dh + padding * 2 + 24;
  const ox = padding;
  const oy = padding;

  const isVertical = mount === "piso-techo" || mount === "giratorio";
  const isGiratorio = mount === "giratorio";

  const beamRects: { x: number; y: number; w: number; h: number }[] = [];
  const pitch = beam.w + gapMm;

  if (isVertical) {
    for (let i = 0; i < result.cantVigas; i++) {
      beamRects.push({
        x: ox + i * pitch * scale,
        y: oy,
        w: beam.w * scale,
        h: dh,
      });
    }
  } else {
    for (let i = 0; i < result.cantVigas; i++) {
      beamRects.push({
        x: ox,
        y: oy + i * pitch * scale,
        w: dw,
        h: beam.w * scale,
      });
    }
  }

  const ironT = 4;
  const pivotR = 3.5;

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="border rounded-lg bg-muted/30">
      {/* Structure / pivots */}
      {isGiratorio ? (
        <>
          {/* Pivot circles at top and bottom of each beam */}
          {beamRects.map((b, i) => (
            <g key={`piv-${i}`}>
              <circle cx={b.x + b.w / 2} cy={oy - 6} r={pivotR} fill="hsl(var(--foreground))" opacity={0.5} />
              <circle cx={b.x + b.w / 2} cy={oy + dh + 6} r={pivotR} fill="hsl(var(--foreground))" opacity={0.5} />
              {/* tiny line connecting pivot to beam */}
              <line x1={b.x + b.w / 2} y1={oy - 6 + pivotR} x2={b.x + b.w / 2} y2={oy} stroke="hsl(var(--foreground))" strokeWidth={0.5} opacity={0.3} />
              <line x1={b.x + b.w / 2} y1={oy + dh} x2={b.x + b.w / 2} y2={oy + dh + 6 - pivotR} stroke="hsl(var(--foreground))" strokeWidth={0.5} opacity={0.3} />
            </g>
          ))}
          {/* Floor/ceiling lines */}
          <line x1={ox - 8} y1={oy - 10} x2={ox + dw + 8} y2={oy - 10} stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.4} />
          <line x1={ox - 8} y1={oy + dh + 10} x2={ox + dw + 8} y2={oy + dh + 10} stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.4} />
        </>
      ) : isVertical ? (
        <>
          <rect x={ox - 6} y={oy - ironT - 2} width={dw + 12} height={ironT} rx={1} fill="hsl(var(--muted-foreground))" opacity={0.6} />
          <rect x={ox - 6} y={oy + dh + 2} width={dw + 12} height={ironT} rx={1} fill="hsl(var(--muted-foreground))" opacity={0.6} />
          {beamRects.map((b, i) => (
            <rect key={`pt-${i}`} x={b.x - 1} y={oy - ironT - 6} width={b.w + 2} height={4} fill="hsl(var(--muted-foreground))" opacity={0.4} rx={0.5} />
          ))}
          {beamRects.map((b, i) => (
            <rect key={`pb-${i}`} x={b.x - 1} y={oy + dh + ironT + 2} width={b.w + 2} height={4} fill="hsl(var(--muted-foreground))" opacity={0.4} rx={0.5} />
          ))}
        </>
      ) : (
        <>
          <rect x={ox - ironT - 2} y={oy - 6} width={ironT} height={dh + 12} rx={1} fill="hsl(var(--muted-foreground))" opacity={0.6} />
          <rect x={ox + dw + 2} y={oy - 6} width={ironT} height={dh + 12} rx={1} fill="hsl(var(--muted-foreground))" opacity={0.6} />
          {beamRects.map((b, i) => (
            <rect key={`pl-${i}`} x={ox - ironT - 6} y={b.y - 1} width={4} height={b.h + 2} fill="hsl(var(--muted-foreground))" opacity={0.4} rx={0.5} />
          ))}
          {beamRects.map((b, i) => (
            <rect key={`pr-${i}`} x={ox + dw + ironT + 2} y={b.y - 1} width={4} height={b.h + 2} fill="hsl(var(--muted-foreground))" opacity={0.4} rx={0.5} />
          ))}
        </>
      )}

      {/* WPC Beams */}
      {beamRects.map((b, i) => (
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
      {isGiratorio ? (
        <>
          <circle cx={ox + 98} cy={svgH - 15} r={3} fill="hsl(var(--foreground))" opacity={0.5} />
          <text x={ox + 106} y={svgH - 12} fontSize={9} fill="hsl(var(--muted-foreground))">Pivotes</text>
        </>
      ) : (
        <>
          <rect x={ox + 90} y={svgH - 18} width={10} height={6} fill="hsl(var(--muted-foreground))" opacity={0.6} rx={1} />
          <text x={ox + 104} y={svgH - 12} fontSize={9} fill="hsl(var(--muted-foreground))">Planchuelas H°</text>
          <rect x={ox + 185} y={svgH - 18} width={10} height={6} fill="hsl(var(--muted-foreground))" opacity={0.4} rx={1} />
          <text x={ox + 199} y={svgH - 12} fontSize={9} fill="hsl(var(--muted-foreground))">Tubos H°</text>
        </>
      )}
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

  const mountLabel = mount === "piso-techo" ? "Piso y Techo (fija)" : "Giratorio (pivotes)";

  // Config
  let y = 44;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del Proyecto", 14, y); y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Abertura: ${anchoMm} mm × ${altoMm} mm`, 14, y); y += 6;
  doc.text(`Viga WPC: ${beam.label} (vista ${beam.w} mm) — Largo stock: ${BEAM_STOCK_LENGTH} mm`, 14, y); y += 6;
  doc.text(`Separación: ${gapMm} mm | Tipo: ${mountLabel}`, 14, y); y += 6;
  if (mount === "giratorio") {
    doc.text(`Cierre completo: ${result.puedeSerCiega ? "Sí" : "No"} (máx. gap ciega: ${result.maxGapCiega} mm)`, 14, y); y += 6;
  }
  y += 6;

  // Materials table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumen de Materiales", 14, y); y += 8;

  const rows: string[][] = [
    ["Material", "Cantidad"],
    ["Vigas WPC", `${result.cantVigas} un. (${result.mlVigas} ml)`],
    ["Vigas de 2.9m a comprar", `${result.stockUnits} un. (${result.vigasPorUnidad} cortes/viga)`],
  ];
  if (mount === "giratorio") {
    rows.push(["Pivotes (piso/techo)", `${result.cantPivotes} un.`]);
  } else {
    rows.push(["Planchuelas de hierro", `${result.cantPlanchuelas} un. (${result.mlPlanchuelas} ml)`]);
    rows.push(["Tubos de hierro (mín. 40cm)", `${result.cantTubos} un. (${result.mlTubos} ml)`]);
  }
  rows.push(["Tornillos", `${result.cantTornillos} un.`]);

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
  const sX = maxDW / (anchoMm / 1000);
  const sY = maxDH / (altoMm / 1000);
  const sc = Math.min(sX, sY);
  const dw2 = (anchoMm / 1000) * sc;
  const dh2 = (altoMm / 1000) * sc;
  const ox = 14 + (maxDW - dw2) / 2;
  const oy = y;

  const pitchM = (beam.w + gapMm) / 1000;
  const beamWm = beam.w / 1000;
  const isVertical = true; // both modes are vertical now

  if (isVertical) {
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.8);
    doc.line(ox - 2, oy, ox + dw2 + 2, oy);
    doc.line(ox - 2, oy + dh2, ox + dw2 + 2, oy + dh2);

    for (let i = 0; i < result.cantVigas; i++) {
      const bx = ox + i * pitchM * sc;
      doc.setFillColor(0, 133, 119);
      doc.rect(bx, oy + 1, beamWm * sc, dh2 - 2, "F");
      if (mount === "giratorio") {
        doc.setFillColor(60, 60, 60);
        doc.circle(bx + (beamWm * sc) / 2, oy - 1, 0.8, "F");
        doc.circle(bx + (beamWm * sc) / 2, oy + dh2 + 1, 0.8, "F");
      }
    }
  } else {
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.8);
    doc.line(ox, oy - 2, ox, oy + dh2 + 2);
    doc.line(ox + dw2, oy - 2, ox + dw2, oy + dh2 + 2);

    for (let i = 0; i < result.cantVigas; i++) {
      const by = oy + i * pitchM * sc;
      doc.setFillColor(0, 133, 119);
      doc.rect(ox + 1, by, dw2 - 2, beamWm * sc, "F");
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.text(`${anchoMm} mm`, ox + dw2 / 2, oy - 6, { align: "center" });
  doc.text(`${altoMm} mm`, ox - 6, oy + dh2 / 2, { align: "center", angle: 90 });

  y = oy + dh2 + 10;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const legendText = mount === "giratorio"
    ? "█ Vigas WPC    ● Pivotes    Sep. real: " + result.separacionReal + " mm"
    : "█ Vigas WPC    ── Planchuelas H°    ▪ Tubos H°    Sep. real: " + result.separacionReal + " mm";
  doc.text(legendText, ox, y);

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

  // For giratorio: default gap = depth - face (max to allow full closure)
  const defaultGapFixed = beam.w;
  const defaultGapGiratorio = beam.h - beam.w;
  const defaultGap = mount === "giratorio" ? defaultGapGiratorio : defaultGapFixed;
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
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Ancho (mm)</Label>
                <Input type="number" value={anchoStr} onChange={(e) => setAnchoStr(e.target.value)} min={100} />
              </div>
              <div>
                <Label className="text-xs">Alto (mm)</Label>
                <Input type="number" value={altoStr} onChange={(e) => setAltoStr(e.target.value)} min={100} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Largo de viga disponible: <span className="font-semibold">{BEAM_STOCK_LENGTH} mm (2.9 m)</span>
            </p>
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
                setBeamIdx(Number(v));
                setGapStr("");
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
                  <div>
                    <span className="text-sm font-medium">{b.label}</span>
                    <span className="block text-[10px] text-muted-foreground">Vista: {b.w} mm · Prof: {b.h} mm</span>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Mount type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tipo de agarre</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={mount}
              onValueChange={(v) => {
                setMount(v as MountType);
                setGapStr("");
              }}
              className="grid grid-cols-2 gap-3"
            >
              <Label className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${mount === "piso-techo" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                <RadioGroupItem value="piso-techo" />
                <span className="text-sm font-semibold">Piso y Techo</span>
                <span className="text-xs text-muted-foreground text-center">Vigas verticales fijas con planchuelas y tubos</span>
              </Label>
              <Label className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${mount === "giratorio" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                <RadioGroupItem value="giratorio" />
                <div className="flex items-center gap-1.5">
                  <RotateCw className="w-4 h-4" />
                  <span className="text-sm font-semibold">Giratorio</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">Pivotes piso/techo, giro 360°, abierto o ciego</span>
              </Label>
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
                  placeholder={`${defaultGap} (${mount === "giratorio" ? "máx. ciega" : "estándar"})`}
                  min={1}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-4 space-y-1">
                {mount === "giratorio" ? (
                  <>
                    <p>Máx. para cierre total: <span className="font-semibold">{defaultGapGiratorio} mm</span></p>
                    <p className="text-[10px]">(profundidad {beam.h} − vista {beam.w})</p>
                  </>
                ) : (
                  <p>Estándar: {defaultGapFixed} mm (igual a la vista)</p>
                )}
              </div>
            </div>

            {mount === "giratorio" && gapMm > defaultGapGiratorio && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20">
                <Info className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  Con {gapMm} mm de separación y viga {beam.label}, <strong>no se puede lograr cierre completo</strong>. Máximo: {defaultGapGiratorio} mm.
                </p>
              </div>
            )}
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
                  <div className="bg-primary/5 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{result.stockUnits}</p>
                    <p className="text-xs text-muted-foreground">Vigas de 2.9m a comprar</p>
                    <p className="text-xs font-medium">{result.vigasPorUnidad} corte{result.vigasPorUnidad > 1 ? "s" : ""}/viga</p>
                  </div>

                  {mount === "giratorio" ? (
                    <div className="bg-muted rounded-lg p-3 text-center col-span-2">
                      <p className="text-2xl font-bold text-foreground">{result.cantPivotes}</p>
                      <p className="text-xs text-muted-foreground">Pivotes (piso + techo)</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-foreground">{result.cantPlanchuelas}</p>
                        <p className="text-xs text-muted-foreground">Planchuelas de hierro</p>
                        <p className="text-xs font-medium">{result.mlPlanchuelas} ml</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-foreground">{result.cantTubos}</p>
                        <p className="text-xs text-muted-foreground">Tubos de hierro</p>
                        <p className="text-xs font-medium">{result.mlTubos} ml ({TUBO_MIN_INSIDE / 10} cm c/u)</p>
                      </div>
                    </>
                  )}

                  <div className="bg-muted rounded-lg p-3 text-center col-span-2 sm:col-span-1">
                    <p className="text-2xl font-bold text-foreground">{result.cantTornillos}</p>
                    <p className="text-xs text-muted-foreground">Tornillos</p>
                  </div>
                </div>

                {mount === "giratorio" && (
                  <div className={`mt-3 flex items-start gap-2 p-2.5 rounded-md ${result.puedeSerCiega ? "bg-primary/5 border border-primary/20" : "bg-destructive/10 border border-destructive/20"}`}>
                    <RotateCw className={`w-4 h-4 shrink-0 mt-0.5 ${result.puedeSerCiega ? "text-primary" : "text-destructive"}`} />
                    <p className="text-xs">
                      {result.puedeSerCiega
                        ? <>Con esta configuración las vigas <strong>pueden cerrarse completamente</strong> (ciega).</>
                        : <>Con esta separación <strong>no se logra cierre total</strong>. Reducir gap a ≤ {result.maxGapCiega} mm.</>
                      }
                    </p>
                  </div>
                )}

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
