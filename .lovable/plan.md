

# Calculadora Técnica de Decks — Floortek / Tiendapisos

## Descripción General
Aplicación de cálculo técnico para instaladores y clientes de decks de alta gama. Permite ingresar medidas del área, configurar el sentido de instalación y la medida de tabla, y obtener un desglose completo de materiales con visualización gráfica del plano de planta.

---

## Diseño y Estética
- **Paleta**: Verde esmeralda corporativo (#008577), gris oscuro, blanco
- **Layout mobile-first**: Optimizado para uso en obra desde el celular
- **Branding Floortek**: Logo y nombre de la empresa en header y PDF exportado

---

## Pantalla Principal — Calculadora

### 1. Inputs de Medida
- Campo "Ancho del área (m)"
- Campo "Largo del área (m)"

### 2. Configuración de Tabla y Sentido
- **Medida de tabla**: Radio buttons — "2.2m" o "2.9m" (mutuamente excluyentes)
- **Sentido de instalación**: Radio buttons — "Horizontal" o "Vertical" (define la dirección de las tablas; los tubos de aluminio corren perpendiculares)

### 3. Botón "Calcular"
Ejecuta toda la lógica técnica al presionar.

---

## Lógica de Cálculo

1. **Superficie de tablas**: Ancho × Largo × 1.10 (10% desperdicio)
2. **Estructura de aluminio**: Tubos cada 35 cm perpendiculares al sentido de la tabla, más marco perimetral. Se suman todos los metros lineales.
3. **Pilotines**: 1 apoyo cada 50 cm sobre cada línea de tubo
4. **Clips**: 18 por m² real (sin desperdicio)
5. **Tornillos**: 2 por cada clip

---

## Resultados

### Resumen de Materiales (Tabla)
- Total m² de tablas (con desperdicio)
- Metros lineales de estructura de aluminio
- Cantidad total de pilotines
- Cantidad de clips de fijación
- Cantidad de tornillos técnicos

### Gráfico Dinámico (Plano de Planta)
- Visualización a escala del área con:
  - Líneas representando los tubos de aluminio cada 35 cm
  - Puntos representando los pilotines cada 50 cm sobre cada tubo
- Dibujado con canvas SVG para máxima claridad

### Exportación PDF
- Botón "Descargar Presupuesto PDF" usando jsPDF
- Incluye branding Floortek, datos del cálculo, tabla de materiales y gráfico

