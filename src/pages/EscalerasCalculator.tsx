import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ArrowUpRight, Download } from "lucide-react";
import jsPDF from "jspdf";

type Servicio = "pulido" | "colocacion";
type TipoMO = "pedada" | "alzada-pedada";

const EscalerasCalculator = () => {
  const navigate = useNavigate();

  const [servicio, setServicio] = useState<Servicio>("pulido");
  const [escalones, setEscalones] = useState("");
  const [anchoEscalon, setAnchoEscalon] = useState("");
  const [tipoMO, setTipoMO] = useState<TipoMO>("pedada");

  const numEscalones = parseInt(escalones) || 0;
  const ancho = parseFloat(anchoEscalon) || 0;

  const results = useMemo(() => {
    if (numEscalones <= 0) return null;

    const m2PorEscalon = tipoMO === "pedada" ? 1 : 2;
    const manoDeObraM2 = numEscalones * m2PorEscalon;

    if (servicio === "pulido") {
      const lacaML = numEscalones * 0.5;
      return { manoDeObraM2, insumo: lacaML, insumoLabel: "Laca", insumoUnit: "ml" };
    } else {
      const perfilML = numEscalones * 1;
      return { manoDeObraM2, insumo: perfilML, insumoLabel: "Perfil Step", insumoUnit: "ml" };
    }
  }, [numEscalones, tipoMO, servicio]);

  const handleExportPDF = () => {
    if (!results) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();

    doc.setFillColor(0, 133, 119);
    doc.rect(0, 0, pw, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ESCALERAS", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const servicioLabel = servicio === "pulido" ? "Pulido y Laqueado" : "Colocación Piso Vinílico";
    doc.text(servicioLabel, 14, 24);
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
    doc.text(`Escalones: ${numEscalones}`, 14, y); y += 6;
    doc.text(`Tipo: ${tipoMO === "pedada" ? "Pedada" : "Alzada y Pedada"}`, 14, y); y += 6;
    if (ancho > 0) doc.text(`Ancho escalón: ${ancho} m`, 14, y); y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Resultados", 14, y); y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Mano de obra: ${results.manoDeObraM2} m²`, 14, y); y += 6;
    doc.text(`${results.insumoLabel}: ${results.insumo} ${results.insumoUnit}`, 14, y); y += 12;

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por Floortek — Cotizador de Escaleras | tiendapisos.com", 14, y);

    doc.save(`Escaleras_${servicioLabel.replace(/ /g, "_")}_${numEscalones}esc.pdf`);
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
              ESCALERAS
            </h1>
            <p className="text-xs text-primary-foreground/70">Pulido & Laqueado / Colocación Vinílico</p>
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
        {/* Servicio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-primary" />
              Tipo de Servicio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={servicio === "pulido" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setServicio("pulido")}
              >
                Pulido y Laqueado
              </Button>
              <Button
                variant={servicio === "colocacion" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setServicio("colocacion")}
              >
                Colocación Vinílico
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Datos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datos de la Escalera</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Cantidad de escalones</Label>
              <Input
                type="number"
                min="1"
                value={escalones}
                onChange={(e) => setEscalones(e.target.value)}
                placeholder="Ej: 14"
              />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Tipo de mano de obra</Label>
              <RadioGroup value={tipoMO} onValueChange={(v) => setTipoMO(v as TipoMO)} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="pedada" id="pedada" />
                  <Label htmlFor="pedada" className="text-sm cursor-pointer">Pedada (1 m²/esc)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="alzada-pedada" id="alzada-pedada" />
                  <Label htmlFor="alzada-pedada" className="text-sm cursor-pointer">Alzada y Pedada (2 m²/esc)</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-accent/50 rounded-lg p-4 space-y-3">
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">Mano de obra</p>
                  <p className="text-3xl font-bold text-foreground">{results.manoDeObraM2} m²</p>
                  <p className="text-xs text-muted-foreground">
                    {numEscalones} escalones × {tipoMO === "pedada" ? "1" : "2"} m²
                  </p>
                </div>
                <div className="text-center pt-3 border-t border-border/50 space-y-1">
                  <p className="text-sm text-muted-foreground">{results.insumoLabel}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {results.insumo} {results.insumoUnit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {numEscalones} escalones × {servicio === "pulido" ? "0.5 ml" : "1 ml"}
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

export default EscalerasCalculator;
