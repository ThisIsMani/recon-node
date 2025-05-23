import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

// For Request ID context
interface RequestContext {
  requestId?: string;
}
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

const LOGGING_ENABLED: boolean = process.env.LOGGING_ENABLED !== 'false';
const NODE_ENV: string = process.env.NODE_ENV || 'development';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for human-readable logs
const customFormat = printf(({ level, message, timestamp: ts, requestId: reqId, stack, ...metadata }) => {
  let log = `${ts} [${level}]`;
  if (reqId) {
    log += ` [${reqId}]`;
  }
  log += `: ${message}`;

  // Add metadata if any, excluding known properties
  const meta = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  if (meta && meta !== '{}') {
    log += ` ${meta}`;
  }

  // Add stack trace for errors
  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

// Custom formatter to inject requestId
const injectRequestId = winston.format((info) => {
  const store = requestContextStorage.getStore();
  if (store?.requestId) {
    info.requestId = store.requestId;
  }
  return info;
});

const winstonLogger = winston.createLogger({
  level: NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    errors({ stack: true }), // This will add the stack to the info object
    injectRequestId(), // Apply the custom requestId formatter
    NODE_ENV === 'development' ? colorize() : winston.format.uncolorize(), // Colorize for dev
    customFormat
  ),
  transports: [
    new winston.transports.Console({
      silent: !LOGGING_ENABLED,
    }),
  ],
  // Do not exit on handled exceptions
  exitOnError: false,
});

interface Logger {
  log: (message: string, ...meta: any[]) => void;
  error: (message: string | Error, ...meta: any[]) => void;
  warn: (message: string, ...meta: any[]) => void;
  info: (message: string, ...meta: any[]) => void;
  debug: (message: string, ...meta: any[]) => void;
  query: (message: string, ...meta: any[]) => void; // For Prisma queries
}

const logger: Logger = {
  log: (message: string, ...meta: any[]): void => {
    winstonLogger.log('info', message, ...meta);
  },
  error: (message: string | Error, ...meta: any[]): void => {
    if (message instanceof Error) {
      const metadataPayload: any = { error: message };
      if (meta.length === 1 && typeof meta[0] === 'object' && meta[0] !== null && !Array.isArray(meta[0])) {
        Object.assign(metadataPayload, meta[0]);
      } else if (meta.length > 0) {
        metadataPayload.additionalMeta = meta;
      }
      winstonLogger.error(message.message, metadataPayload);
    } else {
      winstonLogger.error(message, ...meta);
    }
  },
  warn: (message: string, ...meta: any[]): void => {
    winstonLogger.warn(message, ...meta);
  },
  info: (message: string, ...meta: any[]): void => {
    winstonLogger.info(message, ...meta);
  },
  debug: (message: string, ...meta: any[]): void => {
    winstonLogger.debug(message, ...meta);
  },
  query: (message: string, ...meta: any[]): void => { // Specific method for SQL queries
    winstonLogger.log('debug', `SQL: ${message}`, ...meta); // Log SQL queries at debug level
  }
};

export default logger;
