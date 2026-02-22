import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus, Trash2, RotateCcw } from "lucide-react";

export interface PolygonVertex {
  x: number;
  y: number;
}

interface Segment {
  id: string;
  dir: "right" | "down" | "left" | "up";
  length: number;
}

interface PolygonEditorProps {
  vertices: PolygonVertex[];
  onChange: (vertices: PolygonVertex[]) => void;
}

const DIR_VECTORS: Record<string, { dx: number; dy: number }> = {
  right: { dx: 1, dy: 0 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  up: { dx: 0, dy: -1 },
};

const DIR_LABELS: Record<string, string> = {
  right: "→ Derecha",
  down: "↓ Abajo",
  left: "← Izquierda",
  up: "↑ Arriba",
};

const DIR_ICONS: Record<string, React.ReactNode> = {
  right: <ArrowRight className="w-4 h-4" />,
  down: <ArrowDown className="w-4 h-4" />,
  left: <ArrowLeft className="w-4 h-4" />,
  up: <ArrowUp className="w-4 h-4" />,
};

function segmentsToVertices(segments: Segment[]): PolygonVertex[] {
  const verts: PolygonVertex[] = [{ x: 0, y: 0 }];
  let cx = 0, cy = 0;
  for (const seg of segments) {
    const v = DIR_VECTORS[seg.dir];
    cx += v.dx * seg.length;
    cy += v.dy * seg.length;
    verts.push({ x: Math.round(cx * 1000) / 1000, y: Math.round(cy * 1000) / 1000 });
  }
  return verts;
}

function polygonArea(verts: PolygonVertex[]): number {
  let area = 0;
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += verts[i].x * verts[j].y;
    area -= verts[j].x * verts[i].y;
  }
  return Math.abs(area) / 2;
}

