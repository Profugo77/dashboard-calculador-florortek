interface PergolaSchemaProps {
  anchoM: number;
  salidaM: number;
  vistaMm: number;
  lineas: number;
  piezasPorLinea: number;
  sentido: "horizontal" | "vertical";
  tieneApoyo: boolean;
  distApoyoCm: number;
}

const STOCK = 2.9; // m
const PROFILE_COLOR = "hsl(30 55% 50%)";
const PROFILE_STROKE = "hsl(30 30% 35%)";
const EMPALME_COLOR = "hsl(0 70% 55%)";
const APOYO_COLOR = "hsl(200 10% 40%)";

const PergolaSchema = ({
  anchoM,
  salidaM,
  vistaMm,
  lineas,
  piezasPorLinea,
  sentido,
  tieneApoyo,
  distApoyoCm,
}: PergolaSchemaProps) => {
  const padding = 44;
  const maxDraw = 340;

  // Map dimensions based on sentido
  // "horizontal": profiles run along salida (depth), stacked across ancho (width)
  // "vertical": profiles run along ancho (width), stacked across salida (depth)
  const stackDim = sentido === "horizontal" ? anchoM : salidaM; // dimension across which lines are distributed
  const runDim = sentido === "horizontal" ? salidaM : anchoM; // dimension along which profiles run

  const scale = Math.min(maxDraw / anchoM, maxDraw / salidaM);
  const svgW = anchoM * scale + padding * 2 + (tieneApoyo && sentido === "horizontal" ? 50 : 0);
  const svgH = salidaM * scale + padding * 2;
  const ox = padding;
  const oy = padding;
  const dw = anchoM * scale;
  const dh = salidaM * scale;

  const vistaM = vistaMm / 1000;
  const moduleM = stackDim / lineas; // actual spacing per line

  // Profile thickness in SVG pixels
  const profileThickPx = Math.max(vistaM * scale, 2);

  // Generate profile rectangles
  const profiles: { x: number; y: number; w: number; h: number; isSecondPiece: boolean }[] = [];

  for (let i = 0; i < lineas; i++) {
    const centerInStack = moduleM * i + moduleM / 2;

    if (sentido === "horizontal") {
      // Profiles run left-to-right (along salida mapped to x... wait, let me think)
      // sentido horizontal: profiles go from wall to front (along salida/depth = Y axis in diagram)
      // stacked across ancho = X axis
      const cx = ox + centerInStack * scale;
      const profW = profileThickPx;

      if (piezasPorLinea === 1) {
        profiles.push({
          x: cx - profW / 2,
          y: oy,
          w: profW,
          h: salidaM * scale,
          isSecondPiece: false,
        });
      } else {
        // Two pieces with gap
        const piece1H = STOCK * scale;
        const piece2H = Math.min(STOCK, salidaM - STOCK) * scale;
        profiles.push({
          x: cx - profW / 2,
          y: oy,
          w: profW,
          h: piece1H,
          isSecondPiece: false,
        });
        profiles.push({
          x: cx - profW / 2,
          y: oy + piece1H + 2,
          w: profW,
          h: piece2H,
          isSecondPiece: true,
        });
      }
    } else {
      // sentido vertical: profiles go side to side (along ancho = X axis)
      // stacked across salida = Y axis
      const cy = oy + centerInStack * scale;
      const profH = profileThickPx;

      if (piezasPorLinea === 1) {
        profiles.push({
          x: ox,
          y: cy - profH / 2,
          w: anchoM * scale,
          h: profH,
          isSecondPiece: false,
        });
      } else {
        const piece1W = STOCK * scale;
        const piece2W = Math.min(STOCK, anchoM - STOCK) * scale;
        profiles.push({
          x: ox,
          y: cy - profH / 2,
          w: piece1W,
          h: profH,
          isSecondPiece: false,
        });
        profiles.push({
          x: ox + piece1W + 2,
          y: cy - profH / 2,
          w: piece2W,
          h: profH,
          isSecondPiece: true,
        });
      }
    }
  }

  // Generate apoyo positions based on distApoyoCm
  const distApoyoM = distApoyoCm > 0 ? distApoyoCm / 100 : 0;
  const apoyoRunDim = sentido === "horizontal" ? salidaM : anchoM;
  const apoyoPositions: number[] = [];
  if (tieneApoyo && distApoyoM > 0) {
    let pos = distApoyoM;
    while (pos < apoyoRunDim - 0.01) {
      apoyoPositions.push(pos);
      pos += distApoyoM;
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <h4 className="text-sm font-semibold text-foreground mb-2 text-center">
        Esquema de Pérgola — Perfiles {sentido === "horizontal" ? "↕ Pared→Frente" : "↔ Lado a lado"}
      </h4>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto max-w-full" style={{ maxHeight: 400 }}>
        {/* Background */}
        <rect x={ox} y={oy} width={dw} height={dh} fill="hsl(200 20% 95%)" stroke="hsl(200 15% 70%)" strokeWidth={1.5} rx={3} strokeDasharray="6 3" />

        {/* Profiles */}
        {profiles.map((p, i) => (
          <rect
            key={i}
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            fill={p.isSecondPiece ? EMPALME_COLOR : PROFILE_COLOR}
            stroke={PROFILE_STROKE}
            strokeWidth={0.5}
            rx={1}
            opacity={0.9}
          />
        ))}

        {/* Apoyo intermedio — thick beam rectangles */}
        {tieneApoyo && apoyoPositions.map((pos, i) => {
          const beamThick = 5;
          if (sentido === "horizontal") {
            const by = oy + pos * scale - beamThick / 2;
            return (
              <g key={`apoyo-${i}`}>
                <rect x={ox - 4} y={by} width={dw + 8} height={beamThick} fill={APOYO_COLOR} rx={1.5} opacity={0.85} />
                <text x={ox + dw + 10} y={by + beamThick / 2 + 4} fontSize={9} fill={APOYO_COLOR} fontWeight={600}>
                  {(pos * 100).toFixed(0)} cm
                </text>
              </g>
            );
          } else {
            const bx = ox + pos * scale - beamThick / 2;
            return (
              <g key={`apoyo-${i}`}>
                <rect x={bx} y={oy - 4} width={beamThick} height={dh + 8} fill={APOYO_COLOR} rx={1.5} opacity={0.85} />
                <text x={bx + beamThick / 2} y={oy + dh + 14} fontSize={9} fill={APOYO_COLOR} fontWeight={600} textAnchor="middle">
                  {(pos * 100).toFixed(0)} cm
                </text>
              </g>
            );
          }
        })}

        {/* Dimension labels */}
        <text x={ox + dw / 2} y={oy - 12} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(200 10% 30%)">
          {anchoM} m
        </text>
        <text
          x={ox - 14}
          y={oy + dh / 2}
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          fill="hsl(200 10% 30%)"
          transform={`rotate(-90, ${ox - 14}, ${oy + dh / 2})`}
        >
          {salidaM} m
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-3 rounded-sm" style={{ background: PROFILE_COLOR, border: `1px solid ${PROFILE_STROKE}` }} />
          Perfil {vistaMm}mm
        </span>
        {piezasPorLinea > 1 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-3 rounded-sm" style={{ background: EMPALME_COLOR }} />
            Empalme
          </span>
        )}
        {tieneApoyo && apoyoPositions.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-[5px] rounded-sm" style={{ background: APOYO_COLOR }} />
            Apoyo intermedio
          </span>
        )}
      </div>
    </div>
  );
};

export default PergolaSchema;
