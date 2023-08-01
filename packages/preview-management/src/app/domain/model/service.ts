import { Port } from './port';

export interface Service {
  id?: string;
  name?: string;
  tag?: string;
  ports?: Port[];
  labels?: Record<string, string>;
}
