// Servicio para manejar la simulación de movimiento de cuadrillas
class CuadrillaSimulationService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  async startSimulation() {
    if (this.isRunning) {
      console.log('⚠️ Simulación ya está corriendo');
      return { success: false, message: 'Simulación ya está activa' };
    }

    try {
      // Iniciar la simulación
      const response = await fetch('/api/cuadrillas/update-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      if (!response.ok) {
        throw new Error('Error iniciando simulación');
      }

      this.isRunning = true;
      console.log('🚀 Simulación iniciada');

      // Configurar intervalo para actualizar cada 5 segundos
      this.intervalId = setInterval(async () => {
        try {
          const updateResponse = await fetch('/api/cuadrillas/update-position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'next' })
          });

          if (updateResponse.ok) {
            const data = await updateResponse.json();
            console.log(`📍 Paso ${data.currentStep}/${data.totalSteps} - Progreso: ${data.progress}%`);
            
            if (data.completed) {
              console.log('✅ Simulación completada');
              this.stopSimulation();
            }
          }
        } catch (error) {
          console.error('Error en actualización:', error);
        }
      }, 5000); // 5 segundos

      return { success: true, message: 'Simulación iniciada correctamente' };
    } catch (error) {
      console.error('Error iniciando simulación:', error);
      return { success: false, message: 'Error iniciando simulación' };
    }
  }

  async stopSimulation() {
    if (!this.isRunning) {
      return { success: false, message: 'No hay simulación activa' };
    }

    try {
      // Detener el intervalo
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      // Notificar al servidor que se detuvo
      const response = await fetch('/api/cuadrillas/update-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });

      this.isRunning = false;
      console.log('⏹️ Simulación detenida');

      return { success: true, message: 'Simulación detenida' };
    } catch (error) {
      console.error('Error deteniendo simulación:', error);
      return { success: false, message: 'Error deteniendo simulación' };
    }
  }

  async resetSimulation() {
    try {
      // Detener si está corriendo
      if (this.isRunning) {
        await this.stopSimulation();
      }

      // Resetear posición
      const response = await fetch('/api/cuadrillas/update-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });

      if (response.ok) {
        console.log('🔄 Simulación reseteada');
        return { success: true, message: 'Simulación reseteada al inicio' };
      } else {
        throw new Error('Error reseteando simulación');
      }
    } catch (error) {
      console.error('Error reseteando simulación:', error);
      return { success: false, message: 'Error reseteando simulación' };
    }
  }

  async getSimulationStatus() {
    try {
      const response = await fetch('/api/cuadrillas/update-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, ...data };
      } else {
        throw new Error('Error obteniendo estado');
      }
    } catch (error) {
      console.error('Error obteniendo estado:', error);
      return { success: false, message: 'Error obteniendo estado' };
    }
  }

  isSimulationRunning() {
    return this.isRunning;
  }
}

// Crear instancia singleton
export const cuadrillaSimulation = new CuadrillaSimulationService();