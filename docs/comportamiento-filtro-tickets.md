/* ===================== COMPORTAMIENTO DE FILTRO DE TICKETS ===================== */

## Nuevo Comportamiento del Checkbox "Tickets"

### ✅ **Al ACTIVAR el checkbox de Tickets:**

1. **Auto-selección de estado**: 
   - Si NO hay estado seleccionado → Selecciona "NUEVO" automáticamente
   - Si YA hay estado seleccionado → Mantiene el estado actual

2. **Activación automática de cuadrillas**:
   - Activa checkbox de cuadrillas automáticamente
   - Carga cuadrillas si no están cargadas

3. **Carga de tickets**:
   - Carga tickets con el estado seleccionado (existente o "NUEVO")
   - Evita cargar TODOS los tickets de una vez

### ❌ **Al DESACTIVAR el checkbox de Tickets:**

1. **Limpieza de datos**:
   - Limpia array de tickets
   - Marca ticketsLoaded = false
   - Restablece estado a vacío ('')

### 🎯 **Beneficios:**

- **Performance mejorada**: No carga 55,000+ tickets de una vez
- **UX mejorada**: Estado por defecto más relevante ("NUEVO")
- **Consistencia**: Comportamiento predecible al activar/desactivar

### 📋 **Flujo de Trabajo:**

```
Usuario activa "📋 Tickets"
       ↓
¿Hay estado seleccionado?
       ↓
NO → Selecciona "NUEVO" automáticamente
SÍ → Mantiene estado actual  
       ↓
Activa "👥 Cuadrillas" automáticamente
       ↓
Carga tickets solo del estado seleccionado
       ↓  
Muestra cuadrillas en radio de 20km alrededor de tickets
```

### 🔧 **Implementación Técnica:**

```tsx
// Pseudo-código del comportamiento:
if (ticketsActivated) {
  let estado = selectedEstado || 'NUEVO';
  setSelectedEstado(estado);
  loadTickets(estado); // Solo tickets del estado específico
  activateCuadrillas();
} else {
  clearTickets();
  setSelectedEstado('');
}
```