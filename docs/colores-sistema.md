/* ===================== GUÍA DE COLORES DEL SISTEMA ===================== */

## Colores por Categoría de Cuadrillas

### Categoría A - AZUL
- **Tabla**: backgroundColor: '#007bff' (Bootstrap Primary Blue)
- **Mapa**: 
  - color (borde): '#004085' (Dark Blue)
  - fillColor: '#007bff' (Primary Blue)

### Categoría B - VERDE  
- **Tabla**: backgroundColor: '#28a745' (Bootstrap Success Green)
- **Mapa**:
  - color (borde): '#155724' (Dark Green) 
  - fillColor: '#28a745' (Success Green)

### Categoría C - CELESTE
- **Tabla**: backgroundColor: '#17a2b8' (Bootstrap Info Cyan)
- **Mapa**:
  - color (borde): '#0c5460' (Dark Cyan)
  - fillColor: '#17a2b8' (Info Cyan)

## Estados de Marcadores en el Mapa

### Prioridades de Color (de mayor a menor):
1. **Cuadrilla ID=20** (especial): Naranja (#ff6b00 / #ffa500)
2. **Seleccionado**: Rojo borde / Amarillo relleno (#ff0000 / #ffff00)  
3. **Dentro de radio**: Naranja claro (#ff9500 / #ffb84d)
4. **Normal**: Colores por categoría (A=Azul, B=Verde, C=Celeste)

### Código de Estados:
```tsx
// 1. Cuadrilla especial (ID=20)
isCuadrilla20 ? { color: '#ff6b00', fillColor: '#ffa500' }

// 2. Seleccionado  
: isSelected ? { color: '#ff0000', fillColor: '#ffff00' }

// 3. Dentro de radio de tickets
: isWithinRadius ? { color: '#ff9500', fillColor: '#ffb84d' }

// 4. Estado normal - por categoría
: getCategoriaColors(categoria)
```

## Consistencia Visual
- Los colores en la tabla y el mapa son idénticos para cada categoría
- Los badges en la tabla usan los mismos colores base que los marcadores del mapa
- El sistema mantiene consistencia visual en toda la aplicación