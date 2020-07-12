import { NgxActionExecutorLoaderService } from './services/ngx-action-executor-loader.service';
import { NgxActionExecutorService } from './services/ngx-action-executor.service';
import { Action } from './models/happenings.model';

export abstract class NgxActionExecutorBaseComponent  {

  constructor(public loader: NgxActionExecutorLoaderService, public executor: NgxActionExecutorService){
    this.loader.loadActionHandlers(this);
  }

  dispatch(action: Action | Action[]){
    this.executor.dispatch(this, action)
  }
}
