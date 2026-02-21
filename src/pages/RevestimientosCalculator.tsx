import { useState, useEffect } from "react";
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Wallpaper,
  Package,
  Calculator,
  Download,
  Settings2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import jsPDF from "jspdf";

// ─── Types ───────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  plateW: number; // ancho placa (m)
  plateH: number; // alto placa (m)
  usefulArea: number; // superficie útil por placa (m²) — puede diferir de plateW*plateH por solape
  orientation: "vertical" | "horizontal";
  adhesivePerPlate: number; // cartuchos de adhesivo por placa
  clipsPerPlate: number; // clips/fijaciones por placa
}

interface Wall {
  id: number;
  name: string;
  ancho: string;
  alto: string;
}

const LS_KEY = "floortek_revestimientos_products";

function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveProducts(products: Product[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(products));
}

// ─── Product Form ────────────────────────────────────────────────
function ProductForm({
  onSave,
  onCancel,
  initial,
}: {
  onSave: (p: Omit<Product, "id">) => void;
  onCancel: () => void;
  initial?: Product;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [plateW, setPlateW] = useState(initial?.plateW?.toString() ?? "");
  const [plateH, setPlateH] = useState(initial?.plateH?.toString() ?? "");
  const [usefulArea, setUsefulArea] = useState(initial?.usefulArea?.toString() ?? "");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">(
    initial?.orientation ?? "vertical"
  );
  const [adhesive, setAdhesive] = useState(initial?.adhesivePerPlate?.toString() ?? "0.5");
  const [clips, setClips] = useState(initial?.clipsPerPlate?.toString() ?? "4");

  const pw = parseFloat(plateW) || 0;
  const ph = parseFloat(plateH) || 0;
  const autoArea = pw * ph;

  const handleSave = () => {
    if (!name.trim() || pw <= 0 || ph <= 0) return;
    onSave({
      name: name.trim(),
      plateW: pw,
      plateH: ph,
      usefulArea: parseFloat(usefulArea) || autoArea,
      orientation,
      adhesivePerPlate: parseFloat(adhesive) || 0,
      clipsPerPlate: parseFloat(clips) || 0,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Nombre del producto</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: WPC Nogal 15cm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Ancho placa (m)</Label>
          <Input type="number" step="0.01" value={plateW} onChange={(e) => setPlateW(e.target.value)} placeholder="0.15" />
        </div>
        <div>
          <Label className="text-xs">Alto placa (m)</Label>
          <Input type="number" step="0.01" value={plateH} onChange={(e) => setPlateH(e.target.value)} placeholder="2.90" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Superficie útil por placa (m²)</Label>
        <Input
          type="number"
          step="0.01"
          value={usefulArea}
          onChange={(e) => setUsefulArea(e.target.value)}
          placeholder={autoArea > 0 ? autoArea.toFixed(4) : "auto"}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Dejá vacío para usar ancho × alto ({autoArea > 0 ? autoArea.toFixed(4) : "—"} m²)
        </p>
      </div>
      <div>
        <Label className="text-xs">Orientación de colocación</Label>
        <Select value={orientation} onValueChange={(v) => setOrientation(v as "vertical" | "horizontal")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vertical">Vertical</SelectItem>
            <SelectItem value="horizontal">Horizontal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Adhesivo por placa</Label>
          <Input type="number" step="0.1" value={adhesive} onChange={(e) => setAdhesive(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Clips por placa</Label>
          <Input type="number" step="1" value={clips} onChange={(e) => setClips(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} className="flex-1">
          {initial ? "Guardar cambios" : "Agregar producto"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
const RevestimientosCalculator = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(loadProducts);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [walls, setWalls] = useState<Wall[]>([{ id: 1, name: "Pared 1", ancho: "", alto: "" }]);
  const [nextId, setNextId] = useState(2);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    saveProducts(products);
  }, [products]);

  // Auto-select first product
  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  const addProduct = (data: Omit<Product, "id">) => {
    const newP: Product = { ...data, id: crypto.randomUUID() };
    setProducts((prev) => [...prev, newP]);
    setSelectedProductId(newP.id);
    setShowProductForm(false);
  };

  const updateProduct = (data: Omit<Product, "id">) => {
    if (!editingProduct) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === editingProduct.id ? { ...p, ...data } : p))
    );
    setEditingProduct(null);
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (selectedProductId === id) setSelectedProductId("");
  };

  const addWall = () => {
    setWalls((prev) => [...prev, { id: nextId, name: `Pared ${nextId}`, ancho: "", alto: "" }]);
    setNextId((n) => n + 1);
  };

  const removeWall = (id: number) => {
    if (walls.length <= 1) return;
    setWalls((prev) => prev.filter((w) => w.id !== id));
  };

  const updateWall = (id: number, field: "ancho" | "alto", value: string) => {
    setWalls((prev) => prev.map((w) => (w.id === id ? { ...w, [field]: value } : w)));
  };

  // ─── Calculations ──────────────────────────────────────────────
  const wallData = walls.map((w) => {
    const ancho = parseFloat(w.ancho) || 0;
    const alto = parseFloat(w.alto) || 0;
    const area = ancho * alto;
    let plates = 0;
    if (selectedProduct && area > 0 && selectedProduct.usefulArea > 0) {
      plates = Math.ceil(area / selectedProduct.usefulArea);
    }
    return { ...w, anchoN: ancho, altoN: alto, area, plates };
  });

  const totalArea = wallData.reduce((s, w) => s + w.area, 0);
  const totalPlates = wallData.reduce((s, w) => s + w.plates, 0);
  const totalAdhesive = selectedProduct
    ? Math.ceil(totalPlates * selectedProduct.adhesivePerPlate)
    : 0;
  const totalClips = selectedProduct
    ? Math.ceil(totalPlates * selectedProduct.clipsPerPlate)
    : 0;
  const hasData = totalArea > 0 && selectedProduct !== null;

  // ─── PDF Export ────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!selectedProduct) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(0, 133, 119);
    doc.rect(0, 0, w, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("REVESTIMIENTOS", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Calculadora de Materiales", 14, 24);
    const today = new Date().toLocaleDateString("es-AR");
    doc.setFontSize(9);
    doc.text(today, w - 14, 16, { align: "right" });

    let y = 44;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Producto", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedProduct.name} — ${selectedProduct.plateW}m × ${selectedProduct.plateH}m`, 14, y);
    y += 6;
    doc.text(`Sup. útil: ${selectedProduct.usefulArea.toFixed(4)} m² | Orientación: ${selectedProduct.orientation}`, 14, y);
    y += 10;

    // Walls
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Paredes", 14, y);
    y += 8;

    wallData
      .filter((wd) => wd.area > 0)
      .forEach((wd) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`${wd.name}: ${wd.anchoN}m × ${wd.altoN}m = ${wd.area.toFixed(2)} m² → ${wd.plates} placas`, 14, y);
        y += 6;
      });

    y += 6;

    // Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resumen de Materiales", 14, y);
    y += 8;

    const rows = [
      ["Concepto", "Cantidad"],
      ["Superficie total", `${totalArea.toFixed(2)} m²`],
      ["Placas necesarias", String(totalPlates)],
      ["Adhesivo", String(totalAdhesive)],
      ["Clips / Fijaciones", String(totalClips)],
    ];

    doc.setFontSize(10);
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
      doc.text(row[0], 14, y);
      doc.text(row[1], w - 14, y, { align: "right" });
      y += 7;
    });

    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por Floortek — Calculadora de Revestimientos | tiendapisos.com", 14, y);

    doc.save(`Revestimientos_${totalArea.toFixed(0)}m2.pdf`);
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
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              REVESTIMIENTOS
            </h1>
            <p className="text-xs text-primary-foreground/70">Calculadora de Materiales</p>
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
        {/* Product selector */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Producto
            </CardTitle>
            <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Producto</DialogTitle>
                </DialogHeader>
                <ProductForm onSave={addProduct} onCancel={() => setShowProductForm(false)} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay productos cargados. Agregá uno para comenzar.
              </p>
            ) : (
              <div className="space-y-3">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedProduct && (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>
                        Placa: {selectedProduct.plateW}m × {selectedProduct.plateH}m — Útil:{" "}
                        {selectedProduct.usefulArea.toFixed(4)} m²
                      </p>
                      <p>
                        Orientación: {selectedProduct.orientation} | Adhesivo:{" "}
                        {selectedProduct.adhesivePerPlate}/placa | Clips:{" "}
                        {selectedProduct.clipsPerPlate}/placa
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Dialog
                        open={editingProduct?.id === selectedProduct.id}
                        onOpenChange={(open) => !open && setEditingProduct(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEditingProduct(selectedProduct)}
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Producto</DialogTitle>
                          </DialogHeader>
                          {editingProduct && (
                            <ProductForm
                              initial={editingProduct}
                              onSave={updateProduct}
                              onCancel={() => setEditingProduct(null)}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteProduct(selectedProduct.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Walls */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallpaper className="w-4 h-4 text-primary" />
              Paredes
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addWall} className="gap-1 h-7 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {walls.map((w) => (
              <div key={w.id} className="flex items-end gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Ancho (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={w.ancho}
                      onChange={(e) => updateWall(w.id, "ancho", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Alto (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={w.alto}
                      onChange={(e) => updateWall(w.id, "alto", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {walls.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeWall(w.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Results */}
        {hasData && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                Resultado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Per-wall breakdown */}
              <div className="space-y-1 mb-4">
                {wallData
                  .filter((wd) => wd.area > 0)
                  .map((wd) => (
                    <div
                      key={wd.id}
                      className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0"
                    >
                      <span className="text-muted-foreground">
                        {wd.name}: {wd.anchoN}m × {wd.altoN}m
                      </span>
                      <span className="font-medium">
                        {wd.area.toFixed(2)} m² → {wd.plates} placas
                      </span>
                    </div>
                  ))}
              </div>

              {/* Summary */}
              <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Superficie total</span>
                  <span className="font-semibold">{totalArea.toFixed(2)} m²</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Placas necesarias</span>
                  <span className="font-semibold">{totalPlates}</span>
                </div>
                {totalAdhesive > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Adhesivo</span>
                    <span className="font-semibold">{totalAdhesive}</span>
                  </div>
                )}
                {totalClips > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Clips / Fijaciones</span>
                    <span className="font-semibold">{totalClips}</span>
                  </div>
                )}
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
