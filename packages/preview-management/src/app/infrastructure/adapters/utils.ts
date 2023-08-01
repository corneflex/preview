import * as k8s from '@kubernetes/client-node';
import { Observable } from 'rxjs';
import { Change, ChangeStatus } from '../../domain/model/change';

export function toObservable<T>(
  informer: k8s.Informer<T>
): Observable<Change<T>> {
  return new Observable((subscriber) => {
    informer.on('add', (obj) => {
      subscriber.next({ status: ChangeStatus.ADDED, obj });
    });
    informer.on('update', (obj) => {
      subscriber.next({ status: ChangeStatus.MODIFIED, obj });
    });
    informer.on('delete', (obj) => {
      subscriber.next({ status: ChangeStatus.DELETED, obj });
    });
    informer.on('error', (err) => {
      subscriber.error(err);
    });
    informer.on('connect', () => {
      subscriber.next({ status: ChangeStatus.CONNECTED, obj: null });
    });

    informer.start();

    return () => {
      informer.stop();
    };
  });
}
