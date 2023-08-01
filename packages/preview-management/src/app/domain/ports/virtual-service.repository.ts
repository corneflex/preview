import { Observable } from 'rxjs';
import { VirtualService } from '../model/virtual-service';
import { Change } from '../model/change';

export interface VirtualServiceRepository {
  create(virtualService: VirtualService): Promise<VirtualService>;

  delete(name: string): Promise<void>;

  getServices(label?: string): Promise<VirtualService[]>;

  getVirtualServicesIds(): Promise<string[]>;

  getServiceById(name: string): Promise<VirtualService>;

  observe(labelSelector?: string): Observable<Change<VirtualService>>;
}
