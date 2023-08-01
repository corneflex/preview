import { Observable } from 'rxjs';
import { Deployment } from '../model/deployment';
import { Change } from '../model/change';

export interface DeploymentRepository {
  get(selector?: string, namespace?: string): Promise<Deployment[]>;

  getById(name: string, namespace?: string): Promise<Deployment>;

  create(deployment: Deployment, namespace?: string): Promise<Deployment>;

  delete(
    name: string,
    gracePeriod?: number,
    namespace?: string
  ): Promise<Deployment>;

  save(deployment: Deployment, namespace?: string): Promise<void>;

  observe(
    selector?: string,
    namespace?: string
  ): Observable<Change<Deployment>>;
}
