import type { ListrTaskObject, ListrTaskWrapper } from 'listr2'
import { ListrPromptAdapter, ListrTaskEventType, ListrTaskState } from 'listr2'

interface BasePromptArgs {
  label: string
  helpText?: string
}

export type CommonListrPromptsAdapterImpl<Ctx> = new (task: ListrTaskObject<any, any, any>, wrapper: ListrTaskWrapper<any, any, any>) => CommonListrPromptsAdapter<Ctx>

export abstract class CommonListrPromptsAdapter<Ctx> extends ListrPromptAdapter {
  public async run<T = any>(args: CommonListrDatePromptArgs | CommonListrTextPromptArgs | CommonListrSingleSelectPromptArgs, context: Ctx): Promise<T> {
    this.reportStarted()

    this.task.on(ListrTaskEventType.STATE, (event) => {
      if (event === ListrTaskState.SKIPPED) {
        this.cancel()
      }
    })

    let result: any

    try {
      if (args.type === 'date') {
        result = await this.promptDate(args, context)
      } else if (args.type === 'text') {
        result = await this.promptText(args, context)
      } else if (args.type === 'singleSelect') {
        result = await this.promptSingleSelect(args, context)
      } else {
        throw new Error('Unknown prompt type')
      }
      this.reportCompleted()
    } catch (e) {
      this.reportFailed()

      throw e
    }

    return result
  }

  public abstract cancel (): void
  public abstract promptDate (args: CommonListrDatePromptArgs, context: Ctx): Promise<CommonListrDatePromptReturn>
  public abstract promptText (args: CommonListrTextPromptArgs, context: Ctx): Promise<CommonListrTextPrompReturn>
  public abstract promptSingleSelect (args: CommonListrSingleSelectPromptArgs, context: Ctx): Promise<CommonListrSingleSelectPromptReturn>
}

export type CommonListrDatePromptArgs = {
  type: 'date'
  defaultValue?:
  | Date
  | {
    year: number
    month: number
    day: number
  }
} & BasePromptArgs

export interface CommonListrDatePromptReturn {
  year: number
  month: number
  day: number
  jsDate: Date
}

export type CommonListrTextPromptArgs = {
  type: 'text'
  defaultValue?: string
} & BasePromptArgs

export type CommonListrTextPrompReturn = string

export type CommonListrSingleSelectPromptReturn = string | number | boolean

export type CommonListrSingleSelectPromptArgs = {
  type: 'singleSelect'
  defaultValue?: CommonListrSingleSelectPromptReturn
  options: { label: string, value: CommonListrSingleSelectPromptReturn }[]
} & BasePromptArgs
