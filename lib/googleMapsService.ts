// Google Maps Service for Routes, Places, and Directions API integration

interface GoogleRouteRequest {
  origin: {
    location: {
      latLng: {
        latitude: number;
        longitude: number;
      };
    };
  };
  destination: {
    location: {
      latLng: {
        latitude: number;
        longitude: number;
      };
    };
  };
  travelMode: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
  routingPreference?: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
  computeAlternativeRoutes?: boolean;
  routeModifiers?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
  };
}

interface GoogleRouteResponse {
  routes: Array<{
    distanceMeters: number;
    duration: string;
    staticDuration: string;
    polyline: {
      encodedPolyline: string;
    };
    legs: Array<{
      distanceMeters: number;
      duration: string;
      staticDuration: string;
      polyline: {
        encodedPolyline: string;
      };
      startLocation: {
        latLng: {
          latitude: number;
          longitude: number;
        };
      };
      endLocation: {
        latLng: {
          latitude: number;
          longitude: number;
        };
      };
    }>;
  }>;
}

export class GoogleMapsService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  }

  // Usar la nueva Routes API de Google
  async calculateRouteWithRoutesAPI(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<GoogleRouteResponse | null> {
    try {
      const requestBody: GoogleRouteRequest = {
        origin: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng
            }
          }
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: true
        }
      };

      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Routes API Error:', response.status, errorText);
        return null;
      }

      const data: GoogleRouteResponse = await response.json();
      return data;

    } catch (error) {
      console.error('❌ Error calling Routes API:', error);
      return null;
    }
  }

  // Buscar lugares usando Places API (New)
  async searchNearbyPlaces(
    location: { lat: number; lng: number },
    radius: number,
    includedTypes: string[] = ['establishment']
  ) {
    try {
      const requestBody = {
        includedTypes: includedTypes,
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng
            },
            radius: radius * 1000 // Convert km to meters
          }
        }
      };

      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.location,places.id,places.formattedAddress'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Places API Error:', response.status, errorText);
        return [];
      }

      const data = await response.json();
      return data.places || [];

    } catch (error) {
      console.error('❌ Error calling Places API:', error);
      return [];
    }
  }

  // Geocodificar dirección usando Geocoding API
  async geocodeAddress(address: string) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
      );

      if (!response.ok) {
        console.error('❌ Geocoding API Error:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formatted_address: result.formatted_address
        };
      }

      return null;

    } catch (error) {
      console.error('❌ Error calling Geocoding API:', error);
      return null;
    }
  }

  // Decodificar polyline de Google
  decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
    const points: Array<{ lat: number; lng: number }> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        lat: lat / 1e5,
        lng: lng / 1e5
      });
    }

    return points;
  }

  // Calcular distancia entre dos puntos usando fórmula de Haversine
  calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Instancia singleton del servicio
export const googleMapsService = new GoogleMapsService();