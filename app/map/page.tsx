import dynamic from 'next/dynamic';

// Importación dinámica: evita que se cargue en el servidor.
const ClientMap = dynamic(() => import('./ClientMap'), { ssr: false });

export default function MapPageWrapper() {
  return <ClientMap />;
}
