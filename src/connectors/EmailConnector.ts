import { BaseConnector, EventConfiguration } from 'reshuffle-base-connector'
import nodemailer from 'nodemailer'

export interface EmailConnectorOptions {
  fromName: string
  fromEmail: string
  host: string
  port: number
  username: string
  password?: string
}

interface EmailAttachment {
  filename: string
  content: Buffer
}

export default class EmailConnector extends BaseConnector<EmailConnectorOptions> {
  private transporter: any
  private from: string | undefined

  constructor(options: EmailConnectorOptions, id: string) {
    super(options, id)
    this.update(options)
  }

  update(options: EmailConnectorOptions): void {
    this.from = options.fromName ? `${options.fromName} <${options.fromEmail}>` : options.fromEmail!
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: Number(options.port),
      auth: {
        user: options.username,
        pass: options.password,
      },
    })
  }
}
