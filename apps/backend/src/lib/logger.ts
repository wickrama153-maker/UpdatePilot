export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const logger = {
  debug: (message: string, context?: any) => log('debug', message, context),
  info: (message: string, context?: any) => log('info', message, context),
  warn: (message: string, context?: any) => log('warn', message, context),
  error: (message: string, context?: any) => log('error', message, context),
};

function log(level: LogLevel, message: string, context?: any) {
  const timestamp = new Date().toISOString();
  const meta = context ? ` ${JSON.stringify(context)}` : '';
  const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}${meta}`;

  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}
