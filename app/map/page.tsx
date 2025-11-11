import dynamic from 'next/dynamic';

// Importación dinámica: evita que se cargue en el servidor.
const ClientMap = dynamic(() => import('./ClientMap'), { ssr: false });

export default async function MapPageWrapper({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const params = await searchParams;
  console.log('🌐 MapPageWrapper - ticket recibido:', params.ticket);
  return <ClientMap ticketId={params.ticket} />;
}
