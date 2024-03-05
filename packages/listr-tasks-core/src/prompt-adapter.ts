import type { ListrTaskObject, ListrTaskWrapper } from 'listr2'
import { ListrPromptAdapter, ListrTaskEventType, ListrTaskState } from 'listr2'

interface BasePromptArgs {
  label: string
  helpText?: string
}

export type CommonListrPromptsAdapterImpl<Ctx> = new (task: ListrTaskObject<any, any, any>, wrapper: ListrTaskWrapper<any, any, any>) => CommonListrPromptsAdapter<Ctx>

export abstract class CommonListrPromptsAdapter<Ctx> extends ListrPromptAdapter {
  public async run<T = any>(args: CommonListrPrimitivePromptArgs | CommonListrPromptGroupArgs, context: Ctx): Promise<T> {
    this.reportStarted()

    this.task.on(ListrTaskEventType.STATE, (event) => {
      if (event === ListrTaskState.SKIPPED) {
        this.cancel()
      }
    })

    let result: any

    try {
      if (args.type === 'group') {
        result = await this.promptGroup(args, context)
      } else {
        result = await this.handlePrompt(args, context)
      }
      this.reportCompleted()
    } catch (e) {
      this.reportFailed()

      throw e
    }

    return result
  }

  protected async handlePrompt<T = any>(args: CommonListrPrimitivePromptArgs, context: Ctx): Promise<T> {
    let result: any

    if (args.type === 'date') {
      result = await this.promptDate(args, context)
    } else if (args.type === 'text') {
      result = await this.promptText(args, context)
    } else if (args.type === 'singleSelect') {
      result = await this.promptSingleSelect(args, context)
    } else if (args.type === 'multiSelect') {
      result = await this.promptMultiSelect(args, context)
    } else if (args.type === 'file') {
      result = await this.promptFile(args, context)
    } else {
      throw new Error('Unknown prompt type')
    }

    return result
  }

  public abstract cancel (): void
  public abstract promptDate (args: CommonListrDatePromptArgs, context: Ctx): Promise<CommonListrDatePromptReturn>
  public abstract promptText (args: CommonListrTextPromptArgs, context: Ctx): Promise<CommonListrTextPrompReturn>
  public abstract promptSingleSelect (args: CommonListrSingleSelectPromptArgs, context: Ctx): Promise<CommonListrSingleSelectPromptReturn>
  public abstract promptMultiSelect (args: CommonListrMultiSelectPromptArgs, context: Ctx): Promise<CommonListrMultiSelectPromptReturn>
  public abstract promptFile (args: CommonListrFilePromptArgs, context: Ctx): Promise<CommonListrFilePromptReturn>
  public abstract promptGroup (args: CommonListrPromptGroupArgs, context: Ctx): Promise<unknown>
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

export type CommonListrMultiSelectPromptReturn = (string | number | boolean)[]

export type CommonListrMultiSelectPromptArgs = {
  type: 'multiSelect'
  defaultValue?: CommonListrMultiSelectPromptReturn
  options: { label: string, value: CommonListrMultiSelectPromptReturn[number] }[]
} & BasePromptArgs

export interface CommonListrFilePromptReturn {
  name: string
  extension: string
  url: () => Promise<string>
  json: () => Promise<Record<string, unknown>>
  buffer: () => Promise<Buffer>
  text: () => Promise<string>
}

export type CommonListrFilePromptArgs = {
  type: 'file'
  allowedExtensions?: string[]
} & BasePromptArgs

export interface CommonListrPromptGroupArgs {
  type: 'group'
  label: string
  options: Record<string, CommonListrPrimitivePromptArgs> | CommonListrPrimitivePromptArgs[]
}

export type CommonListrPrimitivePromptArgs =
  | CommonListrDatePromptArgs
  | CommonListrTextPromptArgs
  | CommonListrSingleSelectPromptArgs
  | CommonListrMultiSelectPromptArgs
  | CommonListrFilePromptArgs
