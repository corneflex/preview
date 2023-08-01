import * as k8s from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';
import { VirtualServiceRepository } from '../../domain/ports/virtual-service.repository';
import { VirtualService } from '../../domain/model/virtual-service';
import { Observable, map } from 'rxjs';
import {
  KubeVirtualService,
  KubeVirtualServiceMapper,
} from '../mappers/kube-virtual-service.mapper';
import { createLabel } from '../mappers/kube-deployment.mapper';
import { toObservable } from './utils';
import { Change } from '../../domain/model/change';

const DEFAULT_NAMESPACE = 'default';

@Injectable()
export class KubeVirtualServiceRepository implements VirtualServiceRepository {
  private k8sApi: k8s.KubernetesObjectApi;
  private kc = new k8s.KubeConfig();

  constructor(
    private readonly logger: Logger,
    private readonly kubeVirtualServiceMapper: KubeVirtualServiceMapper
  ) {
    this.kc.loadFromDefault();
    this.k8sApi = k8s.KubernetesObjectApi.makeApiClient(this.kc);
  }
  getVirtualServicesIds(): Promise<string[]> {
    throw new Error('Method not implemented.');
  }

  observe(name?: string): Observable<Change<VirtualService>> {
    const label = createLabel(name);
    const informer = this.makeInformer(label);
    return toObservable(informer).pipe(
      map(({ status, obj }) => ({
        status,
        obj: this.kubeVirtualServiceMapper.fromKube(obj as KubeVirtualService),
      }))
    );
  }

  async getServices(
    name?: string,
    namespace = DEFAULT_NAMESPACE
  ): Promise<VirtualService[]> {
    const label = createLabel(name);
    try {
      const res = await this.k8sApi.list(
        'networking.istio.io/v1alpha3',
        'VirtualService',
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        label
      );
      if (res.response.statusCode === 200) {
        return res.body.items.map(this.kubeVirtualServiceMapper.fromKube);
      }
    } catch (e) {
      this.logger.error(e, 'KubeVirtualServiceRepository');
    }
    return [];
  }

  async getServiceById(name: string): Promise<VirtualService> {
    try {
      const res = await this.getServices(`metadata.name=${name}`);
      if (res.length > 0) {
        return res[0];
      }
    } catch (e) {
      this.logger.error(e, 'KubeVirtualServiceRepository');
    }
    return null;
  }

  private makeInformer(
    label?: string,
    namespace = DEFAULT_NAMESPACE
  ): k8s.Informer<k8s.KubernetesObject> {
    const listFn = () =>
      this.k8sApi.list(
        'networking.istio.io/v1beta1',
        'VirtualService',
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        label
      );

    return k8s.makeInformer(
      this.kc,
      `/apis/networking.istio.io/v1beta1/namespaces/${namespace}/virtualservices`,
      listFn,
      label
    );
  }

  async create(
    virtualService: VirtualService,
    namespace?: string
  ): Promise<VirtualService> {
    try {
      const kubeVirtualService =
        this.kubeVirtualServiceMapper.toKube(virtualService);
      kubeVirtualService.metadata.namespace = namespace;
      const res = await this.k8sApi.create(kubeVirtualService);
      if (res.response.statusCode === 200) {
        return this.kubeVirtualServiceMapper.fromKube(
          res.body as KubeVirtualService
        );
      }
    } catch (e) {
      this.logger.error(e, 'KubeVirtualServiceRepository');
    }
    return null;
  }

  async delete(name: string, namespace?: string): Promise<void> {
    try {
      const object: k8s.KubernetesObject = {
        apiVersion: 'networking.istio.io/v1alpha3',
        kind: 'VirtualService',
        metadata: {
          name: name,
          namespace: namespace,
        },
      };

      await this.k8sApi.delete(object, namespace);
    } catch (e) {
      this.logger.error(
        e.response?.body?.message ?? e,
        'KubeVirtualServiceRepository'
      );
    }
    return null;
  }
}
