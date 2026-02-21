import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  X,
  Wallpaper,
  Calculator,
  Download,
  MessageCircle,
} from "lucide-react";
import jsPDF from "jspdf";

// ─── Product Catalog ─────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  line: string;
  category: "interior" | "exterior";
  widthMm: number;
  lengthMm: number;
  m2PerUnit: number;
  unitsPerPack: number;
  tone: string;
}

const PRODUCTS: Product[] = [
  // ─── Interior ────────────────────
  { id: "wide-roble-natural", name: "Wide Roble Natural", line: "Wide", category: "interior", widthMm: 120, lengthMm: 2750, m2PerUnit: 0.33, unitsPerPack: 1, tone: "Marrón claro" },
  { id: "flat-negro", name: "Flat Negro", line: "Flat", category: "interior", widthMm: 122, lengthMm: 2850, m2PerUnit: 0.3477, unitsPerPack: 1, tone: "Negro" },
  { id: "sharp-forest-25", name: "Sharp Forest 25cm", line: "Sharp", category: "interior", widthMm: 250, lengthMm: 2850, m2PerUnit: 0.7125, unitsPerPack: 1, tone: "Marrón oscuro" },
  { id: "sharp-nature-25", name: "Sharp Nature 25cm", line: "Sharp", category: "interior", widthMm: 250, lengthMm: 2850, m2PerUnit: 0.7125, unitsPerPack: 1, tone: "Marrón claro" },
  { id: "flat-3d-verde-aqua", name: "Flat 3D Verde Aqua", line: "Flat 3D", category: "interior", widthMm: 122, lengthMm: 2850, m2PerUnit: 0.3477, unitsPerPack: 1, tone: "Verde Aqua" },
  { id: "interior-incienso", name: "Incienso", line: "Tradicional", category: "interior", widthMm: 120, lengthMm: 2750, m2PerUnit: 0.33, unitsPerPack: 1, tone: "Marrón oscuro" },
  { id: "elite-roble", name: "Elite Pannel Skin Roble", line: "Elite Pannel Skin", category: "interior", widthMm: 120, lengthMm: 2900, m2PerUnit: 0.348, unitsPerPack: 1, tone: "Marrón claro" },
  { id: "elite-incienso", name: "Elite Pannel Skin Incienso", line: "Elite Pannel Skin", category: "interior", widthMm: 120, lengthMm: 2900, m2PerUnit: 0.348, unitsPerPack: 1, tone: "Marrón oscuro" },
  { id: "elite-gris-onix", name: "Elite Pannel Skin Gris Onix", line: "Elite Pannel Skin", category: "interior", widthMm: 120, lengthMm: 2900, m2PerUnit: 0.348, unitsPerPack: 1, tone: "Grisáceo" },
  { id: "elite-blanco-perla", name: "Elite Pannel Skin Blanco Perla", line: "Elite Pannel Skin", category: "interior", widthMm: 120, lengthMm: 2900, m2PerUnit: 0.348, unitsPerPack: 1, tone: "Beige" },
  { id: "slim-blanco-mate", name: "Slim Blanco Mate", line: "Slim", category: "interior", widthMm: 120, lengthMm: 2750, m2PerUnit: 0.33, unitsPerPack: 1, tone: "Blanco" },
  { id: "slim-roble-natural", name: "Slim Roble Natural", line: "Slim", category: "interior", widthMm: 120, lengthMm: 2750, m2PerUnit: 0.33, unitsPerPack: 1, tone: "Marrón claro" },
  // ─── Exterior ────────────────────
  { id: "ext-g02-antique", name: "Co-Extruded G02 Antique", line: "Co-Extruded Stretch", category: "exterior", widthMm: 219, lengthMm: 2900, m2PerUnit: 0.6, unitsPerPack: 2, tone: "Grisáceo" },
  { id: "ext-g10-ipe", name: "Co-Extruded G10 Ipe", line: "Co-Extruded Stretch", category: "exterior", widthMm: 219, lengthMm: 2900, m2PerUnit: 0.6, unitsPerPack: 2, tone: "Marrón oscuro" },
  { id: "ext-g07-charcoal", name: "Co-Extruded G07 Charcoal", line: "Co-Extruded Stretch", category: "exterior", widthMm: 219, lengthMm: 2900, m2PerUnit: 0.6, unitsPerPack: 2, tone: "Negro" },
  { id: "ext-g04-teak", name: "Co-Extruded G04 Teak", line: "Co-Extruded Stretch", category: "exterior", widthMm: 219, lengthMm: 2900, m2PerUnit: 0.6, unitsPerPack: 2, tone: "Marrón claro" },
  { id: "ext-g06-silver-grey", name: "Co-Extruded G06 Silver Grey", line: "Co-Extruded Stretch", category: "exterior", widthMm: 219, lengthMm: 2900, m2PerUnit: 0.6, unitsPerPack: 2, tone: "Gris plateado" },
  { id: "ext-g01-white-oak", name: "Co-Extruded G01 White Oak", line: "Co-Extruded Stretch", category: "exterior", widthMm: 219, lengthMm: 2900, m2PerUnit: 0.6, unitsPerPack: 2, tone: "Blanco" },
];

