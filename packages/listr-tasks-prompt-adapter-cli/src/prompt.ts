import {
  CommonListrPromptsAdapter,
  type CommonListrDatePromptArgs,
  type CommonListrDatePromptReturn,
  type CommonListrSingleSelectPromptArgs,
  type CommonListrSingleSelectPromptReturn,
  type CommonListrTextPromptArgs
} from '@danielr18/listr-tasks-core'
import { input, select } from '@inquirer/prompts'
import type { CancelablePromise } from '@inquirer/type'
// @ts-expect-error - get-timezone-offset is not typed
import getTimezoneOffset from 'get-timezone-offset'
import { ListrTaskEventType } from 'listr2'

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

export class CliPromptAdapter extends CommonListrPromptsAdapter<object> {
  private inquirePrompt: CancelablePromise<any> | undefined

  public async promptDate (args: CommonListrDatePromptArgs): Promise<CommonListrDatePromptReturn> {
    const inquirePrompt = input(
      {
        message: args.label,
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
        message: args.label,
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
        message: args.label,
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

  public cancel (): void {
    if (!this.inquirePrompt) {
      return
    }

    this.reportFailed()
    this.inquirePrompt.cancel()
  }
}
