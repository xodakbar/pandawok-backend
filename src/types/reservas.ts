export interface Reserva {
  id: number;
  cliente_id: number;
  fecha_reserva: Date | string;
  cantidad_personas: number;
  notas?: string | null;
  estado: string;
  fecha_creacion?: Date | string;
  fecha_actualizacion?: Date | string;
  creado_por?: number;
}