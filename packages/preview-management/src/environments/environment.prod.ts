import { Deployment } from '../app/domain/model/deployment';
import * as k8s from '@kubernetes/client-node';
import { Service } from '../app/domain/model/service';
import { VirtualService } from '../app/domain/model/virtual-service';

const LABEL_NAME = 'app.kubernetes.io/name';
export const DEPLOYMENT_TAG = 'preview';
export const SERVICE_TAG = 'preview-service';

export const config: {
  deployment: Deployment;
  kubeDeployment: k8s.V1Deployment;
  service: Service;
  kubeService: k8s.V1Service;
  virtualService: VirtualService;
  kubeVirtualService: k8s.KubernetesObject & {
    spec: { gateways: string[] };
  };
} = {
  deployment: {
    tag: DEPLOYMENT_TAG,
    containers: [
      {
        name: 'expo-preview',
        image: 'preview',
        imagePullPolicy: 'IfNotPresent',
        ports: [
          {
            containerPort: 19006,
            name: 'expo',
          },
        ],
      },
    ],
  },
  kubeDeployment: {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      labels: {
        [LABEL_NAME]: DEPLOYMENT_TAG,
      },
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          [LABEL_NAME]: DEPLOYMENT_TAG,
        },
      },
      template: {
        metadata: {
          labels: {
            [LABEL_NAME]: DEPLOYMENT_TAG,
          },
        },
      },
    },
  },
  service: {
    tag: SERVICE_TAG,
    ports: [
      {
        name: 'expo',
        protocol: 'TCP',
        port: 19006,
        targetPort: 19006,
      },
    ],
  },
  kubeService: {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      labels: {
        [LABEL_NAME]: SERVICE_TAG,
      },
    },
    spec: {
      selector: {
        [LABEL_NAME]: DEPLOYMENT_TAG,
      },
    },
  },
  virtualService: {
    tag: 'preview-virtual-service',
    hosts: ['*'],
    http: [
      {
        match: [
          {
            uri: {
              prefix: '/',
            },
          },
        ],
        rewrite: {
          uri: '/',
        },
        route: [
          {
            destination: {
              host: 'preview-service',
              port: {
                number: 19006,
              },
            },
          },
        ],
      },
    ],
  },
  kubeVirtualService: {
    apiVersion: 'networking.istio.io/v1alpha3',
    kind: 'VirtualService',
    metadata: {
      labels: {
        [LABEL_NAME]: 'preview-virtual-service',
      },
    },
    spec: {
      gateways: ['ingress-gateway'],
    },
  },
};
