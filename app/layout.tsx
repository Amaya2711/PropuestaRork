 import type { Metadata } from 'next'
import { AuthProvider } from './context/AuthContext'
import AppContent from './components/AppContent'

export const metadata: Metadata = {
  title: 'Sistema de Gestión - Rork',
  description: 'Sistema de Gestión con Sites, Cuadrillas y Tickets',
}

 export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="es">
        <head>
          <link rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
        </head>
        <body style={{ fontFamily: 'system-ui, Arial, sans-serif' }}>
          <AuthProvider>
            <AppContent>
              {children}
            </AppContent>
          </AuthProvider>
        </body>
      </html>
    );
  }
