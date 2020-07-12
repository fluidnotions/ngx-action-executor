import * as _ from 'lodash';
import Bloomrun from 'bloomrun';
import { Injectable } from '@angular/core';
import { Observable, Subject, of, concat } from 'rxjs';
import { Action, ActionMessageFactory, Message, Commands } from '../models/happenings.model';
import { distinctUntilChanged, filter, flatMap, map, tap, retryWhen, concatMap } from 'rxjs/operators';
import { Handler } from '../models/handler.model';
import { ActionExecutor } from '../helpers/action-executor.class';
import { securityPolicyInterceptor } from '../helpers/functions';
import { Util, LoggerFactory } from '../helpers/util.class';

@Injectable({
  providedIn: 'root',
})
export class NgxActionExecutorService {
  private logger = LoggerFactory.getLogger(this);

  eventsSubject$ = new Subject<Message>();
  preEventsSubject$ = new Subject<Message>();
  
  behavioralHandlerIndex: any;
  constructor() {
    this.behavioralHandlerIndex = Bloomrun({ indexing: 'depth' });

    this.eventsSubject$
      .pipe(
        tap((m: Message) => {
          this.logger.trace('io.service:tap:ALL: ', m);
        }),
        filter((m: Message) => {
          if (m && !m.meta) {
            throw new Error('malformed Message');
          }
          return !!m && !_.isBoolean(m.action) && _.isObject(m.action);
        }),
        distinctUntilChanged((e1: Message, e2: Message) => Util.parseTimeFormat(e1.meta.timestamp).isSame(Util.parseTimeFormat(e2.meta.timestamp))),
        concatMap((message: Message) => {
          this.logger.trace('io.service:chain[core,behavioral,page]:IN. ts: ', message.meta.timestamp);
          return concat(
            ActionExecutor.execute<Action>(message.action, this.behavioralHandlerIndex, 'behavioral').pipe(
              tap((act: Action) => {
                this.logger.trace(
                  'io.service:chain[behavioral]:OUT. ts: ',
                  message.meta.timestamp,
                  !act ? ' (chain terminated)' : ' (new action returned)',
                );
              }),
            ),
          ).pipe(
            retryWhen((errors: Observable<any>) => {
              errors
                .pipe(
                  map((err: any) => {
                    console.error(err)
                    this.logger.error('action error msg: ', err.message, ', stack: ', err.stack);
                    this.pushMessage(
                      ActionMessageFactory.newMessage('io-error', {
                        role: 'notify',
                        cmd: Commands.Toast,
                        payload: { header: 'Unexpected Error', message: err.message, type: 'error' },
                      }),
                    );
                  }),
                )
                .subscribe();
              return of();
            }),
            tap(() => {
              if (Util.diffTimeFormatNow(message.meta.timestamp) > 300) {
                this.logger.error('SLOW ACTION HANDLER: action handler took longer then 300ms');
              }
            }),
            map((action: Action) => {
              if (action) {
                return ActionMessageFactory.newMessage(message.meta.originSlotName, action);
              } else {
                return;
              }
            }),
          );
        }),
        filter(e => !!e),
        map((message: Message) => {
          this.pushMessage(message);
          return;
        }),
      )
      .subscribe(() => { }, (error: any) => this.logger.error(error.message));
  }

  dispatch(originClassName: string | any, action: Action | Action[]): void {
    if (_.isBoolean(action)) return;
    if (_.isObject(originClassName)) {
      originClassName = this.getClassName(originClassName);
    }
    if(_.isArray(action)){
      (<Action[]>action).map(act => this.pushMessage(ActionMessageFactory.newMessage(originClassName, act)))
    }else{
      this.pushMessage(ActionMessageFactory.newMessage(originClassName, <Action>action));
    }
  }

  private pushMessage(message: Message) {
    this.logger.debug('dispatch: message (before security): ', _.omit(message, ["action.payload"]), '. new ts: ', message.meta.timestamp);
    if (!message.action.securityCheck) {
      this.logger.trace('dispatch: message (role auth bypasses security): ', message);
      this.preEventsSubject$.next(message);
    } else {
      let m = securityPolicyInterceptor(message);
      if (m) {
        this.preEventsSubject$.next(m);
      }
    }
  }

  setInterceptors(interceptor1: (m: Message) => any, interceptor2: (m: Message) => any) {
    this.preEventsSubject$
      .asObservable()
      .pipe(
        flatMap((m: Message) => {
          return interceptor1(m);
        }),
        flatMap((m: Message) => {
          return interceptor2(m);
        }),
        map((m: Message) => {
          this.logger.trace('interceptor returned Message: ', m); //#1
          this.eventsSubject$.next(m);
        }),
      )
      .subscribe();
  }

  addHandler(handler: Handler, addedBy: any) {
    if (_.isObject(addedBy)) {
      addedBy = this.getClassName(addedBy);
    }
    this.behavioralHandlerIndex.add(handler.msgUsedAsPattern, handler.handlerFunc);
  }

  private getClassName(clazz: any) {
    return clazz.constructor.toString().match(/\w+/g)[1];
  }
}
