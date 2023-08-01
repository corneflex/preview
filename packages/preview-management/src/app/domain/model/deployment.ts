import { Port } from './port';

export interface Deployment {
  id?: string;
  name?: string;
  tag?: string;
  containers?: Container[];
  labels?: Record<string, string>;
}

interface Container {
  name: string;
  image?: string;
  imagePullPolicy?: string;
  ports?: Port[];
  env?: { name: string; value: string }[];
}
