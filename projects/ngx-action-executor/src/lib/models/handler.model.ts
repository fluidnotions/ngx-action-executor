export class Handler {
  msgUsedAsPattern: any;
  handlerFunc: (msg: any) => any; 
}

export const ActionPatterns = (...msgUsedAsPatternArray): MethodDecorator => {
  return (target, key, descriptor: PropertyDescriptor) => {
    (<any>Reflect).defineMetadata('__actionPatterns', msgUsedAsPatternArray, descriptor.value);
    (<any>Reflect).defineMetadata('__isActionPattern', true, descriptor.value);
    return descriptor;
  };
};