const PolygonEditor = ({ vertices, onChange }: PolygonEditorProps) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [newDir, setNewDir] = useState<"right" | "down" | "left" | "up">("right");
  const [newLen, setNewLen] = useState("");

  const updateVertices = (segs: Segment[]) => {
    const verts = segmentsToVertices(segs);
    onChange(verts);
  };

  const addSegment = () => {
    const len = parseFloat(newLen);
    if (!len || len <= 0) return;
    const newSegs = [...segments, { id: crypto.randomUUID(), dir: newDir, length: len }];
    setSegments(newSegs);
    updateVertices(newSegs);
    setNewLen("");
  };

  const removeSegment = (id: string) => {
    const newSegs = segments.filter((s) => s.id !== id);
    setSegments(newSegs);
    updateVertices(newSegs);
  };

  const resetAll = () => {
    setSegments([]);
    onChange([]);
  };

  const currentVerts = segmentsToVertices(segments);
  const isClosed = currentVerts.length > 2 &&
    Math.abs(currentVerts[currentVerts.length - 1].x - currentVerts[0].x) < 0.01 &&
    Math.abs(currentVerts[currentVerts.length - 1].y - currentVerts[0].y) < 0.01;

  const area = isClosed ? polygonArea(currentVerts.slice(0, -1)) : 0;

  // Auto-close suggestion
  const lastVert = currentVerts[currentVerts.length - 1];
  const canAutoClose = segments.length >= 2 && !isClosed && (
    (Math.abs(lastVert.x) < 0.01 && lastVert.y !== 0) ||
    (Math.abs(lastVert.y) < 0.01 && lastVert.x !== 0) ||
    (Math.abs(lastVert.x) > 0.01 && Math.abs(lastVert.y) > 0.01)
  );

  const autoClose = () => {
    const lv = currentVerts[currentVerts.length - 1];
    const newSegs = [...segments];
    // Close with at most 2 segments (horizontal then vertical)
    if (Math.abs(lv.x) > 0.01) {
      newSegs.push({
        id: crypto.randomUUID(),
        dir: lv.x > 0 ? "left" : "right",
        length: Math.abs(lv.x),
      });
    }
    const afterX = segmentsToVertices(newSegs);
    const lvAfter = afterX[afterX.length - 1];
    if (Math.abs(lvAfter.y) > 0.01) {
      newSegs.push({
        id: crypto.randomUUID(),
        dir: lvAfter.y > 0 ? "up" : "down",
        length: Math.abs(lvAfter.y),
      });
    }
    setSegments(newSegs);
    updateVertices(newSegs);
  };

  return (
    <div className="space-y-4">
      {/* Segment list */}
      {segments.length > 0 && (
        <div className="space-y-2">
          {segments.map((seg, idx) => (
            <div key={seg.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 text-sm">
              <span className="text-muted-foreground font-semibold min-w-[20px]">{idx + 1}</span>
              <span className="flex items-center gap-1">
                {DIR_ICONS[seg.dir]}
                {DIR_LABELS[seg.dir]}
              </span>
              <span className="font-semibold ml-auto">{seg.length} m</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSegment(seg.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add segment controls */}
      {!isClosed && (
        <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
          <Label className="text-xs font-semibold">Agregar segmento</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {(["right", "down", "left", "up"] as const).map((d) => (
              <Button
                key={d} variant={newDir === d ? "default" : "outline"} size="sm"
                onClick={() => setNewDir(d)} className="text-xs px-2"
              >
                {DIR_ICONS[d]}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="number" step="0.01" min="0.01" placeholder="Longitud (m)"
              value={newLen} onChange={(e) => setNewLen(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSegment()}
              className="h-9"
            />
            <Button size="sm" onClick={addSegment} className="h-9 px-3">
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {canAutoClose && (
          <Button variant="outline" size="sm" onClick={autoClose} className="flex-1">
            Cerrar polígono
          </Button>
        )}
        {segments.length > 0 && (
          <Button variant="ghost" size="sm" onClick={resetAll} className="text-destructive">
            <RotateCcw className="w-4 h-4 mr-1" /> Reiniciar
          </Button>
        )}
      </div>

      {/* Status */}
      {isClosed && area > 0 && (
        <p className="text-sm text-center text-muted-foreground">
          Polígono cerrado — Superficie: <span className="font-semibold text-foreground">{area.toFixed(2)} m²</span>
        </p>
      )}
      {segments.length > 0 && !isClosed && (
        <p className="text-xs text-center text-muted-foreground">
          Seguí agregando segmentos hasta cerrar la forma
        </p>
      )}

      {/* Preview SVG */}
      {currentVerts.length > 1 && <PolygonPreview vertices={currentVerts} isClosed={isClosed} />}
    </div>
  );
};

const PolygonPreview = ({ vertices, isClosed }: { vertices: PolygonVertex[]; isClosed: boolean }) => {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const padding = 40;
  const maxSize = 220;
  const scale = Math.min(maxSize / rangeX, maxSize / rangeY);
  const svgW = rangeX * scale + padding * 2;
  const svgH = rangeY * scale + padding * 2;

  const toSvg = (v: PolygonVertex) => ({
    x: padding + (v.x - minX) * scale,
    y: padding + (v.y - minY) * scale,
  });

  const svgVerts = vertices.map(toSvg);
  const pointsStr = svgVerts.map((v) => `${v.x},${v.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto max-w-full" style={{ maxHeight: 240 }}>
      {/* Grid */}
      {isClosed ? (
        <polygon points={pointsStr} fill="hsl(170 60% 90%)" stroke="hsl(170 100% 26%)" strokeWidth={2} />
      ) : (
        <polyline points={pointsStr} fill="none" stroke="hsl(170 100% 26%)" strokeWidth={2} />
      )}

      {/* Vertices */}
      {svgVerts.map((v, i) => (
        <circle key={i} cx={v.x} cy={v.y} r={3} fill="hsl(170 100% 26%)" />
      ))}

      {/* Cotas (dimensions on each edge) */}
      {vertices.slice(0, -1).map((v, i) => {
        const next = vertices[i + 1];
        const len = Math.sqrt((next.x - v.x) ** 2 + (next.y - v.y) ** 2);
        if (len < 0.01) return null;
        const midSvg = {
          x: (toSvg(v).x + toSvg(next).x) / 2,
          y: (toSvg(v).y + toSvg(next).y) / 2,
        };
        const isHoriz = Math.abs(next.y - v.y) < 0.01;
        return (
          <text
            key={`cota-${i}`}
            x={midSvg.x + (isHoriz ? 0 : -12)}
            y={midSvg.y + (isHoriz ? -8 : 4)}
            textAnchor="middle" fontSize={9} fontWeight={600}
            fill="hsl(200 15% 35%)"
          >
            {len.toFixed(2)} m
          </text>
        );
      })}
    </svg>
  );
};

export { polygonArea };
export default PolygonEditor;
