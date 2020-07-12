import iterate from 'iterare';
import { Handler } from '../models/handler.model';
import { isArray } from 'util';
import * as _ from 'lodash'

class ActionPatternDecoratorScannerStatic {
  public extract(instance: any, skipBind = false): Handler[] {
    const instanceName = instance.constructor.toString().match(/\w+/g)[1];
    return _.flattenDeep(this.explore(instance)).map((handler: Handler) => {
    
      let act = {
        msgUsedAsPattern: handler.msgUsedAsPattern,
        handlerFunc: handler.handlerFunc,
      };
      if(!skipBind){
        act.handlerFunc = handler.handlerFunc.bind(instance)
      }
      return act;
    });
  }

  private explore(instance: any): Handler[][] {
    const instancePrototype = Object.getPrototypeOf(instance);

    return this.scanFromPrototype<any, Handler[]>(instance, instancePrototype, method =>
      this.exploreMethodMetadata(instance, instancePrototype, method),
    );
  }

  private exploreMethodMetadata(instance, instancePrototype, methodName: string): Handler[] {
    const handlerFunc = instancePrototype[methodName];
    const isHandler = (<any>Reflect).getMetadata('__isActionPattern', handlerFunc);

    if (isUndefined(isHandler)) return null;
   
    const patOrpats = (<any>Reflect).getMetadata('__actionPatterns', handlerFunc);
    if (isArray(patOrpats)) {
      return (<Array<Handler>>patOrpats).map(pat => {
        return {
          msgUsedAsPattern: pat,
          handlerFunc: handlerFunc,
        };
      });
    } else {
      return [
        {
          msgUsedAsPattern: patOrpats,
          handlerFunc: handlerFunc
        },
      ];
    }
  }

  private scanFromPrototype<T, R>(instance: T, prototype, callback: (name: string) => R): R[] {
    return iterate([...this.getAllFilteredMethodNames(prototype)])
      .map(callback)
      .filter(metadata => !isNil(metadata))
      .toArray();
  }

  *getAllFilteredMethodNames(prototype): IterableIterator<string> {
    do {
      yield* iterate(Object.getOwnPropertyNames(prototype))
        .filter(prop => {
          const descriptor = Object.getOwnPropertyDescriptor(prototype, prop);
          if (descriptor.set || descriptor.get) {
            return false;
          }
          return !isConstructor(prop) && isFunction(prototype[prop]);
        })
        .toArray();
    } while (
      // tslint:disable-next-line:no-conditional-assignment
      (prototype = Reflect.getPrototypeOf(prototype)) &&
      prototype !== Object.prototype
    );
  }
}

export const isUndefined = (obj): obj is undefined => typeof obj === 'undefined';
export const isFunction = (fn): boolean => typeof fn === 'function';
export const isConstructor = (fn): boolean => fn === 'constructor';
export const isNil = (obj): boolean => isUndefined(obj) || obj === null;

export const ActionPatternDecoratorScanner = new ActionPatternDecoratorScannerStatic();
