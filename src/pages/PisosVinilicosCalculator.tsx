import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, X, SquareStack, Download } from "lucide-react";
import jsPDF from "jspdf";

// ─── Types ───────────────────────────────────────────────────────
interface Room {
  id: number;
  name: string;
  ancho: string;
  largo: string;
}

const PisosVinilicosCalculator = () => {
  const navigate = useNavigate();

  // Mode: "total" = direct m², "rooms" = per-room
  const [mode, setMode] = useState<"total" | "rooms">("total");
  const [totalM2, setTotalM2] = useState("");
  const [addWaste, setAddWaste] = useState(true);

  const [rooms, setRooms] = useState<Room[]>([{ id: 1, name: "Ambiente 1", ancho: "", largo: "" }]);
  const [nextId, setNextId] = useState(2);

  const addRoom = () => {
    setRooms((prev) => [...prev, { id: nextId, name: `Ambiente ${nextId}`, ancho: "", largo: "" }]);
    setNextId((n) => n + 1);
  };
  const removeRoom = (id: number) => {
    if (rooms.length <= 1) return;
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };
  const updateRoom = (id: number, field: "ancho" | "largo", value: string) => {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const roomResults = useMemo(
    () =>
      rooms.map((r) => {
        const a = parseFloat(r.ancho) || 0;
        const l = parseFloat(r.largo) || 0;
        const perimeter = a > 0 && l > 0 ? 2 * (a + l) : 0;
        return { ...r, area: a * l, anchoNum: a, largoNum: l, perimeter };
      }),
    [rooms]
  );

  const baseM2 = mode === "total" ? parseFloat(totalM2) || 0 : roomResults.reduce((s, r) => s + r.area, 0);
  const finalM2 = addWaste ? baseM2 * 1.1 : baseM2;
  // Zócalos: por ambiente = perímetro exacto, por m² total = estimación (4 × √m²)
  const zocalosML = mode === "rooms"
    ? roomResults.reduce((s, r) => s + r.perimeter, 0)
    : baseM2 > 0 ? 4 * Math.sqrt(baseM2) : 0;
  const hasData = baseM2 > 0;

  // ─── PDF ─────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!hasData) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();

    doc.setFillColor(0, 133, 119);
    doc.rect(0, 0, pw, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PISOS VINÍLICOS Y ZÓCALOS", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Cálculo de Materiales", 14, 24);
    const today = new Date().toLocaleDateString("es-AR");
    doc.setFontSize(9);
    doc.text(today, pw - 14, 16, { align: "right" });

    let y = 44;
    doc.setTextColor(40, 40, 40);

    if (mode === "rooms") {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detalle por ambiente", 14, y);
      y += 8;

      doc.setFillColor(0, 133, 119);
      doc.rect(12, y - 4, pw - 24, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Ambiente", 14, y);
      doc.text("Medida", pw * 0.38, y, { align: "center" });
      doc.text("m²", pw * 0.62, y, { align: "center" });
      doc.text("Zócalo ml", pw - 14, y, { align: "right" });
      y += 7;

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");
      roomResults.filter((r) => r.area > 0).forEach((r, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(240, 248, 246);
          doc.rect(12, y - 4, pw - 24, 7, "F");
        }
        doc.text(r.name, 14, y);
        doc.text(`${r.anchoNum}m × ${r.largoNum}m`, pw * 0.38, y, { align: "center" });
        doc.text(r.area.toFixed(2), pw * 0.62, y, { align: "center" });
        doc.text(r.perimeter.toFixed(2), pw - 14, y, { align: "right" });
        y += 7;
      });
      y += 4;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Superficie base: ${baseM2.toFixed(2)} m²`, 14, y); y += 6;
    doc.text(`Desperdicio 10%: ${addWaste ? "Sí" : "No"}`, 14, y); y += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`Total a comprar: ${finalM2.toFixed(2)} m²`, 14, y); y += 6;
    doc.text(`Zócalos: ${zocalosML.toFixed(2)} ml${mode === "total" ? " (estimado)" : ""}`, 14, y); y += 12;

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por Floortek — Cotizador de Pisos Vinílicos | tiendapisos.com", 14, y);

    doc.save(`PisosVinilicos_${finalM2.toFixed(1)}m2.pdf`);
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
              PISOS VINÍLICOS Y ZÓCALOS
            </h1>
            <p className="text-xs text-primary-foreground/70">Cálculo de Materiales</p>
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
        {/* Mode selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <SquareStack className="w-4 h-4 text-primary" />
              Modo de Carga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={mode === "total" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMode("total")}
              >
                M² totales
              </Button>
              <Button
                variant={mode === "rooms" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMode("rooms")}
              >
                Por ambiente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {mode === "total" ? "Superficie Total" : "Ambientes"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mode === "total" ? (
              <div>
                <Label className="text-xs">M² totales</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalM2}
                  onChange={(e) => setTotalM2(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            ) : (
              <>
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
                        <Label className="text-xs">Largo (m)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={r.largo}
                          onChange={(e) => updateRoom(r.id, "largo", e.target.value)}
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
              </>
            )}

            {/* Waste toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <Label className="text-sm">Sumar 10% por desperdicio</Label>
              <Switch checked={addWaste} onCheckedChange={setAddWaste} />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {hasData && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              {mode === "rooms" && (
                <div className="space-y-1 mb-4">
                  {roomResults.filter((r) => r.area > 0).map((r) => (
                    <div key={r.id} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground">
                        {r.name}: {r.anchoNum}m × {r.largoNum}m
                      </span>
                      <div className="text-right">
                        <span className="font-medium">{r.area.toFixed(2)} m²</span>
                        <span className="text-muted-foreground ml-3">{r.perimeter.toFixed(2)} ml zóc.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-accent/50 rounded-lg p-4 space-y-2.5">
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">Superficie base</p>
                  <p className="text-xl font-semibold text-foreground">{baseM2.toFixed(2)} m²</p>
                </div>
                {addWaste && (
                  <div className="text-center text-xs text-muted-foreground">
                    + 10% desperdicio = <span className="font-medium text-foreground">{(finalM2 - baseM2).toFixed(2)} m²</span>
                  </div>
                )}
                <div className="text-center pt-2 border-t border-border/50">
                  <p className="text-3xl font-bold text-foreground">{finalM2.toFixed(2)} m²</p>
                  <p className="text-sm text-muted-foreground">Total piso a comprar</p>
                </div>
                <div className="text-center pt-2 border-t border-border/50">
                  <p className="text-2xl font-bold text-foreground">{zocalosML.toFixed(2)} ml</p>
                  <p className="text-sm text-muted-foreground">
                    Zócalos{mode === "total" ? " (estimado)" : ""}
                  </p>
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

export default PisosVinilicosCalculator;
