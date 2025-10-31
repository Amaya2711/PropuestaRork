// Extensión de tipos para Leaflet Routing Machine
import 'leaflet';
import 'leaflet-routing-machine';

declare module 'leaflet' {
  namespace Routing {
    interface RoutingControl extends L.Control {
      on(type: string, fn: Function): this;
      off(type: string, fn?: Function): this;
    }
    
    function control(options?: any): RoutingControl;
    function osrmv1(options?: any): any;
  }
}