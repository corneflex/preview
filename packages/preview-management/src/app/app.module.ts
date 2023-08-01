import { Logger, Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { deploymentConfigToken } from './domain/model/deployment.config-token';
import { config } from '../environments/environment';
import { deploymentRepositoryToken } from './domain/ports/deployment.repository-token';
import { KubeDeploymentRepository } from './infrastructure/adapters/kube-deployment.repository';
import { PreviewPoolService } from './domain/services/pool.service';
import { kubeDeploymentConfigToken } from './infrastructure/adapters/kube-deployment.config-token';
import { PreviewService } from './domain/services/preview.service';
import { KubeDeploymentMapper } from './infrastructure/mappers/kube-deployment.mapper';
import { KubeServiceRepository } from './infrastructure/adapters/kube-service.repository';
import { serviceRepositoryToken } from './domain/ports/service.repository-token';
import { serviceConfigToken } from './domain/model/service.config-token';
import { kubeServiceConfigToken } from './infrastructure/adapters/kube-service.config-token';
import { KubeServiceMapper } from './infrastructure/mappers/kube-service.mapper';
import { kubeVirtualServiceConfigToken } from './infrastructure/adapters/kube-virtual-service.config-token';
import { KubeVirtualServiceRepository } from './infrastructure/adapters/kube-virtual-service.repository';
import { virtualServiceRepositoryToken } from './domain/ports/virtual-service.repository-token';
import { KubeVirtualServiceMapper } from './infrastructure/mappers/kube-virtual-service.mapper';
import { virtualServiceConfigToken } from './domain/model/virtual-service.config-token';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    PreviewPoolService,
    PreviewService,
    Logger,
    { provide: deploymentConfigToken, useValue: config.deployment },
    { provide: serviceConfigToken, useValue: config.service },
    { provide: virtualServiceConfigToken, useValue: config.virtualService },
    { provide: kubeDeploymentConfigToken, useValue: config.kubeDeployment },
    { provide: kubeServiceConfigToken, useValue: config.kubeService },
    {
      provide: kubeVirtualServiceConfigToken,
      useValue: config.kubeVirtualService,
    },
    { provide: deploymentRepositoryToken, useClass: KubeDeploymentRepository },
    { provide: serviceRepositoryToken, useClass: KubeServiceRepository },
    {
      provide: virtualServiceRepositoryToken,
      useClass: KubeVirtualServiceRepository,
    },
    KubeDeploymentMapper,
    KubeServiceMapper,
    KubeVirtualServiceMapper,
  ],
})
export class AppModule {}
