import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Calculator,
  AlertTriangle,
  Info,
  RotateCw,
} from "lucide-react";

// ─── Types & Constants ───────────────────────────────────────────
interface Perfil {
  label: string;
  vistaMm: number; // mm
}

const PERFILES: Perfil[] = [
  { label: "25×50 (vista 25 mm)", vistaMm: 25 },
  { label: "40×60 (vista 40 mm)", vistaMm: 40 },
  { label: "50×100 (vista 50 mm)", vistaMm: 50 },
];

type Diseno = "equilibrado" | "liviano";

const LARGO_STOCK = 2.9; // metros

interface PergolaResult {
  lineas: number;
  piezasPorLinea: number;
  totalPerfiles: number;
  metrosLineales: number;
  precioTotal: number | null;
}

// ─── Calculation ─────────────────────────────────────────────────
function calcPergola(
  anchoM: number,
  salidaM: number,
  perfil: Perfil,
  diseno: Diseno,
  precioUnitario: number | null
): PergolaResult {
  const vistaM = perfil.vistaMm / 1000;
  const separacion = diseno === "equilibrado" ? vistaM : vistaM * 1.2;
  const modulo = vistaM + separacion;
  const lineas = Math.ceil(anchoM / modulo);
  const piezasPorLinea = salidaM <= LARGO_STOCK ? 1 : 2;
  const totalPerfiles = lineas * piezasPorLinea;
  const metrosLineales = +(totalPerfiles * LARGO_STOCK).toFixed(2);
  const precioTotal =
    precioUnitario != null ? +(totalPerfiles * precioUnitario).toFixed(2) : null;

  return { lineas, piezasPorLinea, totalPerfiles, metrosLineales, precioTotal };
}

// ─── Component ───────────────────────────────────────────────────
const PergolaCalculator = () => {
  const navigate = useNavigate();

  const [anchoStr, setAnchoStr] = useState("");
  const [salidaStr, setSalidaStr] = useState("");
  const [perfilIdx, setPerfilIdx] = useState("0");
  const [diseno, setDiseno] = useState<Diseno>("equilibrado");
  const [tieneApoyo, setTieneApoyo] = useState(false);
  const [distApoyoStr, setDistApoyoStr] = useState("");
  const [precioStr, setPrecioStr] = useState("");
  const [result, setResult] = useState<PergolaResult | null>(null);

  const anchoM = parseFloat(anchoStr) || 0;
  const salidaM = parseFloat(salidaStr) || 0;
  const distApoyoCm = parseFloat(distApoyoStr) || 0;
  const perfil = PERFILES[parseInt(perfilIdx)];
  const precioUnitario = precioStr ? parseFloat(precioStr) : null;

  // Warnings
  const warnEmpalme = salidaM > LARGO_STOCK && !tieneApoyo;
  const warnDistancia100 = tieneApoyo && distApoyoCm > 100;
  const warnDistancia80 = tieneApoyo && distApoyoCm > 80 && distApoyoCm <= 100;
  const showOptimizacion = salidaM >= 2.8 && salidaM <= 3.1 && salidaM !== LARGO_STOCK;

  const handleCalc = () => {
    if (anchoM <= 0 || salidaM <= 0) return;
    setResult(calcPergola(anchoM, salidaM, perfil, diseno, precioUnitario));
  };

  const handleReset = () => {
    setAnchoStr("");
    setSalidaStr("");
    setPerfilIdx("0");
    setDiseno("equilibrado");
    setTieneApoyo(false);
    setDistApoyoStr("");
    setPrecioStr("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Pérgolas</h1>
            <p className="text-xs text-primary-foreground/70">
              Calculadora Técnica
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Inputs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dimensiones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Ancho total (m)</Label>
                <Input
                  type="number"
                  placeholder="Ej: 4"
                  value={anchoStr}
                  onChange={(e) => setAnchoStr(e.target.value)}
                  min={0}
                  step={0.01}
                />
              </div>
              <div>
                <Label className="text-xs">Salida / profundidad (m)</Label>
                <Input
                  type="number"
                  placeholder="Ej: 2.5"
                  value={salidaStr}
                  onChange={(e) => setSalidaStr(e.target.value)}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Perfil</Label>
                <Select value={perfilIdx} onValueChange={setPerfilIdx}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERFILES.map((p, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Diseño</Label>
                <Select
                  value={diseno}
                  onValueChange={(v) => setDiseno(v as Diseno)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equilibrado">
                      Equilibrado (sep = 1× vista)
                    </SelectItem>
                    <SelectItem value="liviano">
                      Liviano (sep = 1.2× vista)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-md p-3">
              <Label className="text-xs">¿Tiene apoyo intermedio?</Label>
              <Switch checked={tieneApoyo} onCheckedChange={setTieneApoyo} />
            </div>

            {tieneApoyo && (
              <div>
                <Label className="text-xs">
                  Distancia entre apoyos metálicos (cm)
                </Label>
                <Input
                  type="number"
                  placeholder="Ej: 60"
                  value={distApoyoStr}
                  onChange={(e) => setDistApoyoStr(e.target.value)}
                  min={0}
                />
              </div>
            )}

            <div>
              <Label className="text-xs">
                Precio por perfil de 2.90 m (opcional)
              </Label>
              <Input
                type="number"
                placeholder="$"
                value={precioStr}
                onChange={(e) => setPrecioStr(e.target.value)}
                min={0}
              />
            </div>

            <div className="flex gap-3">
              <Button className="flex-1 gap-2" onClick={handleCalc} disabled={anchoM <= 0 || salidaM <= 0}>
                <Calculator className="w-4 h-4" />
                Calcular
              </Button>
              <Button variant="outline" size="icon" onClick={handleReset}>
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Warnings */}
        {warnEmpalme && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Empalme requerido</AlertTitle>
            <AlertDescription>
              La salida supera 2.90 m y no tiene apoyo intermedio. Se requiere
              una <strong>viga metálica intermedia</strong> para empalmar los
              perfiles.
            </AlertDescription>
          </Alert>
        )}

        {warnDistancia100 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Distancia excesiva</AlertTitle>
            <AlertDescription>
              El WPC no debe tener más de <strong>1 m libre</strong> sin
              fijación. Reducí la distancia entre apoyos.
            </AlertDescription>
          </Alert>
        )}

        {warnDistancia80 && !warnDistancia100 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Recomendación</AlertTitle>
            <AlertDescription>
              Se recomienda que los apoyos estén cada{" "}
              <strong>60–80 cm</strong> para mayor estabilidad.
            </AlertDescription>
          </Alert>
        )}

        {showOptimizacion && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Optimización</AlertTitle>
            <AlertDescription>
              La salida está cerca de 2.90 m. Si podés ajustarla a exactamente{" "}
              <strong>2.90 m</strong>, evitás empalmes y reducís costos.
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Líneas necesarias
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {result.lineas}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Perfiles de 2.90 m
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {result.totalPerfiles}
                  </p>
                  {result.piezasPorLinea > 1 && (
                    <p className="text-[10px] text-muted-foreground">
                      ({result.piezasPorLinea} piezas/línea)
                    </p>
                  )}
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Metros lineales totales
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {result.metrosLineales} m
                  </p>
                </div>
                {result.precioTotal != null && (
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Precio estimado
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      ${result.precioTotal.toLocaleString("es-AR")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="text-center py-5 text-xs text-muted-foreground">
        Floortek — tiendapisos.com
      </footer>
    </div>
  );
};

export default PergolaCalculator;
