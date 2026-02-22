import { useRef, useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface LShapeDragValues {
  anchoTotal: number;
  largoTotal: number;
  anchoBrazo: number;
  largoBrazo: number;
}

interface Props {
  value: LShapeDragValues;
  onChange: (v: LShapeDragValues) => void;
}

type Handle = "anchoTotal" | "largoTotal" | "anchoBrazo" | "largoBrazo";

const SNAP = 0.05;
const MIN = 0.5;

function snap(v: number) {
  return Math.max(MIN, Math.round(v / SNAP) * SNAP);
}

const LShapeDragEditor = ({ value, onChange }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<Handle | null>(null);

  const padding = 50;
  const maxSize = 200;
  const { anchoTotal, largoTotal, anchoBrazo, largoBrazo } = value;
  const valid = anchoTotal > 0 && largoTotal > 0 && anchoBrazo > 0 && anchoBrazo < anchoTotal && largoBrazo > 0 && largoBrazo < largoTotal;
  const sc = valid ? Math.min(maxSize / anchoTotal, maxSize / largoTotal) : 1;
  const dw = valid ? anchoTotal * sc : maxSize;
  const dh = valid ? largoTotal * sc : maxSize;
  const svgW = dw + padding * 2 + 20;
  const svgH = dh + padding * 2 + 20;
  const ox = padding;
  const oy = padding;

  const ab = anchoBrazo * sc;
  const lb = largoBrazo * sc;

  const toModel = useCallback(
    (clientX: number, clientY: number): { mx: number; my: number } => {
      if (!svgRef.current) return { mx: 0, my: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / rect.width) * svgW;
      const svgY = ((clientY - rect.top) / rect.height) * svgH;
      return { mx: (svgX - ox) / sc, my: (svgY - oy) / sc };
    },
    [sc, svgW, svgH, ox, oy]
  );

  const handlePointerDown = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(handle);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const { mx, my } = toModel(e.clientX, e.clientY);
      const next = { ...value };
      switch (dragging) {
        case "anchoTotal":
          next.anchoTotal = snap(Math.max(mx, value.anchoBrazo + 0.1));
          break;
        case "largoTotal":
          next.largoTotal = snap(Math.max(my, value.largoBrazo + 0.1));
          break;
        case "anchoBrazo":
          next.anchoBrazo = snap(Math.min(mx, value.anchoTotal - 0.1));
          break;
        case "largoBrazo":
          next.largoBrazo = snap(Math.min(my, value.largoTotal - 0.1));
          break;
      }
      onChange(next);
    },
    [dragging, toModel, value, onChange]
  );

  const handlePointerUp = useCallback(() => setDragging(null), []);

  const updateField = (key: keyof LShapeDragValues, raw: string) => {
    const v = parseFloat(raw);
    if (isNaN(v) || v < MIN) return;
    const next = { ...value, [key]: Math.round(v * 100) / 100 };
    // enforce constraints
    if (key === "anchoTotal" && next.anchoTotal <= next.anchoBrazo) next.anchoBrazo = next.anchoTotal - 0.1;
    if (key === "largoTotal" && next.largoTotal <= next.largoBrazo) next.largoBrazo = next.largoTotal - 0.1;
    if (key === "anchoBrazo" && next.anchoBrazo >= next.anchoTotal) next.anchoBrazo = next.anchoTotal - 0.1;
    if (key === "largoBrazo" && next.largoBrazo >= next.largoTotal) next.largoBrazo = next.largoTotal - 0.1;
    onChange(next);
  };

  const handleR = 7;
  const handleColor = "hsl(170 100% 26%)";
  const handleActiveColor = "hsl(170 100% 36%)";

  const handles: { id: Handle; cx: number; cy: number }[] = valid
    ? [
        { id: "anchoTotal", cx: ox + dw, cy: oy + lb / 2 },
        { id: "largoTotal", cx: ox + ab / 2, cy: oy + dh },
        { id: "anchoBrazo", cx: ox + ab, cy: oy + (lb + dh) / 2 },
        { id: "largoBrazo", cx: ox + (ab + dw) / 2, cy: oy + lb },
      ]
    : [];

  return (
    <div className="space-y-3">
      {/* Input fields */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Ancho total (m)</Label>
          <Input type="number" step="0.05" min={MIN} value={anchoTotal}
            onChange={(e) => updateField("anchoTotal", e.target.value)}
            className="text-center text-xs h-8 mt-0.5" />
        </div>
        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(200 10% 35%)" }}>Largo total (m)</Label>
          <Input type="number" step="0.05" min={MIN} value={largoTotal}
            onChange={(e) => updateField("largoTotal", e.target.value)}
            className="text-center text-xs h-8 mt-0.5" />
        </div>
        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(25 80% 45%)" }}>Ancho brazo (m)</Label>
          <Input type="number" step="0.05" min={MIN} value={anchoBrazo}
            onChange={(e) => updateField("anchoBrazo", e.target.value)}
            className="text-center text-xs h-8 mt-0.5" />
        </div>
        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(25 80% 45%)" }}>Largo brazo (m)</Label>
          <Input type="number" step="0.05" min={MIN} value={largoBrazo}
            onChange={(e) => updateField("largoBrazo", e.target.value)}
            className="text-center text-xs h-8 mt-0.5" />
        </div>
      </div>

      {/* SVG drag editor */}
      {valid && (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="mx-auto max-w-full cursor-default select-none"
          style={{ maxHeight: 240, touchAction: "none" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <polygon
            points={`${ox},${oy} ${ox + dw},${oy} ${ox + dw},${oy + lb} ${ox + ab},${oy + lb} ${ox + ab},${oy + dh} ${ox},${oy + dh}`}
            fill="hsl(170 60% 92%)"
            stroke="hsl(170 100% 26%)"
            strokeWidth={2}
          />
          <text x={ox + dw / 2} y={oy - 14} textAnchor="middle" fontSize={11} fontWeight={600} fill="hsl(200 10% 30%)">
            {anchoTotal.toFixed(2)} m
          </text>
          <text x={ox - 16} y={oy + dh / 2} textAnchor="middle" fontSize={11} fontWeight={600} fill="hsl(200 10% 30%)"
            transform={`rotate(-90, ${ox - 16}, ${oy + dh / 2})`}>
            {largoTotal.toFixed(2)} m
          </text>
          <text x={ox + ab / 2} y={oy + dh + 18} textAnchor="middle" fontSize={10} fontWeight={500} fill="hsl(25 80% 45%)">
            {anchoBrazo.toFixed(2)} m
          </text>
          <text x={ox + dw + 18} y={oy + lb / 2} textAnchor="middle" fontSize={10} fontWeight={500} fill="hsl(25 80% 45%)"
            transform={`rotate(90, ${ox + dw + 18}, ${oy + lb / 2})`}>
            {largoBrazo.toFixed(2)} m
          </text>
          {handles.map((h) => (
            <circle key={h.id} cx={h.cx} cy={h.cy} r={handleR}
              fill={dragging === h.id ? handleActiveColor : handleColor}
              stroke="white" strokeWidth={2} style={{ cursor: "grab" }}
              onPointerDown={handlePointerDown(h.id)} />
          ))}
          <text x={svgW / 2} y={svgH - 4} textAnchor="middle" fontSize={9} fill="hsl(200 10% 60%)">
            Arrastrá los puntos para ajustar
          </text>
        </svg>
      )}

      {!valid && (anchoTotal > 0 || largoTotal > 0) && (
        <p className="text-xs text-center py-2" style={{ color: "hsl(0 60% 50%)" }}>
          Ancho brazo &lt; Ancho total y Largo brazo &lt; Largo total
        </p>
      )}
    </div>
  );
};

export default LShapeDragEditor;