// ─── Types ───────────────────────────────────────────────────────
interface Room {
  id: number;
  name: string;
  ancho: string;
  alto: string;
}

type InputMode = "total" | "medidas";

// ─── Main Component ──────────────────────────────────────────────
const RevestimientosCalculator = () => {
  const navigate = useNavigate();

  // Product
  const [categoryFilter, setCategoryFilter] = useState<"interior" | "exterior">("interior");
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0];

  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>("medidas");

  // Total m² mode
  const [totalM2Str, setTotalM2Str] = useState("");

  // Por Medidas mode
  const [rooms, setRooms] = useState<Room[]>([{ id: 1, name: "Ambiente 1", ancho: "", alto: "" }]);
  const [nextRoomId, setNextRoomId] = useState(2);

  // Options
  const [includeWaste, setIncludeWaste] = useState(false);
  const wastePercent = 10;

  // Filter products by category
  const filteredProducts = PRODUCTS.filter((p) => p.category === categoryFilter);

  const handleCategoryChange = (cat: "interior" | "exterior") => {
    setCategoryFilter(cat);
    const first = PRODUCTS.find((p) => p.category === cat);
    if (first) setProductId(first.id);
  };

  // Room management
  const addRoom = () => {
    setRooms((prev) => [...prev, { id: nextRoomId, name: `Ambiente ${nextRoomId}`, ancho: "", alto: "" }]);
    setNextRoomId((n) => n + 1);
  };
  const removeRoom = (id: number) => {
    if (rooms.length <= 1) return;
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };
  const updateRoom = (id: number, field: "ancho" | "alto", value: string) => {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  // ─── Calculations ──────────────────────────────────────────────
  const calc = useMemo(() => {
    let baseM2 = 0;
    if (inputMode === "total") {
      baseM2 = parseFloat(totalM2Str) || 0;
    } else {
      baseM2 = rooms.reduce((sum, r) => {
        const w = parseFloat(r.ancho) || 0;
        const h = parseFloat(r.alto) || 0;
        return sum + w * h;
      }, 0);
    }

    const wasteM2 = includeWaste ? baseM2 * (wastePercent / 100) : 0;
    const totalM2 = baseM2 + wasteM2;
    const totalUnits = product.m2PerUnit > 0 ? Math.ceil(totalM2 / product.m2PerUnit) : 0;
    const totalPacks = Math.ceil(totalUnits / product.unitsPerPack);
    const materialM2 = totalUnits * product.m2PerUnit;

    return { baseM2, wasteM2, totalM2, totalUnits, totalPacks, materialM2 };
  }, [inputMode, totalM2Str, rooms, product, includeWaste, wastePercent]);

  const roomData = rooms.map((r) => {
    const w = parseFloat(r.ancho) || 0;
    const h = parseFloat(r.alto) || 0;
    return { ...r, area: w * h };
  });

  const hasData = calc.baseM2 > 0;
  const packLabel = product.unitsPerPack > 1 ? `Pack x${product.unitsPerPack}` : "Panel";

  // ─── PDF Export with wall diagram ──────────────────────────────
  const handleExportPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(0, 133, 119);
    doc.rect(0, 0, pw, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("REVESTIMIENTOS", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Esquema de Materiales", 14, 24);
    const today = new Date().toLocaleDateString("es-AR");
    doc.setFontSize(9);
    doc.text(today, pw - 14, 16, { align: "right" });

    let y = 44;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Producto", 14, y); y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${product.name} — Línea ${product.line}`, 14, y); y += 6;
    doc.text(`Medida: ${product.widthMm}mm × ${product.lengthMm}mm | ${product.m2PerUnit} m²/panel`, 14, y); y += 6;
    doc.text(`Uso: ${product.category === "interior" ? "Interior" : "Exterior"} | Tono: ${product.tone}`, 14, y); y += 10;

    // Surfaces breakdown
    if (inputMode === "medidas") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Superficies", 14, y); y += 8;
      roomData.filter((r) => r.area > 0).forEach((r) => {
        const rw = parseFloat(r.ancho) || 0;
        const rh = parseFloat(r.alto) || 0;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`${r.name}: ${rw}m × ${rh}m = ${r.area.toFixed(2)} m²`, 14, y); y += 6;
      });
      y += 4;
    }

    // Summary table (no prices)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resumen de Materiales", 14, y); y += 8;

    const rows = [
      ["Concepto", "Valor"],
      ["Superficie base", `${calc.baseM2.toFixed(2)} m²`],
      ...(includeWaste ? [[`+ ${wastePercent}% desperdicio`, `${calc.wasteM2.toFixed(2)} m²`]] : []),
      ["Superficie total", `${calc.totalM2.toFixed(2)} m²`],
      ["Paneles necesarios", `${calc.totalUnits}`],
      [`${packLabel}s a comprar`, `${calc.totalPacks}`],
      ["Material total", `${calc.materialM2.toFixed(2)} m²`],
    ];

    doc.setFontSize(10);
    rows.forEach((row, i) => {
      if (i === 0) {
        doc.setFillColor(0, 133, 119);
        doc.rect(12, y - 4, pw - 24, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
        if (i % 2 === 0) {
          doc.setFillColor(240, 248, 246);
          doc.rect(12, y - 4, pw - 24, 7, "F");
        }
      }
      doc.text(row[0], 14, y);
      doc.text(row[1], pw - 14, y, { align: "right" });
      y += 7;
    });

    // ─── Wall Panel Layout Diagrams ───────────────────────────────
    const panelWidthM = product.widthMm / 1000;
    const panelLengthM = product.lengthMm / 1000;

    const wallsToDraw = inputMode === "medidas"
      ? roomData.filter((r) => r.area > 0).map((r) => ({
          label: r.name,
          width: parseFloat(r.ancho) || 0,
          height: parseFloat(r.alto) || 0,
        }))
      : [];

    if (wallsToDraw.length > 0) {
      wallsToDraw.forEach((wall) => {
        // Check page space
        const maxDiagH = 80;
        if (y + maxDiagH + 20 > ph - 20) {
          doc.addPage();
          y = 20;
        }

        y += 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(`Esquema: ${wall.label} (${wall.width}m × ${wall.height}m)`, 14, y);
        y += 6;

        const maxW = pw - 28;
        const maxH = 70;
        const scale = Math.min(maxW / wall.width, maxH / wall.height);
        const dw = wall.width * scale;
        const dh = wall.height * scale;
        const ox = 14 + (maxW - dw) / 2;
        const oy = y;

        // Wall background
        doc.setFillColor(235, 235, 230);
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.4);
        doc.rect(ox, oy, dw, dh, "FD");

        // Draw panels (vertical strips)
        const panelW = panelWidthM * scale;
        const panelH = panelLengthM * scale;
        const gap = 0.5; // mm gap between panels in diagram

        let col = 0;
        let px = 0;
        while (px < wall.width - 0.001) {
          const thisW = Math.min(panelWidthM, wall.width - px);
          const thisPxW = thisW * scale;

          let row = 0;
          let py = 0;
          while (py < wall.height - 0.001) {
            const thisH = Math.min(panelLengthM, wall.height - py);
            const thisPxH = thisH * scale;

            // Alternate colors for visual clarity
            const shade = (col + row) % 2 === 0;
            doc.setFillColor(shade ? 190 : 170, shade ? 160 : 140, shade ? 120 : 100);
            doc.setDrawColor(60, 50, 40);
            doc.setLineWidth(0.2);
            doc.rect(
              ox + px * scale + gap / 2,
              oy + py * scale + gap / 2,
              thisPxW - gap,
              thisPxH - gap,
              "FD"
            );

            py += panelLengthM;
            row++;
          }
          px += panelWidthM;
          col++;
        }

        // Outline on top
        doc.setDrawColor(0, 133, 119);
        doc.setLineWidth(0.6);
        doc.rect(ox, oy, dw, dh, "S");

        // Dimension labels
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "normal");
        doc.text(`${wall.width} m`, ox + dw / 2, oy - 2, { align: "center" });
        doc.text(`${wall.height} m`, ox - 4, oy + dh / 2, { align: "center", angle: 90 });

        // Panel count for this wall
        const wallPanels = Math.ceil(wall.width * wall.height / product.m2PerUnit);
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`${wallPanels} paneles — ${panelWidthM * 1000}mm × ${panelLengthM * 1000}mm c/u`, ox, oy + dh + 5);

        y = oy + dh + 10;
      });
    }

    // Footer
    y += 8;
    if (y > ph - 15) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por Floortek — Cotizador de Revestimientos | tiendapisos.com", 14, y);

    doc.save(`Revestimientos_${product.name.replace(/\s/g, "_")}_${calc.totalM2.toFixed(0)}m2.pdf`);
  };

  // WhatsApp (no prices)
  const handleWhatsApp = () => {
    const text = `Hola, estoy cotizando *${product.name}* (${product.category === "interior" ? "Interior" : "Exterior"}).%0A` +
      `Superficie: ${calc.totalM2.toFixed(2)} m²%0A` +
      `Paneles: ${calc.totalUnits}%0A` +
      `${packLabel}s: ${calc.totalPacks}`;
    window.open(`https://wa.me/5491122393653?text=${text}`, "_blank");
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
              REVESTIMIENTOS
            </h1>
            <p className="text-xs text-primary-foreground/70">Cotizador de Materiales</p>
          </div>
          {hasData && (
            <Button size="sm" variant="secondary" onClick={handleExportPDF} className="gap-1.5">
              <Download className="w-4 h-4" />
              PDF
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Category + Product selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallpaper className="w-4 h-4 text-primary" />
              Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs value={categoryFilter} onValueChange={(v) => handleCategoryChange(v as "interior" | "exterior")}>
              <TabsList className="w-full">
                <TabsTrigger value="interior" className="flex-1">Interior</TabsTrigger>
                <TabsTrigger value="exterior" className="flex-1">Exterior</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.tone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="bg-muted/50 rounded-lg px-3 py-2.5 text-xs text-muted-foreground space-y-0.5">
              <p className="font-medium text-foreground text-sm">
                {product.name} <span className="text-muted-foreground font-normal">— Línea {product.line}</span>
              </p>
              <p>
                Medida: {product.widthMm}mm × {product.lengthMm}mm | {product.m2PerUnit} m²/panel
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Calculator */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Cotizador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
              <TabsList className="w-full">
                <TabsTrigger value="total" className="flex-1">M² Totales</TabsTrigger>
                <TabsTrigger value="medidas" className="flex-1">Por Medidas</TabsTrigger>
              </TabsList>

              <TabsContent value="total" className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Área a cubrir</Label>
                  <p className="text-xs text-muted-foreground mb-2">Ingresá los m² totales de la superficie.</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={totalM2Str}
                    onChange={(e) => setTotalM2Str(e.target.value)}
                    placeholder="Ej: 12.5"
                  />
                </div>
              </TabsContent>

              <TabsContent value="medidas" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">Medidas lineales.</p>
                {rooms.map((r) => (
                  <div key={r.id} className="flex items-end gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Ancho (m)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={r.ancho}
                          onChange={(e) => updateRoom(r.id, "ancho", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Alto (m)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={r.alto}
                          onChange={(e) => updateRoom(r.id, "alto", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    {rooms.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeRoom(r.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addRoom} className="gap-1 text-xs w-full">
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Ambiente
                </Button>
              </TabsContent>
            </Tabs>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <Checkbox
                checked={includeWaste}
                onCheckedChange={(checked) => setIncludeWaste(checked === true)}
              />
              <span className="text-sm">Incluir {wastePercent}% extra por recortes</span>
            </label>
          </CardContent>
        </Card>

        {/* Results */}
        {hasData && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen estimado</CardTitle>
            </CardHeader>
            <CardContent>
              {inputMode === "medidas" && (
                <div className="space-y-1 mb-4">
                  {roomData
                    .filter((r) => r.area > 0)
                    .map((r) => (
                      <div
                        key={r.id}
                        className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0"
                      >
                        <span className="text-muted-foreground">
                          {r.name}: {parseFloat(r.ancho) || 0}m × {parseFloat(r.alto) || 0}m
                        </span>
                        <span className="font-medium">{r.area.toFixed(2)} m²</span>
                      </div>
                    ))}
                </div>
              )}

              <div className="bg-accent/50 rounded-lg p-4 space-y-2.5">
                <div className="text-center pb-2 border-b border-border/50">
                  <p className="text-3xl font-bold text-foreground">{calc.totalPacks} {packLabel}{calc.totalPacks !== 1 ? "s" : ""}</p>
                  <p className="text-sm text-muted-foreground">{calc.totalUnits} paneles</p>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cubriendo:</span>
                  <span>{calc.baseM2.toFixed(2)}m²</span>
                </div>
                {includeWaste && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">+ {wastePercent}% Desp.:</span>
                    <span className="font-semibold">{calc.totalM2.toFixed(2)}m²</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Material Total:</span>
                  <span>{calc.materialM2.toFixed(2)}m²</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button className="flex-1 gap-2" onClick={handleWhatsApp}>
                  <MessageCircle className="w-4 h-4" />
                  Consultar Asesor
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={handleExportPDF}>
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
              </div>
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

export default RevestimientosCalculator;
