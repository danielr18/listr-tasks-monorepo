import { CommonListrPromptsAdapter } from '@danielr18/listr-tasks-core'
import type {
  CommonListrMultiSelectPromptArgs,
  CommonListrMultiSelectPromptReturn,
  CommonListrDatePromptArgs,
  CommonListrDatePromptReturn,
  CommonListrSingleSelectPromptArgs,
  CommonListrSingleSelectPromptReturn,
  CommonListrTextPromptArgs,
  CommonListrPromptGroupArgs,
  CommonListrFilePromptArgs,
  CommonListrFilePromptReturn,
  MaybeUndefined,
  CommonListrNumberPromptArgs,
  CommonListrNumberPromptReturn
} from '@danielr18/listr-tasks-core'
import { input, select, checkbox, number } from '@inquirer/prompts'
import fs from 'fs/promises'
// @ts-expect-error - get-timezone-offset is not typed
import getTimezoneOffset from 'get-timezone-offset'
import { ListrTaskEventType } from 'listr2'
import path from 'path'
import { UTIController } from 'uti'

type CancelablePromise<T> = {
  cancel: () => void
} & Promise<T>

function transformDate (dateOrStr: string | Date): string {
  let date: Date
  let dateStr: string

  if (typeof dateOrStr === 'string') {
    date = new Date(dateOrStr)
    dateStr = dateOrStr
  } else {
    date = dateOrStr
    dateStr = date.toISOString()
  }

  if (!isDateValid(dateStr)) {
    return dateStr
  }
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timezoneOffset = getTimezoneOffset(timezone, date)

  date.setMinutes(date.getMinutes() + timezoneOffset)

  const year = date.toLocaleString('default', { year: 'numeric' })
  const month = date.toLocaleString('default', { month: '2-digit' }).padStart(2, '0')
  const day = date.toLocaleString('default', { day: '2-digit' }).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isDateValid (dateStr: string): boolean {
  return !Number.isNaN(new Date(dateStr).valueOf())
}

function formatInputMessage ({ label, helpText }: { label: string, helpText?: string }): string {
  return helpText ? `${helpText}\n${label}` : label
}

function formatGroupInputMessage (groupLabel: string | undefined, { helpText, label: inputLabel }: { helpText?: string, label: string }): { helpText?: string, label: string } {
  if (helpText) {
    if (groupLabel) {
      return { helpText: undefined, label: `${groupLabel}\n${helpText}\n${inputLabel}` }
    }
  }

  return { helpText, label: groupLabel ? `${groupLabel}\n${inputLabel}` : inputLabel }
}

export class CliPromptAdapter extends CommonListrPromptsAdapter<object> {
  private inquirePrompt: CancelablePromise<any> | undefined

  public async promptDate<Required extends boolean = true>(
    args: CommonListrDatePromptArgs & { required?: Required }
  ): Promise<MaybeUndefined<CommonListrDatePromptReturn, Required>> {
    const { required = true, ...promptArgs } = args
    const inquirePrompt = input(
      {
        message: formatInputMessage(promptArgs),
        default: promptArgs.defaultValue
          ? promptArgs.defaultValue instanceof Date
            ? transformDate(promptArgs.defaultValue)
            : [promptArgs.defaultValue.year, promptArgs.defaultValue.month, promptArgs.defaultValue.day].map((n) => n.toString().padStart(2, '0')).join('-')
          : undefined,
        validate: (input) => {
          if (!required && input === undefined) {
            return true
          }

          return isDateValid(input)
        },
        required
      },
      {
        output: this.wrapper.stdout(ListrTaskEventType.PROMPT)
      }
    )

    this.inquirePrompt = inquirePrompt
    const result = await inquirePrompt

    if (result === undefined && !required) {
      return undefined as MaybeUndefined<CommonListrDatePromptReturn, Required>
    }

    const date = new Date(result)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const timezoneOffset = getTimezoneOffset(timezone, date)

    date.setMinutes(date.getMinutes() + timezoneOffset)

    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      jsDate: date
    }
  }

  public async promptText<Required extends boolean = true>(args: CommonListrTextPromptArgs & { required?: Required }): Promise<MaybeUndefined<string, Required>> {
    const { required = true, ...promptArgs } = args
    const inquirePrompt = input(
      {
        message: formatInputMessage(promptArgs),
        default: promptArgs.defaultValue,
        validate: (input) => {
          if (!required && input === undefined) {
            return true
          }

          return !!input
        },
        required
      },
      {
        output: this.wrapper.stdout(ListrTaskEventType.PROMPT)
      }
    )

    this.inquirePrompt = inquirePrompt
    const result = await inquirePrompt

    if (result === undefined && !required) {
      return undefined as MaybeUndefined<string, Required>
    }

    return result
  }

  public async promptSingleSelect<Required extends boolean = true>(
    args: CommonListrSingleSelectPromptArgs & { required?: Required }
  ): Promise<MaybeUndefined<CommonListrSingleSelectPromptReturn, Required>> {
    const { required = true, ...promptArgs } = args

    const inquirePrompt = select(
      {
        message: formatInputMessage(promptArgs),
        choices: [...required ? [] : [{ label: 'Skip', value: undefined }], ...promptArgs.options].map((option) => ({
          name: option.label,
          value: option.value
        })),
        default: promptArgs.defaultValue
      },
      {
        output: this.wrapper.stdout(ListrTaskEventType.PROMPT)
      }
    )

    this.inquirePrompt = inquirePrompt
    const result = await inquirePrompt

    return result as MaybeUndefined<CommonListrSingleSelectPromptReturn, Required>
  }

  public async promptMultiSelect<Required extends boolean = true>(
    args: CommonListrMultiSelectPromptArgs & { required?: Required }
  ): Promise<MaybeUndefined<CommonListrMultiSelectPromptReturn, Required>> {
    const { required = true, defaultValue, ...promptArgs } = args
    const inquirePrompt = checkbox(
      {
        message: formatInputMessage(promptArgs),
        choices: promptArgs.options.map((option) => ({
          name: option.label,
          value: option.value,
          checked: defaultValue ? defaultValue.includes(option.value) : false
        })),
        validate: (input) => {
          if (!required && input.length === 0) {
            return true
          }

          return input.length > 0
        },
        required
      },
      {
        output: this.wrapper.stdout(ListrTaskEventType.PROMPT)
      }
    )

    this.inquirePrompt = inquirePrompt
    const result = await inquirePrompt

    if (!result.length && !required) {
      return undefined as MaybeUndefined<CommonListrMultiSelectPromptReturn, Required>
    }

    return result as MaybeUndefined<CommonListrMultiSelectPromptReturn, Required>
  }

  public async promptGroup (args: CommonListrPromptGroupArgs, context: object): Promise<unknown> {
    let result: any

    if (Array.isArray(args.options)) {
      result = []

      for (const option of args.options) {
        result.push(
          await this.handlePrompt(
            {
              ...option,
              ...formatGroupInputMessage(args.label, option)
            },
            context
          )
        )
      }
    } else {
      result = {}

      for (const [key, option] of Object.entries(args.options)) {
        result[key] = await this.handlePrompt(
          {
            ...option,
            ...formatGroupInputMessage(args.label, option)
          },
          context
        )
      }
    }

    return result
  }

  public async promptFile<Required extends boolean = true>(
    args: CommonListrFilePromptArgs & { required?: Required }
  ): Promise<MaybeUndefined<CommonListrFilePromptReturn, Required>> {
    const { required = true, ...promptArgs } = args
    const pickOption = await this.promptSingleSelect({
      type: 'singleSelect',
      label: `Choose how to pick the file\n${promptArgs.label}`,
      options: [{ label: 'Path', value: 'path' }, { label: 'Dialog (Supported in MacOS)', value: 'dialog' }, ...required ? [] : [{ label: 'Skip', value: 'skip' }]]
    })

    if (pickOption === 'skip') {
      return undefined as MaybeUndefined<CommonListrFilePromptReturn, Required>
    }

    let filePath: string

    if (pickOption === 'path') {
      filePath = await this.promptText({
        type: 'text',
        label: `${promptArgs.label} (Enter Path)`,
        helpText: promptArgs.helpText
      })
    } else {
      // eslint-disable-next-line import/no-extraneous-dependencies
      const { runJxa } = await import('run-jxa')
      const uc = new UTIController()
      const ofType = (promptArgs.allowedExtensions ?? []).flatMap((ext) => {
        const utis = uc.getUTIsForFileName(`file.${ext}`)

        return utis.length > 0 ? utis : ext
      })

      filePath = await runJxa(
        `
        const app = Application.currentApplication();
        app.includeStandardAdditions = true;
        const path = app.chooseFile({
            withPrompt: args[0],
            ofType: args[1]
        });
        return path.toString();
      `,
        [promptArgs.label, ofType]
      )
    }

    try {
      const stat = await fs.stat(filePath)

      if (!stat.isFile()) {
        throw new Error(`Path "${filePath}" is not a file`)
      }

      return {
        name: path.basename(filePath),
        extension: path.extname(filePath),
        json: async (): Promise<Record<string, unknown>> => {
          return JSON.parse(await fs.readFile(filePath, 'utf-8'))
        },
        text: async (): Promise<string> => {
          return fs.readFile(filePath, 'utf-8')
        },
        buffer: async (): Promise<Buffer> => {
          return fs.readFile(filePath)
        },
        url: async (): Promise<string> => filePath
      }
    } catch (e) {
      throw new Error(`Failed to open file "${filePath}"`, { cause: e })
    }
  }

  public async promptNumber<Required extends boolean = true>(
    args: CommonListrNumberPromptArgs & { required?: Required }
  ): Promise<MaybeUndefined<CommonListrNumberPromptReturn, Required>> {
    const { required = true, ...promptArgs } = args
    const inquirePrompt = number(
      {
        message: formatInputMessage(promptArgs),
        default: promptArgs.defaultValue,
        min: promptArgs.min,
        max: promptArgs.max,
        validate: (input) => {
          if (!required && input === undefined) {
            return true
          }

          if (input === undefined) {
            return false
          }

          if (promptArgs.decimals !== undefined && input % 1 !== 0) {
            const decimalPlaces = input.toString().split('.')[1]?.length || 0

            if (decimalPlaces > promptArgs.decimals) {
              return `Number can only have ${promptArgs.decimals} decimal places`
            }
          }

          return true
        },
        required
      },
      {
        output: this.wrapper.stdout(ListrTaskEventType.PROMPT)
      }
    )

    this.inquirePrompt = inquirePrompt
    const result = await inquirePrompt

    if (result === undefined && !required) {
      return undefined as MaybeUndefined<CommonListrNumberPromptReturn, Required>
    }

    return result as MaybeUndefined<CommonListrNumberPromptReturn, Required>
  }

  public cancel (): void {
    if (!this.inquirePrompt) {
      return
    }

    this.reportFailed()
    this.inquirePrompt.cancel()
  }
}
