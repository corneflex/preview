import * as k8s from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';
import { ServiceRepository } from '../../domain/ports/service.repository';
import { Service } from '../../domain/model/service';
import { KubeServiceMapper } from '../mappers/kube-service.mapper';
import { Observable, map } from 'rxjs';
import { Change } from '../../domain/model/change';
import { toObservable } from './utils';
import { createLabel } from '../mappers/kube-deployment.mapper';

const DEFAULT_NAMESPACE = 'default';
@Injectable()
export class KubeServiceRepository implements ServiceRepository {
  private k8sApi: k8s.CoreV1Api;
  private kc = new k8s.KubeConfig();

  constructor(
    private kubeServiceMapper: KubeServiceMapper,
    private readonly logger: Logger
  ) {
    this.kc.loadFromDefault();
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  async getServices(
    name?: string,
    namespace = DEFAULT_NAMESPACE
  ): Promise<Service[]> {
    const label = createLabel(name);
    try {
      const res = await this.k8sApi.listNamespacedService(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        label
      );
      if (res.response.statusCode === 200) {
        return res.body.items.map(this.kubeServiceMapper.fromKube);
      }
    } catch (e) {
      this.logger.error(e, 'KubeServiceRepository');
    }
    return [];
  }

  async getServiceById(
    name: string,
    namespace = DEFAULT_NAMESPACE
  ): Promise<Service> {
    try {
      const res = await this.k8sApi.readNamespacedService(name, namespace);
      if (res.response.statusCode === 200) {
        return this.kubeServiceMapper.fromKube(res.body);
      }
    } catch (e) {
      this.logger.error(e, 'KubeServiceRepository');
    }
    return null;
  }

  async create(
    service: Service,
    namespace = DEFAULT_NAMESPACE
  ): Promise<Service> {
    try {
      const res = await this.k8sApi.createNamespacedService(
        namespace,
        this.kubeServiceMapper.toKube(service)
      );
      if (res.response.statusCode === 200) {
        return this.kubeServiceMapper.fromKube(res.body);
      }
    } catch (e) {
      this.logger.error(e, 'KubeServiceRepository');
    }
    return null;
  }

  async deleteServices(serviceIds: string[]) {
    const services = [];
    for (const id of serviceIds) {
      const res = await this.delete(`preview-svc-${id}`);
      services.push(res);
    }
    return services;
  }

  async delete(name: string, namespace = DEFAULT_NAMESPACE): Promise<Service> {
    try {
      const res = await this.k8sApi.deleteNamespacedService(name, namespace);
      if (res.response.statusCode === 200) {
        return this.kubeServiceMapper.fromKube(res.body);
      }
    } catch (e) {
      this.logger.error(
        e.response?.body?.message ?? e,
        'KubeServiceRepository'
      );
    }

    return null;
  }

  observe(name?: string): Observable<Change<Service>> {
    const label = createLabel(name);
    const informer = this.makeInformer(label);
    return toObservable(informer).pipe(
      map(({ status, obj }) => ({
        status,
        obj: this.kubeServiceMapper.fromKube(obj),
      })),
    );
  }

  private makeInformer(
    label: string,
    namespace = DEFAULT_NAMESPACE
  ): k8s.Informer<k8s.V1Service> {
    const listFn = () =>
      this.k8sApi.listNamespacedService(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        label
      );

    return k8s.makeInformer(
      this.kc,
      `/api/v1/namespaces/${namespace}/services`,
      listFn,
      label
    );
  }
}
