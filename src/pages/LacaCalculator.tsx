import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Droplets, Download } from "lucide-react";
import jsPDF from "jspdf";

// ─── Product Catalog ─────────────────────────────────────────────
interface Product {
  id: string;
  label: string;
  needsSealer: boolean; // requires 1 coat X320 sealer
  coats: number;        // coats of the product itself
}

const PRODUCTS: Product[] = [
  { id: "future",  label: "Future",  needsSealer: true,  coats: 2 },
  { id: "x96",     label: "X96",     needsSealer: true,  coats: 2 },
  { id: "xpower",  label: "X Power", needsSealer: true,  coats: 2 },
  { id: "x98",     label: "X98",     needsSealer: true,  coats: 2 },
  { id: "xzero",   label: "Xzero",   needsSealer: false, coats: 2 },
  { id: "xpure",   label: "Xpure",   needsSealer: false, coats: 2 },
];

const COVERAGE_MIN = 10; // m² per liter per coat (max consumption)
const COVERAGE_MAX = 12; // m² per liter per coat (min consumption)
const DRUM_LITERS = 5;

function calcLiters(m2: number, coats: number, coveragePerLiter: number) {
  if (m2 <= 0) return 0;
  return (m2 / coveragePerLiter) * coats;
}

function calcDrums(liters: number) {
  return Math.ceil(liters / DRUM_LITERS);
}

