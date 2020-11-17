import util from 'util'
import { createLogger as winstonCreateLogger, format, LoggerOptions, transports } from 'winston'
import { TransformableInfo } from 'logform'
const { colorize, combine, printf, json, timestamp } = format

const consoleFormat = printf(({ level, message, timestamp, handlerId }) => {
  return `${timestamp} ${handlerId ? 'event' : 'runtime'} ${level} ${message}`
})

const consoleLikeMessage = format((data: TransformableInfo) => {
  // @ts-ignore
  const args = (data[Symbol.for('splat')] || []).map((elem) => {
    if (elem instanceof Error) {
      elem.stack = '\n  ' + elem.stack
    }
    return elem
  })
  const message = util.format(data.message.trim(), ...args)
  return {
    ...data,
    message: message.trim(),
  }
})

const loggerOptions = {
  level: 'info',
  format: combine(consoleLikeMessage(), timestamp(), json()),
  exitOnError: false,
  transports: [
    // - Write all logs with level `error` to `error.log`
    new transports.File({
      filename: './logs/error.log',
      level: 'error',
    }),
    // - Write all logs to `combined.log`
    new transports.File({
      filename: './logs/combined.log',
    }),
    new transports.Console({
      format: combine(colorize({ level: true, message: true }), consoleFormat),
    }),
  ],
}

const createLogger = (options: LoggerOptions = loggerOptions) => {
  const logger = winstonCreateLogger(options)

  const levels = ['debug', 'info', 'error', 'warn', 'debug']
  // Print stacktrace for Errors
  levels.forEach((level) => {
    // @ts-ignore
    logger[level] = (msg: any, ...remains: any) => logger.log(level, '', msg, ...remains)
  })

  return logger
}

export { createLogger }
