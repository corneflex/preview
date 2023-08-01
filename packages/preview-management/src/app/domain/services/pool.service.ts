import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { ChangeStatus } from '../model/change';
import { Preview, PreviewState } from '../model/preview';
import { PreviewService } from './preview.service';

const POOL_SIZE = 1;
const MAX = 10;

@Injectable()
export class PreviewPoolService {
  private previewsPool: Preview[];
  private previewAllocationMap: Map<string, Preview>;
  private previewAdded$: Subject<Preview> = new Subject();

  constructor(private previewService: PreviewService) {
    this.previewsPool = [];
    this.previewAllocationMap = new Map();
    this.initializePool();
    this.startWatching();
  }

  private async initializePool() {
    await this.previewService.clean();
    const previews = await this.previewService.getAll();

    previews.forEach((preview) => {
      if (preview.allocatedTo) {
        this.previewAllocationMap.set(preview.allocatedTo, preview);
      } else {
        if (preview.state === PreviewState.FREE) {
          this.previewsPool.push(preview);
        }
      }
    });

    if (previews.length >= MAX) {
      return;
    }

    if (this.previewsPool.length < POOL_SIZE) {
      const additionalPreviewNeeded = POOL_SIZE - this.previewsPool.length;

      for (let i = 0; i < additionalPreviewNeeded; i++) {
        const preview = await this.previewService.create();
        if (preview) {
          this.previewsPool.push(preview);
        }
      }
    }
  }

  async allocatePreview(clientId: string): Promise<Preview> {
    if (this.previewsPool.length === 0) {
      await this.createNewPreview();
    }

    const preview = this.previewsPool.pop();
    if (preview) {
      preview.allocateToClient(clientId);
      this.previewAllocationMap.set(clientId, preview);
      await this.previewService.save(preview);
    }
    return preview;
  }

  async releasePreview(clientId: string): Promise<void> {
    const previewToRelease = this.previewAllocationMap.get(clientId);
    if (!previewToRelease) {
      throw new Error(`No pod allocated to client: ${clientId}`);
    }

    previewToRelease.markAsFree();
    await this.previewService.save(previewToRelease);
    this.previewAllocationMap.delete(clientId);
    this.previewsPool.push(previewToRelease);

    if (this.previewsPool.length === POOL_SIZE) {
      await this.previewService.delete(previewToRelease.id);
    }
  }

  private startWatching(): void {
    this.previewService.changes$.subscribe({
      next: async (change) => {
        switch (change.status) {
          case ChangeStatus.ADDED:
            this.previewsPool.push(change.obj);
            this.previewAdded$.next(change.obj);
            break;
          case ChangeStatus.DELETED:
            this.previewsPool = this.previewsPool.filter(
              (preview) => preview.name !== change.obj.name
            );
            this.previewAllocationMap.delete(change.obj.allocatedTo);
            await this.previewService.clean();

            break;
        }
      },
      error: (err) => {
        console.error('Error in informer subscription', err);
      },
    });
  }

  private async createNewPreview(): Promise<Preview> {
    const previews = await this.previewService.getAll();
    if (previews.length === MAX) {
      return;
    }
    return await this.previewService.create();
  }
}
