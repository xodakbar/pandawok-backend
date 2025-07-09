// src/types/reservas.ts

export interface IReserva {
  _id?: string;
  guestName: string;
  time: string;
  partySize: number;
  salon: string;
  notes?: string;
  origin?: 'Restaurant' | 'Web';
  date: string;
  duration?: string;
  tableId: number;
  status?: string; 
  createdAt?: Date;
  updatedAt?: Date;
}