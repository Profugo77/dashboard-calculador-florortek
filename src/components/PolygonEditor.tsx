import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, RotateCcw } from "lucide-react";

export interface PolygonVertex {
  x: number;
  y: number;
}

interface Block {
  id: string;
  ancho: number;
  largo: number;
  attachTo?: string;       // id of parent block
  attachSide?: "arriba" | "abajo" | "izquierda" | "derecha";
  alignOffset: number;     // offset along the attachment edge (in meters)
}

export interface ComputedBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PolygonEditorProps {
  vertices: PolygonVertex[];
  onChange: (vertices: PolygonVertex[]) => void;
  onBlocksChange?: (blocks: ComputedBlock[]) => void;
}

function computeBlockPositions(blocks: Block[]): ComputedBlock[] {
  if (blocks.length === 0) return [];
  const computed: ComputedBlock[] = [];
  const first = blocks[0];
  computed.push({ id: first.id, x: 0, y: 0, w: first.ancho, h: first.largo });

  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b.attachTo || !b.attachSide) continue;
    const parent = computed.find((c) => c.id === b.attachTo);
    if (!parent) continue;

    let x = 0, y = 0;
    const off = b.alignOffset || 0;

    switch (b.attachSide) {
      case "derecha":
        x = parent.x + parent.w;
        y = parent.y + off;
        break;
      case "izquierda":
        x = parent.x - b.ancho;
        y = parent.y + off;
        break;
      case "abajo":
        x = parent.x + off;
        y = parent.y + parent.h;
        break;
      case "arriba":
        x = parent.x + off;
        y = parent.y - b.largo;
        break;
    }
    computed.push({ id: b.id, x, y, w: b.ancho, h: b.largo });
  }
  return computed;
}

function blocksToOutlineVertices(blocks: ComputedBlock[]): PolygonVertex[] {
  if (blocks.length === 0) return [];
  // Use a simple approach: compute the union outline via grid-based merge
  // For simplicity, return the bounding vertices of each block for area calculation
  // The area is just the sum of individual block areas (assuming no overlap for practical use)
  // Return vertices as the convex outline points for display
  const allVerts: PolygonVertex[] = [];
  for (const b of blocks) {
    allVerts.push({ x: b.x, y: b.y });
    allVerts.push({ x: b.x + b.w, y: b.y });
    allVerts.push({ x: b.x + b.w, y: b.y + b.h });
    allVerts.push({ x: b.x, y: b.y + b.h });
  }
  return allVerts;
}

function computeArea(blocks: ComputedBlock[]): number {
  // Simple sum of areas (blocks shouldn't overlap in this design)
  return blocks.reduce((sum, b) => sum + b.w * b.h, 0);
}

function computeBoundingBox(blocks: ComputedBlock[]) {
  if (blocks.length === 0) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of blocks) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { minX, minY, maxX, maxY };
}

const SIDE_LABELS: Record<string, string> = {
  derecha: "→ Derecha",
  izquierda: "← Izquierda",
  abajo: "↓ Abajo",
  arriba: "↑ Arriba",
};

