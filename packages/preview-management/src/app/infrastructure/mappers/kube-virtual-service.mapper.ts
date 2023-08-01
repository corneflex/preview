import * as k8s from '@kubernetes/client-node';
import { Inject } from '@nestjs/common';
import { get, set } from 'lodash';
import { VirtualService } from '../../domain/model/virtual-service';
import { kubeVirtualServiceConfigToken } from '../adapters/kube-virtual-service.config-token';

const LABEL_NAME = 'app.kubernetes.io/name';
export type KubeVirtualService = k8s.KubernetesObject & { spec: any };

export class KubeVirtualServiceMapper {
  constructor(
    @Inject(kubeVirtualServiceConfigToken) private config: KubeVirtualService
  ) {}

  toKube(service: VirtualService): k8s.KubernetesObject {
    const conf: k8s.KubernetesObject = JSON.parse(
      JSON.stringify(this.config).replace(/\${PREVIEW_ID}/g, service.id)
    );
    set(conf, 'metadata.name', service.name);
    set(conf, 'metadata.labels', {
      ...get(conf, 'metadata.labels', {}),
      [LABEL_NAME]: service.tag,
      id: service.id,
      ...service.labels,
    });
    set(conf, 'spec', {
      ...get(conf, 'spec', {}),
      hosts: [...service.hosts],
      http: JSON.parse(JSON.stringify(service.http)),
    });
    return conf;
  }

  fromKube(service: KubeVirtualService): VirtualService {
    if (!service) return null;

    return {
      id: service.metadata.labels.id,
      name: service.metadata.name,
      labels: service.metadata.labels,
      hosts: service.spec.hosts,
      http: [...service.spec.http],
    };
  }
}
