import {
  CommonListrPromptsAdapter,
  type CommonListrDatePromptArgs,
  type CommonListrDatePromptReturn,
  type CommonListrSingleSelectPromptArgs,
  type CommonListrSingleSelectPromptReturn,
  type CommonListrTextPromptArgs
} from '@danielr18/listr-tasks-core'
import type { IO } from '@interval/sdk'

interface IntervalPromptAdapterCtx {
  io: IO
}
export class IntervalPromptAdapter extends CommonListrPromptsAdapter<IntervalPromptAdapterCtx> {
  public async promptDate (args: CommonListrDatePromptArgs, context: IntervalPromptAdapterCtx): Promise<CommonListrDatePromptReturn> {
    return context.io.input.date(args.label, {
      defaultValue: args.defaultValue,
      helpText: args.helpText
    })
  }

  public async promptText (args: CommonListrTextPromptArgs, context: IntervalPromptAdapterCtx): Promise<string> {
    return context.io.input.text(args.label, {
      defaultValue: args.defaultValue,
      helpText: args.helpText
    })
  }

  public async promptSingleSelect (args: CommonListrSingleSelectPromptArgs, context: IntervalPromptAdapterCtx): Promise<CommonListrSingleSelectPromptReturn> {
    const { value } = await context.io.select.single(args.label, {
      defaultValue: args.options.find((option) => option.value === args.defaultValue),
      helpText: args.helpText,
      options: args.options
    })

    return value
  }

  public cancel (): void {}
}