const PolygonEditor = ({ vertices, onChange, onBlocksChange }: PolygonEditorProps) => {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: crypto.randomUUID(), ancho: 0, largo: 0, alignOffset: 0 },
  ]);

  const computed = useMemo(() => computeBlockPositions(blocks), [blocks]);
  const validBlocks = computed.filter((b) => b.w > 0 && b.h > 0);
  const area = computeArea(validBlocks);

  const updateAndNotify = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    const comp = computeBlockPositions(newBlocks);
    const valid = comp.filter((b) => b.w > 0 && b.h > 0);
    onBlocksChange?.(valid);
    if (valid.length > 0) {
      const verts = blocksToOutlineVertices(valid);
      if (verts.length > 0) verts.push({ ...verts[0] });
      onChange(verts);
    } else {
      onChange([]);
    }
  };

  const addBlock = () => {
    const parentId = blocks.length > 0 ? blocks[0].id : undefined;
    updateAndNotify([
      ...blocks,
      {
        id: crypto.randomUUID(),
        ancho: 0,
        largo: 0,
        attachTo: parentId,
        attachSide: "derecha",
        alignOffset: 0,
      },
    ]);
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) return;
    // Also remove blocks attached to this one
    const removeIds = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const b of blocks) {
        if (b.attachTo && removeIds.has(b.attachTo) && !removeIds.has(b.id)) {
          removeIds.add(b.id);
          changed = true;
        }
      }
    }
    updateAndNotify(blocks.filter((b) => !removeIds.has(b.id)));
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    updateAndNotify(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const resetAll = () => {
    const newBlocks = [{ id: crypto.randomUUID(), ancho: 0, largo: 0, alignOffset: 0 }];
    setBlocks(newBlocks);
    onChange([]);
    onBlocksChange?.([]);
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => (
        <div key={block.id} className="p-3 rounded-lg border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">
              Bloque {idx + 1}
            </span>
            {blocks.length > 1 && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeBlock(block.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Ancho (m)</Label>
              <Input
                type="number" step="0.01" min="0" placeholder="Ej: 3"
                value={block.ancho || ""}
                onChange={(e) => updateBlock(block.id, { ancho: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Largo (m)</Label>
              <Input
                type="number" step="0.01" min="0" placeholder="Ej: 4"
                value={block.largo || ""}
                onChange={(e) => updateBlock(block.id, { largo: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
          </div>

          {/* Attachment controls for blocks 2+ */}
          {idx > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Adjunto a</Label>
                <Select
                  value={block.attachTo || ""}
                  onValueChange={(v) => updateBlock(block.id, { attachTo: v })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Bloque..." />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.slice(0, idx).map((b, bi) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        Bloque {bi + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lado</Label>
                <Select
                  value={block.attachSide || "derecha"}
                  onValueChange={(v) => updateBlock(block.id, { attachSide: v as Block["attachSide"] })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SIDE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Desplazamiento (m)</Label>
                <Input
                  type="number" step="0.01" placeholder="0"
                  value={block.alignOffset || ""}
                  onChange={(e) => updateBlock(block.id, { alignOffset: parseFloat(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addBlock} className="w-full">
        <Plus className="w-4 h-4 mr-1" /> Agregar bloque
      </Button>

      {blocks.length > 1 && (
        <Button variant="ghost" size="sm" onClick={resetAll} className="w-full text-destructive">
          <RotateCcw className="w-4 h-4 mr-1" /> Reiniciar
        </Button>
      )}

      {area > 0 && (
        <p className="text-sm text-center text-muted-foreground">
          Superficie total: <span className="font-semibold text-foreground">{area.toFixed(2)} m²</span>
        </p>
      )}

      {/* Preview */}
      {validBlocks.length > 0 && <BlockPreview blocks={validBlocks} />}
    </div>
  );
};

const BlockPreview = ({ blocks }: { blocks: ComputedBlock[] }) => {
  const bbox = computeBoundingBox(blocks);
  const rangeX = bbox.maxX - bbox.minX || 1;
  const rangeY = bbox.maxY - bbox.minY || 1;
  const padding = 40;
  const maxSize = 240;
  const scale = Math.min(maxSize / rangeX, maxSize / rangeY);
  const svgW = rangeX * scale + padding * 2;
  const svgH = rangeY * scale + padding * 2;

  const COLORS = [
    "hsl(170 60% 85%)",
    "hsl(200 60% 85%)",
    "hsl(30 60% 85%)",
    "hsl(280 40% 85%)",
    "hsl(340 50% 85%)",
  ];

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto max-w-full" style={{ maxHeight: 280 }}>
      {blocks.map((b, i) => {
        const rx = padding + (b.x - bbox.minX) * scale;
        const ry = padding + (b.y - bbox.minY) * scale;
        const rw = b.w * scale;
        const rh = b.h * scale;
        return (
          <g key={b.id}>
            <rect
              x={rx} y={ry} width={rw} height={rh}
              fill={COLORS[i % COLORS.length]}
              stroke="hsl(170 100% 26%)" strokeWidth={1.5} rx={2}
            />
            {/* Dimensions */}
            <text x={rx + rw / 2} y={ry - 6} textAnchor="middle" fontSize={9} fontWeight={600} fill="hsl(200 15% 35%)">
              {b.w} m
            </text>
            <text
              x={rx - 6} y={ry + rh / 2}
              textAnchor="middle" fontSize={9} fontWeight={600} fill="hsl(200 15% 35%)"
              transform={`rotate(-90, ${rx - 6}, ${ry + rh / 2})`}
            >
              {b.h} m
            </text>
            {/* Block number */}
            <text x={rx + rw / 2} y={ry + rh / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="hsl(170 100% 26%)">
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export function polygonArea(verts: PolygonVertex[]): number {
  let area = 0;
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += verts[i].x * verts[j].y;
    area -= verts[j].x * verts[i].y;
  }
  return Math.abs(area) / 2;
}

export function getBlocksArea(verts: PolygonVertex[]): number {
  // For block-based shapes, area is computed from blocks, not from polygon vertices
  // This is a fallback using shoelace
  if (verts.length < 3) return 0;
  return polygonArea(verts.slice(0, -1)); // remove closing duplicate
}

export default PolygonEditor;
