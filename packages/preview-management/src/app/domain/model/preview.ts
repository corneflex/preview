export enum PreviewState {
  All = 'ALL',
  FREE = 'FREE',
  BUSY = 'BUSY',
}

export class Preview {
  constructor(
    readonly id: string,
    readonly name: string,
    private _state = PreviewState.FREE,
    private _allocatedTo = undefined
  ) {}

  get state(): PreviewState {
    return this._state;
  }

  markAsFree(): void {
    this._state = PreviewState.FREE;
  }

  markAsBusy(): void {
    this._state = PreviewState.BUSY;
  }

  get allocatedTo(): string {
    return this._allocatedTo;
  }

  allocateToClient(clientId: string): void {
    this._allocatedTo = clientId;
    this.markAsBusy();
  }
}
