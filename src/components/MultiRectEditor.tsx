import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export interface SubRectDeck {
  id: string;
  ancho: number;
  largo: number;
}

interface MultiRectEditorProps {
  rects: SubRectDeck[];
  onChange: (rects: SubRectDeck[]) => void;
}

const MultiRectEditor = ({ rects, onChange }: MultiRectEditorProps) => {
  const addRect = () => {
    onChange([...rects, { id: crypto.randomUUID(), ancho: 0, largo: 0 }]);
  };

  const removeRect = (id: string) => {
    if (rects.length <= 1) return;
    onChange(rects.filter((r) => r.id !== id));
  };

  const updateRect = (id: string, key: "ancho" | "largo", value: string) => {
    onChange(rects.map((r) => (r.id === id ? { ...r, [key]: parseFloat(value) || 0 } : r)));
  };

  const totalArea = rects.reduce((sum, r) => sum + r.ancho * r.largo, 0);

  return (
    <div className="space-y-4">
      {rects.map((rect, idx) => (
        <div key={rect.id} className="flex items-end gap-2 p-3 rounded-lg border bg-muted/30">
          <span className="text-sm font-semibold text-muted-foreground pb-2 min-w-[24px]">
            {idx + 1}
          </span>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Ancho (m)</Label>
            <Input
              type="number" step="0.01" min="0" placeholder="Ej: 3"
              value={rect.ancho || ""}
              onChange={(e) => updateRect(rect.id, "ancho", e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Largo (m)</Label>
            <Input
              type="number" step="0.01" min="0" placeholder="Ej: 4"
              value={rect.largo || ""}
              onChange={(e) => updateRect(rect.id, "largo", e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            variant="ghost" size="icon"
            onClick={() => removeRect(rect.id)}
            disabled={rects.length <= 1}
            className="h-9 w-9 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addRect} className="w-full">
        <Plus className="w-4 h-4 mr-1" /> Agregar rectángulo
      </Button>

      {totalArea > 0 && (
        <p className="text-sm text-center text-muted-foreground">
          Superficie total: <span className="font-semibold text-foreground">{totalArea.toFixed(2)} m²</span>
        </p>
      )}

      {/* Preview SVG */}
      {rects.some((r) => r.ancho > 0 && r.largo > 0) && (
        <PreviewMultiRect rects={rects.filter((r) => r.ancho > 0 && r.largo > 0)} />
      )}
    </div>
  );
};

const PreviewMultiRect = ({ rects }: { rects: SubRectDeck[] }) => {
  const padding = 30;
  const maxSize = 200;
  const totalW = Math.max(...rects.map((r) => r.ancho));
  const totalH = rects.reduce((s, r) => s + r.largo, 0);
  const scale = Math.min(maxSize / totalW, maxSize / totalH, 60);

  let yOff = 0;
  const boxes = rects.map((r) => {
    const box = { x: 0, y: yOff, w: r.ancho, h: r.largo, label: `${r.ancho}×${r.largo}` };
    yOff += r.largo + 0.1;
    return box;
  });

  const svgW = totalW * scale + padding * 2;
  const svgH = yOff * scale + padding * 2;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto max-w-full" style={{ maxHeight: 220 }}>
      {boxes.map((b, i) => (
        <g key={i}>
          <rect
            x={padding + b.x * scale} y={padding + b.y * scale}
            width={b.w * scale} height={b.h * scale}
            fill="hsl(170 60% 90%)" stroke="hsl(170 100% 26%)" strokeWidth={1.5} rx={2}
          />
          <text
            x={padding + (b.x + b.w / 2) * scale}
            y={padding + (b.y + b.h / 2) * scale}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight={600} fill="hsl(200 15% 30%)"
          >
            {b.label} m
          </text>
        </g>
      ))}
    </svg>
  );
};

export default MultiRectEditor;
