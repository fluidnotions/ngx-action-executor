import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { values } from 'lodash';

import { LoggerFactory } from '../helpers/util.class';
import { ActionPatternDecoratorScanner } from '../helpers/action-pattern-scanner';
import { Handler } from '../models/handler.model';
import { NgxActionExecutorService } from './ngx-action-executor.service';

@Injectable({
  providedIn: 'root',
})
export class NgxActionExecutorLoaderService {
  private logger = LoggerFactory.getLogger(this);

  constructor(
    private executor: NgxActionExecutorService
  ) {}

  private extractDecorators(instance: any): Handler[]{
    return ActionPatternDecoratorScanner.extract(instance, false) || []
  }

  loadActionHandlers(classInstance: any) {
    let callActionHandlers = this.extractDecorators(classInstance);
    callActionHandlers.forEach((handler: Handler) => {
      this.executor.addHandler(handler, classInstance);
    });
  }
}
