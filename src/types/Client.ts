export interface Client {
  id: string;
  nombre: string;
  apellido: string;
  correo_electronico: string;
  telefono: string;
  es_frecuente: boolean;
  en_lista_negra: boolean;
  notas: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  tags: string[];
  visitas: number;
  ultima_visita: string | null;
  gasto_total: number;
  gasto_por_visita: number;
}
