import { createLogger, format, Logger as WinstonLogger, transports } from 'winston'
const { colorize, combine, printf, json, timestamp } = format

const consoleFormat = printf(({ level, message, timestamp, handlerId }) => {
  return `${timestamp} ${handlerId ? 'event' : 'runtime'} ${level} ${message}`
})

const filterLog = (withHandlerLogs: boolean) =>
  format((info) =>
    info.handlerId ? (withHandlerLogs ? info : false) : withHandlerLogs ? false : info,
  )

const loggerOptions = {
  level: 'info',
  format: combine(timestamp(), json()),
  exitOnError: false,
  transports: [
    // - Write all logs with level `error` and below to `error.log`
    new transports.File({ filename: './logs/error.log', level: 'error' }),
    // - Write all logs with level `info` and below to `combined.log`
    new transports.File({ filename: './logs/combined.log' }),
    new transports.File({ filename: './logs/handlers.log', format: filterLog(true)() }),
    new transports.Console({
      format: combine(
        // filterLog(false)(),
        colorize({ level: true, message: true }),
        consoleFormat,
      ),
    }),
  ],
}

export default class Logger {
  private readonly logger: WinstonLogger
  private consoleFunctions = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  }

  constructor(options = loggerOptions) {
    this.logger = createLogger(options)
  }

  redirectConsoleToLogger(): void {
    console.log = (...args) => this.logger.info(...args)
    console.info = (...args) => this.logger.info(...args)
    console.warn = (...args) => this.logger.warn(...args)
    console.error = (...args) => this.logger.error(...args)
    console.debug = (...args) => this.logger.debug(...args)
  }

  revertConsoleToStandard(): void {
    console.log = this.consoleFunctions.log
    console.info = this.consoleFunctions.info
    console.warn = this.consoleFunctions.warn
    console.error = this.consoleFunctions.error
    console.debug = this.consoleFunctions.debug
  }

  getInstance(): WinstonLogger {
    return this.logger
  }
}

export { Logger }
