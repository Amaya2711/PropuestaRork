'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function NuevaCuadrilla() {
  const [mensaje, setMensaje] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    const form = new FormData(e.target);
    const payload = Object.fromEntries(form.entries());
    const { error } = await supabase.from('cuadrillas').insert(payload);
    if (error) setMensaje(error.message);
    else { setMensaje('Cuadrilla creada correctamente'); e.target.reset(); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Registrar Nueva Cuadrilla</h3>
      <input name="codigo" placeholder="Código" required /><br />
      <input name="nombre" placeholder="Nombre" required /><br />
      <input name="supervisor" placeholder="Supervisor" /><br />
      <input name="telefono" placeholder="Teléfono" /><br />
      <input name="region" placeholder="Región" /><br />
      <input name="zona" placeholder="Zona" /><br />
      <select name="turno" defaultValue="ROTATIVO"><option>DIA</option><option>NOCHE</option><option>ROTATIVO</option></select><br />
      <label>Activo: <select name="activo" defaultValue="true"><option value="true">Sí</option><option value="false">No</option></select></label><br />
      <input type="number" name="capacidad" placeholder="Capacidad" min={1} defaultValue={1} /><br />
      <textarea name="notas" placeholder="Notas" /><br />
      <button type="submit">Guardar</button>
      <p>{mensaje}</p>
    </form>
  );
}
