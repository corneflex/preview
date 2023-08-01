import { Observable } from 'rxjs';
import { Change } from '../model/change';
import { Service } from '../model/service';

export interface ServiceRepository {
  getServices(label?: string): Promise<Service[]>;

  getServiceById(name: string): Promise<Service>;

  create(service: Service): Promise<Service>;

  delete(name: string): Promise<Service>;

  deleteServices(ids: string[]): Promise<Service[]>;

  observe(label?: string): Observable<Change<Service>>;
}
