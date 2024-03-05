import type { ActionCtx } from '@interval/sdk'
import { ListrLogger, ProcessOutput } from 'listr2'
import { WriteStream } from 'node:tty'

class IntervalLoggerStream extends WriteStream {
  private ctx: ActionCtx // Replace 'any' with the actual type of ctx

  constructor (ctx: ActionCtx) {
    super(0)
    this.ctx = ctx
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public _write (chunk: any /* Replace 'any' with the actual type of chunk */, encoding: string, callback: () => void): void {
    // Call ctx.log with the provided chunk (message)
    this.ctx
      .log(chunk.toString())
      .then(() => {
        // Call the callback to indicate that the write operation is complete
        callback()
      })
      .catch(() => {})
  }
}

export class IntervalListrLogger extends ListrLogger {
  constructor (ctx: ActionCtx) {
    const stdout = new IntervalLoggerStream(ctx)
    const stderr = new IntervalLoggerStream(ctx)

    super({ processOutput: new ProcessOutput(stdout, stderr, { dump: [] }) })
  }
}
