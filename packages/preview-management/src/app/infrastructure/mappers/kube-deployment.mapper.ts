import * as k8s from '@kubernetes/client-node';
import { Inject } from '@nestjs/common';
import { set, get } from 'lodash';
import { Deployment } from '../../domain/model/deployment';
import { kubeDeploymentConfigToken } from '../adapters/kube-deployment.config-token';

const LABEL_NAME = 'app.kubernetes.io/name';
export function createLabel(name: string): string {
  return `${LABEL_NAME}=${name}`;
}

export class KubeDeploymentMapper {
  constructor(
    @Inject(kubeDeploymentConfigToken) private config: k8s.V1Deployment
  ) {}

  toKube(deployment: Deployment): k8s.V1Deployment {
    const deploymentResolved = JSON.parse(
      JSON.stringify(deployment).replace(/\${PREVIEW_ID}/g, deployment.id)
    );
    const conf: k8s.V1Deployment = JSON.parse(
      JSON.stringify(this.config).replace(
        /\${PREVIEW_ID}/g,
        deploymentResolved.id
      )
    );
    set(conf, 'metadata.name', deploymentResolved.name);
    set(conf, 'metadata.labels', {
      ...get(conf, 'metadata.labels', {}),
      [LABEL_NAME]: deploymentResolved.tag,
      id: deploymentResolved.id,
      ...deploymentResolved.labels,
    });
    set(conf, 'spec.template.spec.containers', [
      ...deploymentResolved.containers,
    ]);

    return conf;
  }

  fromKube(deployment: k8s.V1Deployment): Deployment {
    if (!deployment) return null;

    return {
      id: deployment.metadata.labels.id,
      name: deployment.metadata.name,
      containers: deployment.spec.template.spec.containers.map((container) => ({
        name: container.name,
        image: container.image,
        ports: container.ports.map((port) => ({
          name: port.name,
          containerPort: port.containerPort,
        })),
      })),
    };
  }
}
