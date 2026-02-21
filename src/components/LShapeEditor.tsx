import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LShapeConfig } from "@/lib/deckCalculations";

interface LShapeEditorProps {
  config: LShapeConfig;
  onChange: (config: LShapeConfig) => void;
}

const LShapeEditor = ({ config, onChange }: LShapeEditorProps) => {
  const update = (key: keyof LShapeConfig, value: string) => {
    onChange({ ...config, [key]: parseFloat(value) || 0 });
  };

  const { anchoTotal, largoTotal, anchoBrazo, largoBrazo } = config;

  const validL =
    anchoTotal > 0 &&
    largoTotal > 0 &&
    anchoBrazo > 0 &&
    anchoBrazo < anchoTotal &&
    largoBrazo > 0 &&
    largoBrazo < largoTotal;

  const padding = 50;
  const maxSize = 220;
  const scale = validL ? Math.min(maxSize / anchoTotal, maxSize / largoTotal) : 1;
  const w = validL ? anchoTotal * scale : maxSize;
  const h = validL ? largoTotal * scale : maxSize;
  const svgW = w + padding * 2;
  const svgH = h + padding * 2;

  const ab = validL ? anchoBrazo * scale : 0;
  const lb = validL ? largoBrazo * scale : 0;

  const points = validL
    ? [
        `${padding},${padding}`,
        `${padding + w},${padding}`,
        `${padding + w},${padding + lb}`,
        `${padding + ab},${padding + lb}`,
        `${padding + ab},${padding + h}`,
        `${padding},${padding + h}`,
      ].join(" ")
    : "";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Ancho total (m)</Label>
          <Input
            type="number" step="0.01" min="0" placeholder="Ej: 6.0"
            value={config.anchoTotal || ""}
            onChange={(e) => update("anchoTotal", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Largo total (m)</Label>
          <Input
            type="number" step="0.01" min="0" placeholder="Ej: 8.0"
            value={config.largoTotal || ""}
            onChange={(e) => update("largoTotal", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Ancho brazo (m)</Label>
          <Input
            type="number" step="0.01" min="0" placeholder="Ej: 3.0"
            value={config.anchoBrazo || ""}
            onChange={(e) => update("anchoBrazo", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Largo brazo (m)</Label>
          <Input
            type="number" step="0.01" min="0" placeholder="Ej: 4.0"
            value={config.largoBrazo || ""}
            onChange={(e) => update("largoBrazo", e.target.value)}
          />
        </div>
      </div>

      {validL && (
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto max-w-full" style={{ maxHeight: 260 }}>
          <polygon
            points={points}
            fill="hsl(170 60% 90%)"
            stroke="hsl(170 100% 26%)"
            strokeWidth={2}
          />

          {/* Ancho total — top */}
          <line x1={padding} y1={padding - 20} x2={padding + w} y2={padding - 20} stroke="hsl(200 10% 50%)" strokeWidth={0.8} markerEnd="url(#arr)" markerStart="url(#arr)" />
          <text x={padding + w / 2} y={padding - 24} textAnchor="middle" fontSize={11} fontWeight={600} fill="hsl(200 10% 30%)">
            {anchoTotal} m
          </text>

          {/* Largo total — left */}
          <line x1={padding - 20} y1={padding} x2={padding - 20} y2={padding + h} stroke="hsl(200 10% 50%)" strokeWidth={0.8} />
          <text
            x={padding - 24} y={padding + h / 2}
            textAnchor="middle" fontSize={11} fontWeight={600} fill="hsl(200 10% 30%)"
            transform={`rotate(-90, ${padding - 24}, ${padding + h / 2})`}
          >
            {largoTotal} m
          </text>

          {/* Ancho brazo — bottom */}
          <line x1={padding} y1={padding + h + 14} x2={padding + ab} y2={padding + h + 14} stroke="hsl(25 80% 50%)" strokeWidth={0.8} />
          <text x={padding + ab / 2} y={padding + h + 28} textAnchor="middle" fontSize={10} fontWeight={500} fill="hsl(25 80% 40%)">
            {anchoBrazo} m
          </text>

          {/* Largo brazo — right */}
          <line x1={padding + w + 14} y1={padding} x2={padding + w + 14} y2={padding + lb} stroke="hsl(25 80% 50%)" strokeWidth={0.8} />
          <text
            x={padding + w + 28} y={padding + lb / 2}
            textAnchor="middle" fontSize={10} fontWeight={500} fill="hsl(25 80% 40%)"
            transform={`rotate(90, ${padding + w + 28}, ${padding + lb / 2})`}
          >
            {largoBrazo} m
          </text>
        </svg>
      )}

      {!validL && (anchoTotal > 0 || largoTotal > 0) && (
        <p className="text-sm text-destructive text-center">
          El ancho del brazo debe ser menor al ancho total, y el largo del brazo menor al largo total.
        </p>
      )}
    </div>
  );
};

export default LShapeEditor;
