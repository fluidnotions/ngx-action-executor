import * as _ from 'lodash';
//https://stackoverflow.com/a/59736672
import * as moment_ from 'moment';
const Moment = moment_;

class UtilStatic {
  public logTimeFormat = 'MMMM Do HH:mm:ss:SSSS';
  public extendedUtc = 'YYYY-MM-DDTHH:mm:ss.SSS';

  /**
   * @param ts str tin init the moment
   * @param utc defaults to false
   */
  parseTimeFormat(ts: string, utc = false): moment_.Moment {
    if (utc) {
      return Moment.utc(ts, this.extendedUtc);
    } else {
      return Moment.utc(ts, this.extendedUtc).local();
    }
  }

  /**
   * create now moment string in extendedUtc format for
   * storage in PouchDB (or message.meta.timestamp)
   */
  nowTimeFormat(): string {
    return Moment.utc().format(this.extendedUtc);
  }

  /**
   * create now moment local time, for non-PouchDB uses only
   */
  moment(): moment_.Moment {
    return Moment();
  }

  /**
   *
   * @param ts from PouchDB or message.meta.timestamp
   */
  diffTimeFormatNow(ts: string): number {
    return Moment().diff(this.parseTimeFormat(ts));
  }

  //https://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-deep-clone-an-object-in-javascript
  clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

export const Util = new UtilStatic();


class LoggerFactoryStatic {
  logLevelOrder = ['trace', 'debug', 'info', 'warn', 'error', 'important', 'disable'];
  level = 'debug';
  showObjects = true;
  disabled = false;

  constructor(){
    
  }

  

  disablePutToLb() {
    this.disabled = true;
  }

  setShowObjects(val: boolean) {
    this.showObjects = val;
  }

  setLevel(lev: string) {
    this.level = lev;
  }

  

  private getTimeFormat(){
    return Util.nowTimeFormat()
  }

  getLogger(loggerId: string | any) {
    let name = _.isString(loggerId) ? loggerId : loggerId.constructor.toString().match(/\w+/g)[1];
    return {
      trace: (...args) => {
        if (this.isPassLevel('trace')) {
          let msgArgs = [`%c[${this.getTimeFormat()}][TRACE] ${name}: `, this.handleLogArgs(args)].join('');
         
          return console.log(msgArgs, this.colorStyle("magenta"));
        }
      },
      debug: (...args) => {
        if (this.isPassLevel('debug')) {
          let msgArgs = [`%c[${this.getTimeFormat()}][DEBUG] ${name}: `, this.handleLogArgs(args)].join('');
         
          return console.log(msgArgs, this.colorStyle("darkorange"));
        }
      },
      info: (...args) => {
        if (this.isPassLevel('info')) {
          let msgArgs = [`%c[${this.getTimeFormat()}][INFO] ${name}: `, this.handleLogArgs(args)].join('');
          return console.log(msgArgs, this.colorStyle("green"));
        }
      },
      warn: (...args) => {
        if (this.isPassLevel('warn')) {
          let msgArgs = [`%c[${this.getTimeFormat()}][WARN] ${name}: `, this.handleLogArgs(args)].join('');
          return console.log(msgArgs, this.colorStyle("yellow"));
        }
      },
      error: (...args) => {
        if (this.isPassLevel('error')) {
          let msgArgs = [`%c[${this.getTimeFormat()}][ERROR] ${name}: `, this.handleLogArgs(args)].join('');
          return console.log(msgArgs, this.colorStyle("red"));
        }
      },
      important: (...args) => {
        if (this.isPassLevel('important')) {
          let msgArgs = [`%c[${this.getTimeFormat()}][IMPORTANT] ${name}: `, this.handleLogArgs(args)].join('');
          return console.log(msgArgs, this.colorStyle("cyan"));
        }
      },
    };
  }

  handleLogArgs(args: any[]): string {
    let logString = '';
    _.forEach(args, arg => {
      if (_.isObject(arg)) {
        logString += this.showObjects ? ` ${this.stringify(arg)}` : ' [object]';
      } else {
        logString += ` ${arg}`;
      }
    });
    return logString;
  }

  isPassLevel(forLev: string): boolean {
    let indexOfFor = this.logLevelOrder.indexOf(forLev);
    let indexOfLev = this.logLevelOrder.indexOf(this.level);
    return indexOfFor >= indexOfLev;
  }

  colorStyle(color) {
    return `color: ${color};`;
  }

  stringify(obj, replacer?, spaces?, cycleReplacer?) {
    return JSON.stringify(obj, this.serializer(replacer, cycleReplacer), spaces);
  }

  serializer(replacer, cycleReplacer) {
    var stack = [],
      keys = [];

    if (cycleReplacer == null)
      cycleReplacer = function(key, value) {
        if (stack[0] === value) return '[Circular ~]';
        return '[Circular ~.' + keys.slice(0, stack.indexOf(value)).join('.') + ']';
      };

    return function(key, value) {
      if (stack.length > 0) {
        var thisPos = stack.indexOf(this);
        ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
        ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
        if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value);
      } else stack.push(value);

      return replacer == null ? value : replacer.call(this, key, value);
    };
  }
}

export const LoggerFactory = new LoggerFactoryStatic();
