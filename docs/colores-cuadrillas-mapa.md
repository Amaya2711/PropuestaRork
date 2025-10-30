/* ===================== COLORES DE CUADRILLAS EN EL MAPA ===================== */

## Nueva Lógica de Colores (Actualizada)

### Estados de las Cuadrillas:

1. **🔸 Cuadrilla ID=20 (Especial)**
   - Color: Naranja (#ff6b00 / #ffa500)
   - Radio: 12px
   - Prioridad: MÁXIMA

2. **🔴 Cuadrilla Seleccionada**
   - Color: Rojo/Amarillo (#ff0000 / #ffff00) 
   - Radio: 10px
   - Prioridad: ALTA

3. **🎯 Cuadrilla Normal (por Categoría)**
   - **Categoría A**: Azul (#004085 / #007bff)
   - **Categoría B**: Verde (#155724 / #28a745)  
   - **Categoría C**: Dorado (#b8860b / #ffd700)
   - Radio: 5px normal / 8px si está dentro del radio de tickets
   - Borde: 2px normal / 4px si está dentro del radio de tickets
   - Opacidad: 0.7 normal / 0.9 si está dentro del radio de tickets

### Cambios Aplicados:

✅ **ANTES**: Cuadrillas dentro del radio de tickets = color naranja fijo
✅ **AHORA**: Cuadrillas SIEMPRE muestran su color de categoría

### Diferenciación Visual:

- **Cuadrillas fuera del radio**: 
  - Colores por categoría
  - Borde fino (2px)
  - Opacidad media (0.7)

- **Cuadrillas dentro del radio de tickets**:
  - Colores por categoría (mantenidos)
  - Borde más grueso (4px) ← Indica que están "activas"
  - Mayor opacidad (0.9) ← Más visible
  - Radio más grande (8px vs 5px)

### Resultado Visual:
- 🔵 Azul = Categoría A
- 🟢 Verde = Categoría B  
- � Dorado = Categoría C
- Los círculos más grandes y con borde grueso = están cerca de tickets filtrados

### Tickets Resaltados:
- Radio: 8px normal / 14px seleccionado (aumentado de 6px/12px)
- Borde: 3px normal / 4px seleccionado (aumentado de 2px/3px)
- Color: Rojo más oscuro (#8b0000) para mejor contraste
- Opacidad: 0.8 para mejor visibilidad