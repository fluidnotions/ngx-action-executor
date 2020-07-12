import { Util } from '../helpers/util.class';

export interface Action {
  slot?: string;
  interest?:  string;
  interest2?: string;
  interest3?:  string;
  target?: any;
  status?: string;
  role?: string;
  cmd?: Commands | string;
  entity?: string;
  event?: string;
  routeTo?: string;
  consume?: boolean;
  payload?: any;
  description?: string;
  userRoles?: any[];
  sendTo?: 'lb';
  hook?: 'before' | 'after';
  dialog?: 'before' | 'after';
  /**SecureAction */
  securityCheck?: string;
  securityPassed?: boolean;
  securityPassthrough?: boolean;
  securitySkip?: boolean;
  securityDialogClose?: boolean;
  securityManagerCheck?: boolean;
}

export interface EventMetadata {
  originSlotName?: string;
  timestamp: string;
}

export interface Message {
  meta: EventMetadata;
  action: Action;
  securityCheckPassed?: boolean
}

export class ActionMessageFactory {
  static newMessage(originSlotName: string, action: Action): Message {
    const eventMetadata = {
      originSlotName,
      timestamp: Util.nowTimeFormat(),
    };
    if (!action.slot) {
      action.slot = originSlotName;
    }
    return {
      meta: eventMetadata,
      action: action,
    };
  }

  static newSystemMessage(action: Action): Message {
    const originSlotName = 'SYSTEM';
    const eventMetadata = {
      originSlotName,
      timestamp: Util.nowTimeFormat(),
    };
    return {
      meta: eventMetadata,
      action: action,
    };
  }
}

export enum Commands {
  Change = 'change',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Read = 'read',
  Refresh = 'refresh',
  Login = 'login',
  Logout = 'logout',
  Active = 'active',
  Void = 'void',
  Clear = 'clear',
  Return = 'return',
  Toast = 'toast',
  Set = 'set',
  Get = 'get',
  Cancel = 'cancel',
  Close = 'close',
  LoginAlreadyAuthed = 'login-already-authed',
}

export enum EventLevel {
  NONVISIBLE = 0,
  MANAGEROVERRIDE,
  ALLOW,
}


