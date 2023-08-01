import * as k8s from '@kubernetes/client-node';
import { Injectable } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Change } from '../../domain/model/change';
import { Deployment } from '../../domain/model/deployment';
import { DeploymentRepository } from '../../domain/ports/deployment.repository';
import {
  KubeDeploymentMapper,
  createLabel,
} from '../mappers/kube-deployment.mapper';
import { toObservable } from './utils';

const DEFAULT_NAMESPACE = 'default';

@Injectable()
export class KubeDeploymentRepository implements DeploymentRepository {
  private k8sApi: k8s.AppsV1Api;
  private kc = new k8s.KubeConfig();

  constructor(private kubeDeploymentMapper: KubeDeploymentMapper) {
    this.kc.loadFromDefault();
    this.k8sApi = this.kc.makeApiClient(k8s.AppsV1Api);
  }

  async get(
    name?: string,
    namespace = DEFAULT_NAMESPACE
  ): Promise<Deployment[]> {
    const label = createLabel(name);
    try {
      const res = await this.k8sApi.listNamespacedDeployment(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        label
      );
      if (res.response.statusCode === 200) {
        return res.body.items.map(this.kubeDeploymentMapper.fromKube);
      }
    } catch (e) {
      console.log(e?.response?.body?.message);
      throw e;
    }
    return [];
  }

  async getById(
    name: string,
    namespace = DEFAULT_NAMESPACE
  ): Promise<Deployment> {
    try {
      const res = await this.k8sApi.readNamespacedDeployment(name, namespace);
      if (res.response.statusCode === 200) {
        return this.kubeDeploymentMapper.fromKube(res.body);
      }
    } catch (e) {
      console.log(e?.response?.body?.message);
    }
    return null;
  }

  async create(
    deployment: Deployment,
    namespace = DEFAULT_NAMESPACE
  ): Promise<Deployment> {
    try {
      const res = await this.k8sApi.createNamespacedDeployment(
        namespace,
        this.kubeDeploymentMapper.toKube(deployment)
      );
      if (res.response.statusCode === 200) {
        return this.kubeDeploymentMapper.fromKube(res.body);
      }
    } catch (e) {
      console.log(e);
    }
    return null;
  }

  async delete(
    name: string,
    gracePeriod = 0,
    namespace = DEFAULT_NAMESPACE
  ): Promise<Deployment> {
    try {
      const deployment = await this.getById(name);
      const res = await this.k8sApi.deleteNamespacedDeployment(
        name,
        namespace,
        undefined,
        undefined,
        gracePeriod
      );
      if (res.response.statusCode === 200) {
        return deployment;
      }
    } catch (e) {
      console.log(e?.response?.body?.message ?? e);
    }
    return null;
  }

  async save(deployment: Deployment): Promise<void> {
    const kubeDeployment = this.kubeDeploymentMapper.toKube(deployment);
    this.patch(deployment.name, [
      {
        op: 'replace',
        path: '/metadata/labels',
        value: {
          ...kubeDeployment.metadata.labels,
        },
      },
    ]);
  }

  private async patch(
    name: string,
    patch: { op: string; path: string; value: any }[],
    namespace = DEFAULT_NAMESPACE
  ): Promise<Deployment> {
    const options = {
      headers: { 'Content-type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH },
    };
    try {
      const res = await this.k8sApi.patchNamespacedDeployment(
        name,
        namespace,
        patch,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        options
      );
      if (res.response.statusCode === 200) {
        return this.kubeDeploymentMapper.fromKube(res.body);
      }
    } catch (e) {
      console.log(e);
    }
    return null;
  }

  observe(
    name: string,
    namespace = DEFAULT_NAMESPACE
  ): Observable<Change<Deployment>> {
    const label = createLabel(name);
    const listFn = () =>
      this.k8sApi.listNamespacedDeployment(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        label
      );

    const informer = k8s.makeInformer(
      this.kc,
      `/apis/apps/v1/namespaces/${namespace}/deployments`,
      listFn,
      label
    );
    return toObservable(informer).pipe(
      map(({ status, obj }) => ({
        status,
        obj: this.kubeDeploymentMapper.fromKube(obj),
      }))
    );
  }
}
