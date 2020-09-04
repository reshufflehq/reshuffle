import { createLogger as winstonCreateLogger, format, LoggerOptions, transports } from 'winston'
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

const createLogger = (options: LoggerOptions = loggerOptions) => winstonCreateLogger(options)

export { createLogger }
