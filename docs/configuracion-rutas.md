# 🗺️ Sistema de Rutas Realistas - PTORRES

## 📋 Descripción General

El sistema de cálculo de rutas ha sido mejorado para generar trayectorias que siguen **avenidas principales reales** de Lima Metropolitana, evitando que las rutas pasen por cerros, océano o zonas no transitables.

## 🛣️ Avenidas Principales Incluidas

### **Norte-Sur:**
- **Av. Arequipa** - Principal arteria del centro-sur
- **Av. Brasil** - Conecta centro con Lima Norte  
- **Av. Universitaria** - Acceso a universidades y Lima Norte
- **Av. Abancay** - Centro histórico
- **Av. Tacna** - Zona comercial central

### **Este-Oeste:**
- **Av. Javier Prado** - Principal vía este-oeste (San Isidro-Ate)
- **Av. Salaverry** - Conecta distritos residenciales
- **Av. La Marina** - Acceso a Pueblo Libre-San Miguel
- **Av. Venezuela** - Norte de Lima
- **Av. Colonial** - Callao-Centro de Lima

### **Vías de Acceso:**
- **Panamericana Norte** - Acceso a Lima Norte
- **Panamericana Sur** - Acceso a Lima Sur  
- **Via Expresa** - Tránsito rápido norte-sur

## 🎯 Sistema de Rutas por Categoría

### **Funcionamiento:**
Al hacer clic en **"Mejor Ruta por Categoría"**, el sistema:

1. **Agrupa cuadrillas** por categoría (A, B, C)
2. **Calcula rutas** para todas las cuadrillas de cada categoría
3. **Selecciona la MÁS RÁPIDA** de cada categoría disponible
4. **Muestra UNA línea por categoría** (solo la mejor de cada una)
5. **Resalta las cuadrillas ganadoras** de cada categoría

### **Colores y Patrones:**
- **Categoría A** 🔵: Línea azul con patrón punteado (10, 5)
- **Categoría B** 🟢: Línea verde con patrón rayado (15, 5)  
- **Categoría C** 🔴: Línea roja con patrón discontinuo (20, 8)

### **Información Visual:**
- **Popup detallado** con tiempo y distancia por categoría
- **Bordes coloreados** según la categoría de cada cuadrilla
- **Resaltado especial** para cuadrillas seleccionadas (radio 18px)

## 🔧 Algoritmo de Ruteo Inteligente
- Ingresa a tu dashboard: https://openrouteservice.org/dev/#/home
- Ve a "Dashboard" → "Tokens"
- Copia tu API key (formato: `5b3ce3597851110001cf6248abc123...`)

### 3. ⚙️ Configurar en el Proyecto
Edita el archivo: `lib/routeService.ts`
```typescript
// Reemplaza esta línea:
private readonly apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU0NDk5NzFiYjU4NTRjNWZiMDk5YzdhNmJiOWIzYjk1IiwiaCI6Im11cm11cjY0In0=';

// Por tu API key real:
private readonly apiKey = '5b3ce3597851110001cf6248tu_api_key_real';
```

### 4. 📊 Límites de la Cuenta Gratuita
- **Requests por día**: 1,000
- **Requests por minuto**: 40  
- **Suficiente para**: Pruebas y uso moderado

## 🚗 ¿Cómo Funciona el Sistema?

### Al hacer clic en "🎯 Mejor Ruta por Categoría":

1. **Identifica cuadrillas**: Toma todas las cuadrillas visibles en el radio actual
2. **Agrupa por categoría**: Separa cuadrillas A, B y C disponibles
3. **Calcula la mejor ruta**: Para cada categoría, encuentra la cuadrilla MÁS RÁPIDA
4. **Considera tráfico**: Aplica factores de tráfico urbano según hora del día
5. **Visualiza UNA ruta por categoría**: 
   - 🔵 **UNA línea azul punteada** para la MEJOR cuadrilla categoría A
   - 🟢 **UNA línea verde rayada** para la MEJOR cuadrilla categoría B  
   - 🔴 **UNA línea roja discontinua** para la MEJOR cuadrilla categoría C
6. **Resalta cuadrillas ganadoras**: Marca cada cuadrilla seleccionada con borde de su color
7. **Muestra información selecta**: Popup con la cuadrilla más rápida por cada categoría disponible

## 📊 Resultados Esperados por Categoría

- **Comparación directa** entre las MEJORES opciones de cada categoría
- **Decisión estratégica** para elegir qué tipo de cuadrilla enviar
- **Mapa claro** con UNA ruta por categoría (máximo 3 líneas: A, B, C)  
- **Información precisa** de la cuadrilla más rápida de cada tipo
- **Vista optimizada** con las mejores alternativas para decisión rápida

## 📊 Información Mostrada

- **🏆 Cuadrilla más rápida**: Código y nombre
- **⏱️ Tiempo estimado**: Con tráfico en minutos  
- **📏 Distancia**: En kilómetros por carretera
- **🗺️ Ruta visual**: Línea punteada naranja en el mapa

## 🔧 Alternativas de API (si quieres cambiar)

### Google Maps Directions API (Más precisa)
```javascript
// En routeService.ts cambiar a:
private readonly baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
```
- **Pro**: Muy precisa, considera tráfico real
- **Contra**: Requiere facturación, más costosa

### MapBox Directions API (Balance)
```javascript  
// En routeService.ts cambiar a:
private readonly baseUrl = 'https://api.mapbox.com/directions/v5';
```
- **Pro**: Buena precisión, precios razonables
- **Contra**: Límites más estrictos en versión gratuita

## ⚠️ Notas Importantes

- La API es **gratuita hasta 1,000 requests/día**
- Cada cálculo de ruta = 1 request por cuadrilla
- Con 10 cuadrillas = 10 requests por cálculo
- ¡Perfecto para pruebas y uso normal!

## 🧪 Para Probar

1. Configura tu API key
2. Activa "📋 Tickets" en el mapa  
3. Haz clic en cualquier ticket rojo
4. Presiona "🎯 Mejor Ruta por Categoría"
5. Ve los resultados y las rutas reales dibujadas

## 🚗 Rutas Reales como Uber - NUEVO!

### **Sistema de Routing Avanzado**
El sistema ahora usa **OpenRouteService API** para obtener rutas reales que siguen calles y carreteras:

- 🚖 **Como Uber** - Rutas por calles reales
- 🗺️ **Como Google Maps** - Giros y curvas precisas  
- 🛣️ **Como Waze** - Caminos transitables

### **Mejoras Implementadas:**
- ✅ **Rutas reales** siguiendo infraestructura vial
- ✅ **Distancias precisas** por carretera (no estimaciones)
- ✅ **Tiempos realistas** basados en routing real
- ✅ **Visualización profesional** sin líneas punteadas artificiales
- ⚡ **Fallback automático** si API no disponible

### **API Configuration:**
- **Servicio**: OpenRouteService (gratuito)
- **Límite**: 2,000 requests/día  
- **Configuración**: Ver `docs/api-routing-config.md`