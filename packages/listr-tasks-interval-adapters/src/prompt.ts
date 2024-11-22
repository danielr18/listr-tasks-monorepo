/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type {
  CommonListrMultiSelectPromptArgs,
  CommonListrMultiSelectPromptReturn,
  CommonListrDatePromptArgs,
  CommonListrDatePromptReturn,
  CommonListrSingleSelectPromptArgs,
  CommonListrSingleSelectPromptReturn,
  CommonListrTextPromptArgs,
  CommonListrPromptGroupArgs,
  CommonListrPrimitivePromptArgs,
  CommonListrFilePromptArgs,
  CommonListrFilePromptReturn,
  MaybeUndefined
} from '@danielr18/listr-tasks-core'
import { CommonListrPromptsAdapter } from '@danielr18/listr-tasks-core'
import type { IO } from '@interval/sdk'
import type { MaybeOptionalGroupIOPromise } from '@interval/sdk/dist/types'

interface IntervalPromptAdapterCtx {
  io: IO
}
export class IntervalPromptAdapter extends CommonListrPromptsAdapter<IntervalPromptAdapterCtx> {
  public async promptDate<Required extends boolean = true>(
    args: CommonListrDatePromptArgs & { required?: Required },
    context: IntervalPromptAdapterCtx
  ): Promise<MaybeUndefined<CommonListrDatePromptReturn, Required>> {
    const { required = true, ...promptArgs } = args
    const result = await context.io.input.date(...this.datePromptArgs(promptArgs)).optional(!required)

    return result as MaybeUndefined<CommonListrDatePromptReturn, Required>
  }

  public async promptText<Required extends boolean = true>(
    args: CommonListrTextPromptArgs & { required?: Required },
    context: IntervalPromptAdapterCtx
  ): Promise<MaybeUndefined<string, Required>> {
    const { required = true, ...promptArgs } = args
    const result = await context.io.input.text(...this.textPromptArgs(promptArgs)).optional(!required)

    return result as MaybeUndefined<string, Required>
  }

  public async promptSingleSelect<Required extends boolean = true>(
    args: CommonListrSingleSelectPromptArgs & { required?: Required },
    context: IntervalPromptAdapterCtx
  ): Promise<MaybeUndefined<CommonListrSingleSelectPromptReturn, Required>> {
    const { required = true, ...promptArgs } = args
    const result = await context.io.select.single(...this.singleSelectPromptArgs(promptArgs)).optional(!required)

    return result?.value as MaybeUndefined<CommonListrSingleSelectPromptReturn, Required>
  }

  public async promptMultiSelect<Required extends boolean = true>(
    args: CommonListrMultiSelectPromptArgs & { required?: Required },
    context: IntervalPromptAdapterCtx
  ): Promise<MaybeUndefined<CommonListrMultiSelectPromptReturn, Required>> {
    const { required = true, ...promptArgs } = args
    const selectedOptions = await context.io.select.multiple(...this.multiSelectPromptArgs(promptArgs)).optional(!required)

    return selectedOptions?.map((option) => option.value) as MaybeUndefined<CommonListrMultiSelectPromptReturn, Required>
  }

  public async promptFile<Required extends boolean = true>(
    args: CommonListrFilePromptArgs & { required?: Required },
    context: IntervalPromptAdapterCtx
  ): Promise<MaybeUndefined<CommonListrFilePromptReturn, Required>> {
    const { required = true, ...promptArgs } = args
    const file = await context.io.input.file(...this.filePromptArgs(promptArgs)).optional(!required)

    if (!file) {
      return undefined as MaybeUndefined<CommonListrFilePromptReturn, Required>
    }

    return {
      name: file.name,
      extension: file.extension,
      json: file.json.bind(file),
      text: file.text.bind(file),
      buffer: file.buffer.bind(file),
      url: file.url.bind(file)
    } as MaybeUndefined<CommonListrFilePromptReturn, Required>
  }

