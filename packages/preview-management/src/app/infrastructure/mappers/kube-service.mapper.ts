import * as k8s from '@kubernetes/client-node';
import { Inject } from '@nestjs/common';
import { set, get } from 'lodash';
import { kubeServiceConfigToken } from '../adapters/kube-service.config-token';
import { Service } from '../../domain/model/service';

const LABEL_NAME = 'app.kubernetes.io/name';
export function createLabel(name: string): string {
  return `${LABEL_NAME}=${name}`;
}

export class KubeServiceMapper {
  constructor(@Inject(kubeServiceConfigToken) private config: k8s.V1Service) {}

  toKube(service: Service): k8s.V1Service {
    const conf: k8s.V1Service = JSON.parse(JSON.stringify(this.config));
    set(conf, 'metadata.name', service.name);
    set(conf, 'metadata.labels', {
      ...get(conf, 'metadata.labels', {}),
      [LABEL_NAME]: service.tag,
      id: service.id,
      ...service.labels,
    });
    set(conf, 'spec.ports', [...get(conf, 'spec.ports', []), ...service.ports]);
    return conf;
  }

  fromKube(service: k8s.V1Service): Service {
    if (!service) return null;

    return {
      id: service.metadata.labels.id,
      name: service.metadata.name,
      ports: service.spec.ports.map(({ name, protocol, port, targetPort }) => ({
        name,
        protocol,
        port,
        targetPort,
      })),
    };
  }
}
