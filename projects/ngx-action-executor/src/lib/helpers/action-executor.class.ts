import { Observable, from, of, isObservable } from 'rxjs';
import { flatMap, take, map, concatMap } from 'rxjs/operators';
import * as _ from 'lodash';
import { LoggerFactory } from './util.class';

export class ActionExecutorStatic {
  private logger = LoggerFactory.getLogger(this);

  public execute<Action>(action: Action, handlerIndex: any, indexName: string): Observable<Action> {
    const actionAsAny = <any>action;
    //lookup function to call in bloomrun index
    if (actionAsAny.consume) {
      const handlerFunc = handlerIndex.lookup(action);
      if (handlerFunc) {
        this.logger.trace('handlerFunc: ', `\n${handlerFunc.toString()}\n`, ' matched with msg: ', action, ' will now excute ...');
        this.logger.info('(consume) handler func for msg pattern: ', _.omit(action, ['payload']), ' was found. indexName: ', indexName);
        let returned = handlerFunc(actionAsAny);
        if (!_.isBoolean(returned) && _.isObject(returned)) {
          this.logger.trace(
            'handlerFunc: ',
            `\n${handlerFunc.toString()}\n`,
            ' matched with msg: ',
            action,
            ' returned Message ',
            returned,
            ' which will now be dispatched',
          );
          return this.handlerFuncReturnedNext(
            returned,
            actionAsAny.callbackId,
            actionAsAny.securityCheck,
            actionAsAny.asyncScheduler,
          );
        }
      } else {
        this.logger.debug('no handler func for msg pattern: ', action, ' was found. indexName: ', indexName);
        return of(null);
      }
    } else {
      const handlerFuncArray = handlerIndex.list(action);
      if (handlerFuncArray && (<Array<any>>handlerFuncArray).length > 0) {
        this.logger.trace(
          'handlerFuncArray: ',
          `\n${handlerFuncArray.map(f => f.toString()).join('\n')}\n`,
          ' matched with msg: ',
          action,
          ' will now excute ...',
        );
        this.logger.info((<Array<any>>handlerFuncArray).length, ' handler funcs for msg pattern: ', _.omit(action, ['payload']), ' was found. indexName: ', indexName, ', index tree keys: ', Object.keys(handlerIndex["_tree"]));
        return from(handlerFuncArray).pipe(
          concatMap((handlerFunc: (action: Action) => Action) => {
            let returned = handlerFunc(action);
            this.logger.trace(
              'handlerFunc: ',
              `\n${handlerFunc.toString()}\n`,
              ' matched with msg: ',
              action,
              ' returned Message ',
              returned,
              ' which will now be dispatched',
            );
            return this.handlerFuncReturnedNext<Action>(
              returned,
              actionAsAny.callbackId,
              actionAsAny.securityCheck,
              actionAsAny.asyncScheduler,
            );
          }),
        );
      } else {
        this.logger.debug('no handler funcs for msg pattern: ', _.omit(action, ['payload']), ' was found. indexName: ', indexName, ', index tree keys: ', Object.keys(handlerIndex["_tree"]));
        return of(null);
      }
    }
  }

  /**
   * makes it easier to chain requests and get a final response if you know how to use it
   * but then there are many examples in the code base
   *
   * @param returned
   * @param callbackId
   */
  private handlerFuncReturnedNext<Action>(
    returned: any,
    callbackId?: string,
    preActSecurityCheck?: string,
    asyncScheduler?: boolean,
  ): Observable<Action> {
    if (_.isBoolean(returned) || !returned) return of();
    if (isObservable(returned)) {
      try {
        return (<Observable<any>>returned).pipe(
          take(1),
          flatMap((o: any | any[]) => {
            //flatten returned obs action arrays
            if (_.isArray(o)) {
              return of(o).pipe(flatMap(<any>from));
            } else {
              return of(o);
            }
          }),
          map((returnedInner: any) => {
            return this.chainIt(returnedInner, callbackId, preActSecurityCheck, asyncScheduler, true);
          }),
        );
      } catch (err) {
        this.logger.error(err);
      }
    } else {
      if (_.isObject(returned)) {
        return this.chainIt(returned, callbackId, preActSecurityCheck, asyncScheduler);
      } else if (_.isArray(returned)) {
        return of(returned)
          .pipe(flatMap(<any>from)) //flatten returned action arrays
          .pipe(map(returned => this.chainIt(returned, callbackId, preActSecurityCheck, asyncScheduler))); 
      } else {
        throw new Error('unexpected handlerFuncReturnedNext returned unknown type');
      }
    }
  }

  private chainIt(
    returned: any,
    callbackId?: string,
    preActSecurityCheck?: string,
    asyncScheduler?: boolean,
    innerObs = false,
  ) {
    this.logger.trace('nexting value within handler returned Observable: msg: ', returned);
    if (returned && !_.isBoolean(returned)) {
      //if returned securityCheck is not the same as preActSecurityCheck
      this.preserveActionPropsThroughChain(returned, callbackId, preActSecurityCheck, asyncScheduler);
      if (innerObs) {
        return returned;
      } else {
        return of(returned);
      }
    }
  }

  private preserveActionPropsThroughChain<Action>(
    returnedAction: Action,
    callbackId?: string,
    securityCheck?: any,
    asyncScheduler?: boolean,
  ) {
    let returnedActionAsAny = <any>returnedAction;
    //preserve asyncScheduler if exists, pass along to next message, if it's false remove the property
    if (returnedActionAsAny.asyncScheduler === undefined && asyncScheduler) {
      returnedActionAsAny.asyncScheduler = asyncScheduler;
      this.logger.trace('nextHandlerFuncReturned preserving asyncScheduler: ', asyncScheduler);
    } else if (returnedActionAsAny.asyncScheduler === false) {
      delete returnedActionAsAny.asyncScheduler;
    }
    //preserve callbackId if exists, pass along to next message
    if (callbackId) {
      returnedActionAsAny.callbackId = callbackId;
      this.logger.trace('nextHandlerFuncReturned preserving callbackId: ', callbackId);
    }
    //preserve securityCheck if exists, pass along to next message, except when it's been override by the returnedAction
    if (securityCheck && !returnedActionAsAny.securityCheck) {
      (<string>returnedActionAsAny.securityCheck) = securityCheck;
      this.logger.trace('nextHandlerFuncReturned preserving securityCheck (no override): ', securityCheck);
    }
  }
}
export const ActionExecutor = new ActionExecutorStatic();
