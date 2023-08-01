export interface VirtualService {
  id?: string;
  name?: string;
  tag?: string;
  labels?: Record<string, string>;
  hosts?: string[];
  http?: {
    match: {
      uri: {
        prefix: string;
      };
    }[];
    rewrite?: {
      uri: string;
    };
    route: {
      destination: {
        host: string;
        port: {
          number: number;
        };
      };
    }[];
  }[];
}
