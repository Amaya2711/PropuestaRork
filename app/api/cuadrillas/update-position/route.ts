import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Coordenadas inicial y final
const INICIO = { lat: -12.3655, lng: -76.786828 }; // CQ-LIM-REG-17 | Punta Negra
const FINAL = { lat: -12.07194, lng: -77.16225 }; // CQ-LIM-REG-29 | La Punta

// Función para generar 100 puntos progresivos entre dos coordenadas
function generateProgressiveRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }, numPoints: number = 100) {
  const points = [];
  
  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1); // De 0 a 1
    
    // Interpolación lineal para latitud y longitud
    const lat = start.lat + (end.lat - start.lat) * progress;
    const lng = start.lng + (end.lng - start.lng) * progress;
    
    // Agregar pequeña variación para simular movimiento más realista
    const variation = 0.001; // ~100 metros de variación
    const randomLat = lat + (Math.random() - 0.5) * variation;
    const randomLng = lng + (Math.random() - 0.5) * variation;
    
    points.push({
      lat: randomLat,
      lng: randomLng,
      step: i + 1,
      progress: Math.round(progress * 100)
    });
  }
  
  return points;
}

let currentStepIndex = 0;
let routePoints: Array<{ lat: number; lng: number; step: number; progress: number }> = [];
let isSimulationActive = false;

// Inicializar la ruta
if (routePoints.length === 0) {
  routePoints = generateProgressiveRoute(INICIO, FINAL, 100);
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'start') {
      isSimulationActive = true;
      currentStepIndex = 0;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Simulación iniciada',
        currentStep: currentStepIndex,
        totalSteps: routePoints.length
      });
    }
    
    if (action === 'stop') {
      isSimulationActive = false;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Simulación detenida',
        currentStep: currentStepIndex
      });
    }
    
    if (action === 'reset') {
      isSimulationActive = false;
      currentStepIndex = 0;
      
      // Resetear a posición inicial
      const { error } = await supabase
        .from('cuadrillas_v1')
        .update({ 
          latitud: INICIO.lat, 
          longitud: INICIO.lng 
        })
        .eq('id', 17);
      
      if (error) {
        console.error('Error reseteando posición:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Posición reseteada al inicio',
        currentStep: 0,
        position: INICIO
      });
    }
    
    if (action === 'next' && isSimulationActive) {
      if (currentStepIndex >= routePoints.length) {
        isSimulationActive = false;
        return NextResponse.json({ 
          success: true, 
          message: 'Simulación completada',
          currentStep: currentStepIndex,
          completed: true
        });
      }
      
      const currentPoint = routePoints[currentStepIndex];
      
      // Actualizar la posición en la base de datos
      const { error } = await supabase
        .from('cuadrillas_v1')
        .update({ 
          latitud: currentPoint.lat, 
          longitud: currentPoint.lng 
        })
        .eq('id', 17);
      
      if (error) {
        console.error('Error actualizando posición:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      
      const response = {
        success: true,
        currentStep: currentStepIndex + 1,
        totalSteps: routePoints.length,
        position: {
          lat: currentPoint.lat,
          lng: currentPoint.lng
        },
        progress: currentPoint.progress,
        completed: currentStepIndex + 1 >= routePoints.length
      };
      
      currentStepIndex++;
      
      if (currentStepIndex >= routePoints.length) {
        isSimulationActive = false;
      }
      
      return NextResponse.json(response);
    }
    
    // Obtener estado actual
    if (action === 'status') {
      return NextResponse.json({
        success: true,
        isActive: isSimulationActive,
        currentStep: currentStepIndex,
        totalSteps: routePoints.length,
        progress: currentStepIndex > 0 ? Math.round((currentStepIndex / routePoints.length) * 100) : 0
      });
    }
    
    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
    
  } catch (error) {
    console.error('Error en API:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('🔍 GET request recibido en update-position');
    
    // Probar consulta a cuadrillas
    const { data, error } = await supabase
      .from('cuadrillas_v1')
      .select('id, codigo, nombre, latitud, longitud')
      .eq('id', 17)
      .single();
    
    if (error) {
      console.error('❌ Error Supabase:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        simulation: {
          isActive: isSimulationActive,
          currentStep: currentStepIndex,
          totalSteps: routePoints.length,
          progress: currentStepIndex > 0 ? Math.round((currentStepIndex / routePoints.length) * 100) : 0
        }
      });
    }
    
    console.log('✅ Cuadrilla encontrada:', data);
    
    return NextResponse.json({
      success: true,
      cuadrilla: data,
      timestamp: new Date().toISOString(),
      simulation: {
        isActive: isSimulationActive,
        currentStep: currentStepIndex,
        totalSteps: routePoints.length,
        progress: currentStepIndex > 0 ? Math.round((currentStepIndex / routePoints.length) * 100) : 0
      }
    });
    
  } catch (error) {
    console.error('💥 Error general:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Error interno: ${error}`,
      simulation: {
        isActive: isSimulationActive,
        currentStep: currentStepIndex,
        totalSteps: routePoints.length,
        progress: currentStepIndex > 0 ? Math.round((currentStepIndex / routePoints.length) * 100) : 0
      }
    }, { status: 500 });
  }
}