  public async promptGroup (args: CommonListrPromptGroupArgs, context: IntervalPromptAdapterCtx) {
    const options = args.options
    let groupResult: unknown[] | Record<string, unknown>

    if (Array.isArray(options)) {
      groupResult = await context.io.group(options.map((option) => this.promptToIoPromise(option, context)))

      for (let i = 0; i < options.length; i++) {
        groupResult[i] = this.transformOutput(options[i], groupResult[i], context)
      }
    } else {
      groupResult = await context.io.group(
        Object.entries(options).reduce<Record<string, MaybeOptionalGroupIOPromise>>((acc, [key, value]) => {
          acc[key] = this.promptToIoPromise(value, context)

          return acc
        }, {})
      )

      for (const [key, value] of Object.entries(options)) {
        groupResult[key] = this.transformOutput(value, groupResult[key], context)
      }
    }

    return groupResult
  }

  public cancel (): void {}

  private textPromptArgs (args: CommonListrTextPromptArgs) {
    return [
      args.label,
      {
        defaultValue: args.defaultValue,
        helpText: args.helpText
      }
    ] as const
  }

  private datePromptArgs (args: CommonListrDatePromptArgs) {
    return [
      args.label,
      {
        defaultValue: args.defaultValue,
        helpText: args.helpText
      }
    ] as const
  }

  private filePromptArgs (args: CommonListrFilePromptArgs) {
    return [
      args.label,
      {
        allowedExtensions: args.allowedExtensions
      }
    ] as const
  }

  private multiSelectPromptArgs (args: CommonListrMultiSelectPromptArgs) {
    const { defaultValue } = args

    return [
      args.label,
      {
        defaultValue: defaultValue ? args.options.filter((option) => defaultValue.includes(option.value)) : undefined,
        helpText: args.helpText,
        options: args.options
      }
    ] as const
  }

  private singleSelectPromptArgs (args: CommonListrSingleSelectPromptArgs) {
    const { defaultValue } = args

    return [
      args.label,
      {
        defaultValue: args.options.find((option) => option.value === defaultValue),
        helpText: args.helpText,
        options: args.options
      }
    ] as const
  }

  private promptToIoPromise (args: CommonListrPrimitivePromptArgs, context: IntervalPromptAdapterCtx): MaybeOptionalGroupIOPromise {
    if (args.type === 'date') {
      const { required = true, ...promptArgs } = args

      return context.io.input.date(...this.datePromptArgs(promptArgs)).optional(!required)
    } else if (args.type === 'text') {
      const { required = true, ...promptArgs } = args

      return context.io.input.text(...this.textPromptArgs(promptArgs)).optional(!required)
    } else if (args.type === 'singleSelect') {
      const { required = true, ...promptArgs } = args

      return context.io.select.single(...this.singleSelectPromptArgs(promptArgs)).optional(!required)
    } else if (args.type === 'multiSelect') {
      const { required = true, ...promptArgs } = args

      return context.io.select.multiple(...this.multiSelectPromptArgs(promptArgs)).optional(!required)
    } else if (args.type === 'file') {
      const { required = true, ...promptArgs } = args

      return context.io.input.file(...this.filePromptArgs(promptArgs)).optional(!required)
    } else {
      throw new Error('Unknown prompt type')
    }
  }

  private transformOutput (option: CommonListrPrimitivePromptArgs, result: unknown, context: IntervalPromptAdapterCtx) {
    if (!option.required && result === undefined) {
      return undefined
    }

    if (option.type === 'multiSelect') {
      if (Array.isArray(result)) {
        return result.map((option) => option.value)
      } else {
        throw new Error('Expected multiSelect to return an array')
      }
    } else if (option.type === 'singleSelect') {
      if (typeof result === 'object' && result !== null && 'value' in result) {
        return result.value
      } else {
        throw new Error('Expected singleSelect to return an object with a value property')
      }
    } else if (option.type === 'file') {
      if (typeof result === 'object' && result !== null) {
        const unsafeFile = result as Awaited<ReturnType<typeof context.io.input.file>>

        return {
          name: unsafeFile.name,
          extension: unsafeFile.extension,
          json: unsafeFile.json.bind(unsafeFile),
          text: unsafeFile.text.bind(unsafeFile),
          buffer: unsafeFile.buffer.bind(unsafeFile),
          url: unsafeFile.url.bind(unsafeFile)
        }
      } else {
        throw new Error('Expected singleSelect to return an object with a value property')
      }
    }

    return result
  }
}
