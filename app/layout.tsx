 export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="es">
        <head>
          <link rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
        </head>
        <body style={{ fontFamily: 'system-ui, Arial, sans-serif' }}>
          <header style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>
            <nav style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a href="/">Inicio</a>
              <a href="/sites-v1" style={{ fontWeight: 'bold', color: '#28a745' }}>Sites</a>
              <a href="/cuadrillas">Cuadrillas</a>
              <a href="/tickets-v1" style={{ fontWeight: 'bold', color: '#007bff' }}>Tickets</a>
              <a href="/map">Mapa</a>
            </nav>
          </header>
          <main style={{ padding: '16px', maxWidth: 1300, margin: '0 auto' }}>{children}</main>
        </body>
      </html>
    );
  }
