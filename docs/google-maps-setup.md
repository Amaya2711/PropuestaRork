# Google Maps Integration - Setup Guide

## 📍 Nueva Funcionalidad: Mapa con Google Maps

Se ha agregado una nueva página que es una **copia exacta** de `/map` pero utilizando **Google Maps** en lugar de Leaflet para mostrar los puntos de tickets, cuadrillas y sites.

### 🆚 Comparación de Mapas

| Característica | `/map` (Leaflet) | `/map-google` (Google Maps) |
|---|---|---|
| **Biblioteca de mapas** | Leaflet + OpenStreetMap | Google Maps API |
| **Funcionalidad** | ✅ Idéntica | ✅ Idéntica |
| **Filtros** | ✅ Región, Estado, Radio | ✅ Región, Estado, Radio |
| **Puntos mostrados** | ✅ Sites, Cuadrillas, Tickets | ✅ Sites, Cuadrillas, Tickets |
| **Categorización** | ✅ A/B/C con colores | ✅ A/B/C con colores |
| **API Key requerida** | ❌ No | ✅ Sí (Google) |
| **Costo** | 🆓 Gratuito | 💰 Limitado gratis |

### 🔧 Configuración Requerida

#### 1. Obtener API Key de Google Maps

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Maps JavaScript API**
4. Ve a **Credentials** → **Create Credentials** → **API Key**
5. Copia la API Key generada

#### 2. Configurar Variable de Entorno

Agrega la siguiente línea a tu archivo `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

**⚠️ Importante:** Reemplaza `tu_api_key_aqui` con tu API Key real de Google.

#### 3. Reiniciar el Servidor

Después de agregar la API Key, reinicia el servidor de desarrollo:

```bash
npm run dev
```

### 🎯 Funcionalidades Idénticas

Ambas páginas (`/map` y `/map-google`) tienen **exactamente las mismas funcionalidades**:

#### ✅ Carga de Datos
- **Sites:** Puntos rojos (🏢)
- **Cuadrillas:** Puntos azules/verdes/blancos según categoría A/B/C (👥)
- **Tickets:** Puntos amarillos (🎫)

#### ✅ Filtros
- **Región:** LIMA NORTE, LIMA SUR, LIMA ESTE, LIMA CENTRO
- **Estado:** NUEVO, EN_PROCESO, COMPLETADO, etc.
- **Radio configurable:** Para mostrar cuadrillas cerca de tickets

#### ✅ Interactividad
- **Checkboxes:** Para mostrar/ocultar cada tipo de punto
- **Popups informativos:** Al hacer clic en los marcadores
- **Carga automática:** Los datos se cargan al activar cada checkbox

#### ✅ Sistema de Categorías
- **Categoría A:** Azul (#007bff)
- **Categoría B:** Verde (#28a745)
- **Categoría C:** Blanco/Gris (#ffffff)

### 🚀 Cómo Usar

1. **Navegar:** Ve a la nueva pestaña **"Google Maps"** en el menú de navegación
2. **Activar capas:** Marca los checkboxes de Sites, Cuadrillas y/o Tickets
3. **Filtrar:** Selecciona región y estado según necesites
4. **Interactuar:** Haz clic en los marcadores para ver información detallada

### 🔍 Diferencias Visuales

#### Leaflet (`/map`)
- Tiles de OpenStreetMap
- Marcadores con iconos de Leaflet
- Controles de zoom estándar de Leaflet

#### Google Maps (`/map-google`)
- Tiles y satelitales de Google
- Marcadores con iconos personalizados de Google Maps
- Controles de zoom y navegación de Google Maps
- Mejor rendimiento en dispositivos móviles
- Información de tráfico en tiempo real (opcional)

### 📱 Acceso

- **URL Leaflet:** `http://localhost:3000/map`
- **URL Google Maps:** `http://localhost:3000/map-google`

### 🛠️ Tecnologías Utilizadas

- **@googlemaps/js-api-loader:** Para cargar la API de Google Maps
- **@types/google.maps:** Types de TypeScript para Google Maps
- **React:** Componentes funcionales con hooks
- **Next.js:** Framework de React para el routing

### ⚡ Ventajas de Google Maps

1. **Calidad de mapas:** Mapas más detallados y actualizados
2. **Rendimiento:** Mejor optimización para dispositivos móviles
3. **Funcionalidades:** Acceso a Street View, tráfico, satelital, etc.
4. **Experiencia familiar:** Los usuarios están acostumbrados a la interfaz

### ⚠️ Consideraciones

1. **API Key obligatoria:** Sin API Key no funcionará
2. **Cuotas de uso:** Google tiene límites gratuitos y luego cobra
3. **Dependencia externa:** Requiere conexión a servicios de Google

---

**🎉 ¡La nueva integración de Google Maps está lista para usar!**

Ambas opciones de mapas están disponibles y son completamente funcionales. Puedes elegir entre Leaflet (gratuito) o Google Maps (requiere API Key) según tus necesidades.