# 🗺️ Configuración de API para Rutas Reales

## OpenRouteService - Rutas como Uber

### ✅ API Key Configurada
- **Servicio**: OpenRouteService (gratuito)
- **Límites**: 2,000 requests/día gratis
- **Funcionalidad**: Rutas reales por calles y carreteras

### 🔑 Cómo obtener tu propia API Key:

1. **Registro gratuito**:
   - Ve a: https://openrouteservice.org/dev/#/signup
   - Crea cuenta con email
   - Confirma registro

2. **Obtener API Key**:
   - Login en: https://openrouteservice.org/dev/#/home
   - Ve a "Dashboard" 
   - Copia tu API Key personal

3. **Configurar en código**:
   ```typescript
   // En lib/routeService.ts línea ~50
   const API_KEY = 'TU_API_KEY_AQUI';
   ```

### 📊 Límites de Uso:
- **Plan gratuito**: 2,000 requests/día
- **Por cuadrilla**: 1 request por cálculo de ruta
- **Recomendación**: Úsalo para demostraciones y pruebas

### 🚀 Funcionalidades:
- ✅ **Rutas reales** siguiendo calles y avenidas
- ✅ **Distancias precisas** por carretera  
- ✅ **Tiempos realistas** basados en velocidades de tráfico
- ✅ **Visualización tipo Uber** con curvas y giros reales

### ⚠️ Fallback System:
Si la API falla o se agotan los requests:
- Se usa sistema de rutas estimadas (algoritmo local)
- Garantiza funcionamiento continuo
- Logs indican cuándo usa API vs fallback

---
**Configurado**: 31 octubre 2025
**Estado**: Activo con API key de prueba