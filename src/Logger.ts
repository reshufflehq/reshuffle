import { createLogger as winstonCreateLogger, format, transports } from 'winston'
const { colorize, combine, printf, json, timestamp } = format

const consoleFormat = printf(({ level, message, timestamp, scriptId }) => {
  return `${timestamp} ${scriptId ? 'script' : 'runtime'} ${level} ${message}`
})

const filterLog = (withScriptId: boolean) =>
  format((info) => (info.scriptId ? (withScriptId ? info : false) : withScriptId ? false : info))

const loggerOptions = {
  level: 'info',
  format: combine(timestamp(), json()),
  exitOnError: false,
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new transports.File({ filename: './logs/error.log', level: 'error' }),
    new transports.File({ filename: './logs/combined.log' }),
    new transports.File({ filename: './logs/script.log', format: filterLog(true)() }),
    new transports.Console({
      format: combine(
        // filterLog(false)(),
        colorize({ level: true, message: true }),
        consoleFormat,
      ),
    }),
  ],
}

const createLogger = () => {
  const logger = winstonCreateLogger(loggerOptions)

  console.log = (...args) => logger.info(...args)
  console.info = (...args) => logger.info(...args)
  console.warn = (...args) => logger.warn(...args)
  console.error = (...args) => logger.error(...args)
  console.debug = (...args) => logger.debug(...args)

  return logger
}

export { createLogger }
