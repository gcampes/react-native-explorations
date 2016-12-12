import Winston from 'winston';

let Logger = new Winston.Logger();

Logger.configure({
  levels: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    verbose: 'cyan',
    debug: 'magenta',
  },
});

Logger.add(Winston.transports.Console, {
  prettyPrint: false,
  humanReadableUnhandledException: true,
  colorize: true,
  handleExceptions: true,
});

Logger.transports.console.level = 'info';

export default Logger;