// ─── Component ───────────────────────────────────────────────────
const LacaCalculator = () => {
  const navigate = useNavigate();
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [m2, setM2] = useState("");

  const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0];
  const area = parseFloat(m2) || 0;

  const results = useMemo(() => {
    if (area <= 0) return null;

    // Sealer (1 coat if needed)
    const sealerLitersMin = product.needsSealer ? calcLiters(area, 1, COVERAGE_MAX) : 0;
    const sealerLitersMax = product.needsSealer ? calcLiters(area, 1, COVERAGE_MIN) : 0;

    // Lacquer (2 coats)
    const lacquerLitersMin = calcLiters(area, product.coats, COVERAGE_MAX);
    const lacquerLitersMax = calcLiters(area, product.coats, COVERAGE_MIN);

    return {
      sealerLitersMin,
      sealerLitersMax,
      sealerDrumsMin: calcDrums(sealerLitersMin),
      sealerDrumsMax: calcDrums(sealerLitersMax),
      lacquerLitersMin,
      lacquerLitersMax,
      lacquerDrumsMin: calcDrums(lacquerLitersMin),
      lacquerDrumsMax: calcDrums(lacquerLitersMax),
      totalLitersMin: sealerLitersMin + lacquerLitersMin,
      totalLitersMax: sealerLitersMax + lacquerLitersMax,
      totalDrumsMin: calcDrums(sealerLitersMin) + calcDrums(lacquerLitersMin),
      totalDrumsMax: calcDrums(sealerLitersMax) + calcDrums(lacquerLitersMax),
    };
  }, [area, product]);

  // ─── PDF Export ──────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!results) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(0, 133, 119);
    doc.rect(0, 0, pw, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("LACA PALLMANN", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Cálculo de Materiales", 14, 24);
    const today = new Date().toLocaleDateString("es-AR");
    doc.setFontSize(9);
    doc.text(today, pw - 14, 16, { align: "right" });

    let y = 44;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Datos", 14, y); y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Superficie: ${area} m²`, 14, y); y += 6;
    doc.text(`Producto: ${product.label}`, 14, y); y += 6;
    doc.text(`Sellador X320: ${product.needsSealer ? "Sí (1 mano)" : "No"}`, 14, y); y += 6;
    doc.text(`Manos de laca: ${product.coats}`, 14, y); y += 12;

    // Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resultado", 14, y); y += 8;

    const headers = ["Material", "Mín. Litros", "Mín. Bidones", "Máx. Litros", "Máx. Bidones"];
    const colX = [14, 60, 90, 120, 155];

    // Header row
    doc.setFillColor(0, 133, 119);
    doc.rect(12, y - 4, pw - 24, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    y += 8;

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");

    if (product.needsSealer) {
      doc.text("Sellador X320", colX[0], y);
      doc.text(results.sealerLitersMin.toFixed(2), colX[1], y);
      doc.text(String(results.sealerDrumsMin), colX[2], y);
      doc.text(results.sealerLitersMax.toFixed(2), colX[3], y);
      doc.text(String(results.sealerDrumsMax), colX[4], y);
      y += 7;
    }

    doc.text(`Laca ${product.label}`, colX[0], y);
    doc.text(results.lacquerLitersMin.toFixed(2), colX[1], y);
    doc.text(String(results.lacquerDrumsMin), colX[2], y);
    doc.text(results.lacquerLitersMax.toFixed(2), colX[3], y);
    doc.text(String(results.lacquerDrumsMax), colX[4], y);
    y += 8;

    // Total row
    doc.setFillColor(0, 133, 119);
    doc.rect(12, y - 4, pw - 24, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", colX[0], y);
    doc.text(results.totalLitersMin.toFixed(2), colX[1], y);
    doc.text(String(results.totalDrumsMin), colX[2], y);
    doc.text(results.totalLitersMax.toFixed(2), colX[3], y);
    doc.text(String(results.totalDrumsMax), colX[4], y);
    y += 14;

    // Note
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Rendimiento: ${COVERAGE_MIN}–${COVERAGE_MAX} m²/litro/mano — Bidones de ${DRUM_LITERS} litros`, 14, y);
    y += 5;
    doc.text("Mín. = máximo rendimiento (12 m²/l) · Máx. = mínimo rendimiento (10 m²/l)", 14, y);
    y += 10;
    doc.text("Generado por Floortek — Cotizador de Laca Pallmann | tiendapisos.com", 14, y);

    doc.save(`Laca_${product.label}_${area}m2.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              LACA PALLMANN
            </h1>
            <p className="text-xs text-primary-foreground/70">Cálculo de Materiales</p>
          </div>
          {results && (
            <Button size="sm" variant="secondary" onClick={handleExportPDF} className="gap-1.5">
              <Download className="w-4 h-4" />
              PDF
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Inputs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              Datos de Aplicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Superficie (m²)</Label>
              <Input
                type="number"
                step="0.01"
                value={m2}
                onChange={(e) => setM2(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label className="text-xs">Producto de Acabado</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label} {p.needsSealer ? "(+ sellador X320)" : "(sin sellador)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg px-3 py-2.5 text-xs text-muted-foreground space-y-0.5">
              <p className="font-medium text-foreground text-sm">{product.label}</p>
              <p>{product.needsSealer ? "1 mano sellador X320 + 2 manos laca" : "2 manos de laca (sin sellador)"}</p>
              <p>Rendimiento: {COVERAGE_MIN}–{COVERAGE_MAX} m²/litro/mano — Bidones de {DRUM_LITERS} L</p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Table header */}
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground mb-1 px-1">
                <span>Material</span>
                <span className="text-center">Máx. rendimiento</span>
                <span className="text-center">Mín. rendimiento</span>
              </div>

              <div className="space-y-1 mb-4">
                {product.needsSealer && (
                  <div className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-border/50 px-1">
                    <span className="text-muted-foreground">Sellador X320</span>
                    <span className="text-center">{results.sealerLitersMin.toFixed(2)} L ({results.sealerDrumsMin} bid.)</span>
                    <span className="text-center">{results.sealerLitersMax.toFixed(2)} L ({results.sealerDrumsMax} bid.)</span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-border/50 px-1">
                  <span className="text-muted-foreground">Laca {product.label}</span>
                  <span className="text-center">{results.lacquerLitersMin.toFixed(2)} L ({results.lacquerDrumsMin} bid.)</span>
                  <span className="text-center">{results.lacquerLitersMax.toFixed(2)} L ({results.lacquerDrumsMax} bid.)</span>
                </div>
              </div>

              <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Máx. rendimiento (12 m²/l)</p>
                    <p className="text-2xl font-bold text-foreground">{results.totalLitersMin.toFixed(1)} L</p>
                    <p className="text-sm text-muted-foreground">{results.totalDrumsMin} bidones</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mín. rendimiento (10 m²/l)</p>
                    <p className="text-2xl font-bold text-foreground">{results.totalLitersMax.toFixed(1)} L</p>
                    <p className="text-sm text-muted-foreground">{results.totalDrumsMax} bidones</p>
                  </div>
                </div>
              </div>

              <Button className="w-full gap-2 mt-4" onClick={handleExportPDF}>
                <Download className="w-4 h-4" />
                Descargar PDF
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

export default LacaCalculator;
