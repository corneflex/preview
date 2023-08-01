import { Inject } from '@nestjs/common';
import { Observable, concat, filter, map, merge, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Change, ChangeStatus } from '../model/change';
import { Deployment } from '../model/deployment';
import { deploymentConfigToken } from '../model/deployment.config-token';
import { Preview, PreviewState } from '../model/preview';
import { Service } from '../model/service';
import { serviceConfigToken } from '../model/service.config-token';
import { VirtualService } from '../model/virtual-service';
import { virtualServiceConfigToken } from '../model/virtual-service.config-token';
import { DeploymentRepository } from '../ports/deployment.repository';
import { deploymentRepositoryToken } from '../ports/deployment.repository-token';
import { ServiceRepository } from '../ports/service.repository';
import { serviceRepositoryToken } from '../ports/service.repository-token';
import { virtualServiceRepositoryToken } from '../ports/virtual-service.repository-token';

export class PreviewService {
  changes$: Observable<Change<Preview>>;

  constructor(
    @Inject(deploymentRepositoryToken)
    private deploymentRepository: DeploymentRepository,
    @Inject(deploymentConfigToken)
    private deployConfig: Deployment,
    @Inject(serviceRepositoryToken)
    private serviceRepository: ServiceRepository,
    @Inject(serviceConfigToken)
    private serviceConfig: Service,
    @Inject(virtualServiceRepositoryToken)
    private virtualServiceRepository: ServiceRepository,
    @Inject(virtualServiceConfigToken)
    private virtualServiceConfig: VirtualService
  ) {
    const informer$ = this.deploymentRepository.observe(deployConfig.tag);

    const serviceInformer$ = this.serviceRepository
      .observe(serviceConfig.tag)
      .pipe(
        filter(
          (change: Change<Service>) => change.status === ChangeStatus.DELETED
        )
      );
    const virtualServiceInformer$ = this.virtualServiceRepository
      .observe(virtualServiceConfig.tag)
      .pipe(
        filter(
          (change: Change<Service>) => change.status === ChangeStatus.DELETED
        )
      );

    this.changes$ = merge(informer$, serviceInformer$, virtualServiceInformer$).pipe(
      map((change: Change<any>) => ({
        ...change,
        obj: change.obj
          ? new Preview(
              change.obj.id,
              this.getName(change.obj.id),
              PreviewState[change.obj.labels?.state] ?? PreviewState.FREE,
              change.obj.labels?.allocatedTo
            )
          : null,
      }))
    );
  }

  async getById(id: string): Promise<Preview> {
    const deployment = await this.deploymentRepository.getById(
      `${this.deployConfig.tag}-${id}`
    );
    return new Preview(
      id,
      this.getName(id),
      PreviewState[deployment.labels?.state],
      deployment.labels?.allocatedTo
    );
  }

  async getAll(state = PreviewState.All): Promise<Preview[]> {
    return (await this.deploymentRepository.get(this.deployConfig.tag))
      .filter((deployment: Deployment) =>
        state === PreviewState.All ? true : deployment.labels?.state === state
      )
      .map(
        (deployment) =>
          new Preview(
            deployment.id,
            this.getName(deployment.id),
            PreviewState[deployment.labels?.sate] ?? PreviewState.FREE,
            deployment.labels?.allocatedTo
          )
      );
  }

  async save(preview: Preview): Promise<void> {
    await this.deploymentRepository.save({
      id: preview.id,
      name: preview.name,
      labels: { allocatedTo: preview.allocatedTo, state: preview.state },
    });
  }

  async delete(id: string): Promise<void> {
    await this.deploymentRepository.delete(`${this.deployConfig.tag}-${id}`);
    await this.serviceRepository.delete(`${this.serviceConfig.tag}-${id}`);
    await this.virtualServiceRepository.delete(
      `${this.virtualServiceConfig.tag}-${id}`
    );
  }

  async create(): Promise<Preview> {
    const id = uuid();
    await this.createDeployment(id);
    await this.createService(id);
    await this.createVirtualService(id);
    return new Preview(id, this.getName(id), PreviewState.FREE);
  }

  private async createDeployment(id: string): Promise<Deployment> {
    const deployName = `${this.deployConfig.tag}-${id}`;
    const deployConfig: Deployment = JSON.parse(
      JSON.stringify(this.deployConfig)
    );

    const deployment: Deployment = {
      ...deployConfig,
      id,
      name: deployName,
      labels: {
        ...deployConfig.labels,
        id,
        state: PreviewState.FREE,
        allocatedTo: undefined,
      },
    };

    return await this.deploymentRepository.create(deployment);
  }

  private async createService(id: string): Promise<Service> {
    const serviceConfig: Service = JSON.parse(
      JSON.stringify(this.serviceConfig)
    );
    const service: Service = {
      ...this.serviceConfig,
      name: `${serviceConfig.tag}-${id}`,
      labels: {
        ...serviceConfig.labels,
        id,
      },
    };

    return await this.serviceRepository.create(service);
  }

  private async createVirtualService(id: string): Promise<VirtualService> {
    const virtualServiceConfig: VirtualService = JSON.parse(
      JSON.stringify(this.virtualServiceConfig)
    );
    const virtualService: VirtualService = {
      ...this.virtualServiceConfig,
      name: `${virtualServiceConfig.tag}-${id}`,
      labels: {
        ...virtualServiceConfig.labels,
        id,
      },
      hosts: this.virtualServiceConfig.hosts,
      http: [
        {
          match: [{ uri: { prefix: `/${id}/` } }],
          rewrite: {
            uri: `/${id}/`,
          },
          route: [
            {
              destination: {
                host: `${this.serviceConfig.tag}-${id}`,
                port: { number: 19006 },
              },
            },
          ],
        },
      ],
    };

    return await this.virtualServiceRepository.create(virtualService);
  }

  async clean() {
    const services = await this.serviceRepository.getServices(
      this.serviceConfig.tag
    );
    const virtualServices = await this.virtualServiceRepository.getServices(
      this.virtualServiceConfig.tag
    );
    const deployments = await this.deploymentRepository.get(
      this.deployConfig.tag
    );
    const servicesIds = services.map((service) => service.id);
    const virtualServiceIds = virtualServices.map((service) => service.id);
    const deploymentIds = deployments.map((deployment) => deployment.id);

    services
      .filter(
        (service) =>
          !virtualServiceIds.includes(service.id) ||
          !deploymentIds.includes(service.id)
      )
      .forEach(async (service) => {
        this.serviceRepository.delete(service.name);
      });

    virtualServices
      .filter(
        (service) =>
          !deploymentIds.includes(service.id) ||
          !servicesIds.includes(service.id)
      )
      .forEach(async (service) => {
        this.virtualServiceRepository.delete(service.name);
      });

    deployments
      .filter(
        (deployment) =>
          !servicesIds.includes(deployment.id) ||
          !virtualServiceIds.includes(deployment.id)
      )
      .forEach(async (deployment) => {
        this.deploymentRepository.delete(deployment.name);
      });
  }

  private getName(id: string): string {
    return `preview-${id}`;
  }
}
