export interface Client {
  id: number;
  nombre: string;
  apellido: string;
  correo_electronico: string;
  telefono: string;
  empresa?: string;
  visitas: number;
  idioma?: string;
  ultima_visita: string | null;
  cumpleaños?: string;
  tags: string[];
  gasto_total: number;
  gasto_por_visita: number;
  numero_membresia?: string;
  nivel_membresia?: string;
  fecha_creacion: string;
  notas: string;
  es_frecuente?: boolean;
  en_lista_negra?: boolean;
  fecha_actualizacion: string;
}
