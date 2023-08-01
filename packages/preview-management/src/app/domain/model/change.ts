export enum ChangeStatus {
  CONNECTED = 'CONNECTED',
  ADDED = 'ADDED',
  MODIFIED = 'MODIFIED',
  DELETED = 'DELETED',
}

export interface Change<T> {
  status: ChangeStatus;
  obj: T;
}
