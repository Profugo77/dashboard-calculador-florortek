import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateDeck, DeckInput, DeckResult, CoverPerimetral } from "@/lib/deckCalculations";
import { exportPDF } from "@/lib/exportPDF";
import FloorPlanSVG from "@/components/FloorPlanSVG";
import IsometricDeckSVG from "@/components/IsometricDeckSVG";
import { Calculator, Download, Ruler, Layers } from "lucide-react";

const Index = () => {
  const [ancho, setAncho] = useState("");
  const [largo, setLargo] = useState("");
  const [medidaTabla, setMedidaTabla] = useState<"2.2" | "2.9">("2.2");
  const [sentido, setSentido] = useState<"ancho" | "largo">("ancho");
  const [cover, setCover] = useState<CoverPerimetral>({ ancho1: false, ancho2: false, largo1: false, largo2: false });
  const [result, setResult] = useState<DeckResult | null>(null);

  const toggleCover = (lado: keyof CoverPerimetral) => {
    setCover((prev) => ({ ...prev, [lado]: !prev[lado] }));
  };

  const handleCalculate = () => {
    const a = parseFloat(ancho);
    const l = parseFloat(largo);
    if (!a || !l || a <= 0 || l <= 0) return;
    const mappedSentido = sentido === "ancho" ? "horizontal" : "vertical";
    const input: DeckInput = { ancho: a, largo: l, medidaTabla, sentido: mappedSentido, coverPerimetral: cover };
    setResult(calculateDeck(input));
  };

  const handleExport = () => {
    if (!result) return;
    exportPDF(
      { ancho: parseFloat(ancho), largo: parseFloat(largo), medidaTabla, sentido: sentido === "ancho" ? "A lo ancho" : "A lo largo", cover },
      result
    );
  };

  const isValid = parseFloat(ancho) > 0 && parseFloat(largo) > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-4 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              FLOORTEK
            </h1>
            <p className="text-xs text-primary-foreground/70">Calculadora Técnica de Decks</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Inputs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ruler className="w-5 h-5 text-primary" />
              Medidas del Área
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ancho">Ancho (m)</Label>
              <Input
                id="ancho"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej: 4.5"
                value={ancho}
                onChange={(e) => setAncho(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="largo">Largo (m)</Label>
              <Input
                id="largo"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej: 6.0"
                value={largo}
                onChange={(e) => setLargo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Config */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Medida y Sentido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Medida de tabla</Label>
              <RadioGroup value={medidaTabla} onValueChange={(v) => setMedidaTabla(v as "2.2" | "2.9")} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2.2" id="t22" />
                  <Label htmlFor="t22" className="cursor-pointer">2.2 m</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2.9" id="t29" />
                  <Label htmlFor="t29" className="cursor-pointer">2.9 m</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Sentido de colocación de tablas</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sentido === "ancho"}
                    onChange={() => setSentido("ancho")}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-sm">A lo ancho</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sentido === "largo"}
                    onChange={() => setSentido("largo")}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-sm">A lo largo</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover perimetral */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Cover Perimetral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label className="text-sm text-muted-foreground">Seleccioná los lados que llevan cover</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cover.ancho1} onChange={() => toggleCover("ancho1")} className="w-4 h-4 accent-primary rounded" />
                <span className="text-sm">Ancho 1</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cover.ancho2} onChange={() => toggleCover("ancho2")} className="w-4 h-4 accent-primary rounded" />
                <span className="text-sm">Ancho 2</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cover.largo1} onChange={() => toggleCover("largo1")} className="w-4 h-4 accent-primary rounded" />
                <span className="text-sm">Largo 1</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cover.largo2} onChange={() => toggleCover("largo2")} className="w-4 h-4 accent-primary rounded" />
                <span className="text-sm">Largo 2</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Calculate button */}
        <Button onClick={handleCalculate} disabled={!isValid} className="w-full h-12 text-base font-semibold" size="lg">
          <Calculator className="w-5 h-5 mr-2" />
          Calcular
        </Button>

        {/* Results */}
        {result && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Resumen de Materiales</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Superficie de tablas</TableCell>
                      <TableCell className="text-right font-semibold">{result.superficieConDesperdicio.toFixed(2)} m²</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Estructura aluminio</TableCell>
                      <TableCell className="text-right font-semibold">{result.metrosLinealesAluminio.toFixed(2)} ml</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Pilotines</TableCell>
                      <TableCell className="text-right font-semibold">{result.pilotines}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Clips de fijación</TableCell>
                      <TableCell className="text-right font-semibold">{result.clips}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Tornillos técnicos</TableCell>
                      <TableCell className="text-right font-semibold">{result.tornillos}</TableCell>
                    </TableRow>
                    {result.mlCoverPerimetral > 0 && (
                      <TableRow>
                        <TableCell>Cover perimetral</TableCell>
                        <TableCell className="text-right font-semibold">{result.mlCoverPerimetral.toFixed(2)} ml</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Plano de Planta</CardTitle>
              </CardHeader>
              <CardContent>
                <FloorPlanSVG result={result} ancho={parseFloat(ancho)} largo={parseFloat(largo)} cover={cover} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Vista Isométrica</CardTitle>
              </CardHeader>
              <CardContent>
                <IsometricDeckSVG result={result} ancho={parseFloat(ancho)} largo={parseFloat(largo)} cover={cover} />
              </CardContent>
            </Card>

            <Button onClick={handleExport} variant="outline" className="w-full h-12 text-base font-semibold border-primary text-primary hover:bg-accent">
              <Download className="w-5 h-5 mr-2" />
              Descargar Presupuesto PDF
            </Button>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-muted-foreground">
        Floortek — tiendapisos.com
      </footer>
    </div>
  );
};

export default Index;
