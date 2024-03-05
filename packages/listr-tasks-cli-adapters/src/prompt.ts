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
  CommonListrFilePromptReturn
} from '@danielr18/listr-tasks-core'
import { input, select, checkbox } from '@inquirer/prompts'
import type { CancelablePromise } from '@inquirer/type'
import fs from 'fs/promises'
// @ts-expect-error - get-timezone-offset is not typed
import getTimezoneOffset from 'get-timezone-offset'
import { ListrTaskEventType } from 'listr2'
import path from 'path'
import { UTIController } from 'uti'

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

  public async promptDate (args: CommonListrDatePromptArgs): Promise<CommonListrDatePromptReturn> {
    const inquirePrompt = input(
      {
        message: formatInputMessage(args),
        default: args.defaultValue
          ? args.defaultValue instanceof Date
            ? transformDate(args.defaultValue)
            : [args.defaultValue.year, args.defaultValue.month, args.defaultValue.day].map((n) => n.toString().padStart(2, '0')).join('-')
          : undefined,
        validate: isDateValid
      },
      {
        output: this.wrapper.stdout(ListrTaskEventType.PROMPT)
      }
    )

    this.inquirePrompt = inquirePrompt
    const result = await inquirePrompt
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

  public async promptText (args: CommonListrTextPromptArgs): Promise<string> {
    const inquirePrompt = input(
      {
        message: formatInputMessage(args),
        default: args.defaultValue
      },
      {
        output: this.wrapper.stdout(ListrTaskEventType.PROMPT)
      }
    )

    this.inquirePrompt = inquirePrompt
    const result = await inquirePrompt

    return result
  }

  public async promptSingleSelect (args: CommonListrSingleSelectPromptArgs): Promise<CommonListrSingleSelectPromptReturn> {
    const inquirePrompt = select(
      {
        message: formatInputMessage(args),
        choices: args.options.map((option) => ({
          name: option.label,
          value: option.value
        })),
        default: args.defaultValue
      },
      {
        output: this.wrapper.stdout(ListrTaskEventType.PROMPT)
      }
    )

    this.inquirePrompt = inquirePrompt
    const result = await inquirePrompt

    return result
  }

  public async promptMultiSelect (args: CommonListrMultiSelectPromptArgs): Promise<CommonListrMultiSelectPromptReturn> {
    const { defaultValue } = args
    const inquirePrompt = checkbox(
      {
        message: formatInputMessage(args),
        choices: args.options.map((option) => ({
          name: option.label,
          value: option.value,
          checked: defaultValue ? defaultValue.includes(option.value) : false
        }))
      },
      {
        output: this.wrapper.stdout(ListrTaskEventType.PROMPT)
      }
    )

    this.inquirePrompt = inquirePrompt
    const result = await inquirePrompt

    return result
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

  public async promptFile (args: CommonListrFilePromptArgs): Promise<CommonListrFilePromptReturn> {
    const pickOption = await this.promptSingleSelect({
      type: 'singleSelect',
      label: `Choose how to pick the file\n${args.label}`,
      options: [
        { label: 'Path', value: 'path' },
        { label: 'Dialog (Supported in MacOS)', value: 'dialog' }
      ]
    })

    let filePath: string

    if (pickOption === 'path') {
      filePath = await this.promptText({
        type: 'text',
        label: `${args.label} (Enter Path)`,
        helpText: args.helpText
      })
    } else {
      // eslint-disable-next-line import/no-extraneous-dependencies
      const { runJxa } = await import('run-jxa')
      const uc = new UTIController()
      const ofType = (args.allowedExtensions ?? []).flatMap((ext) => {
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
        [args.label, ofType]
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

  public cancel (): void {
    if (!this.inquirePrompt) {
      return
    }

    this.reportFailed()
    this.inquirePrompt.cancel()
  }
}
