import type { TaskInfo, TaskPresetInfo, TaskRunArgs } from '@danielr18/listr-tasks-core'
import { select } from '@inquirer/prompts'
import { Glob } from 'glob'
import path from 'path'

function isDefined<T> (argument: T | undefined): argument is T {
  return argument !== undefined
}

export interface TaskRunnerConfig {
  tasksPattern: string
  presetsPattern?: string
}
export async function CliTaskRunner (config: TaskRunnerConfig): Promise<void> {
  const taskModulePaths: string[] = []
  const presetModulePaths: string[] = []

  const files = new Glob(config.tasksPattern, {})

  for await (const file of files) {
    taskModulePaths.push(file)
  }

  if (config.presetsPattern) {
    const presetFiles = new Glob(config.presetsPattern, {})

    for await (const file of presetFiles) {
      presetModulePaths.push(file)
    }
  }

  const taskModules = await Promise.all(
    taskModulePaths.map(async (taskModulePath) => {
      const module = (await import(path.resolve('.', taskModulePath))) as { default?: (args: TaskRunArgs<TaskInfo>) => Promise<void>, getTaskInfo?: () => TaskInfo }

      if (!module.default) {
        return null
      }

      return module
    })
  )

  const presetModules = await Promise.all(
    presetModulePaths.map(async (presetModulePath) => {
      const module = (await import(path.resolve('.', presetModulePath))) as { taskPath?: string, getTaskParams?: () => unknown, getPresetInfo?: () => TaskPresetInfo }

      return module
    })
  )

  const taskChoices = taskModules
    .map((taskModule, taskIndex) => {
      if (!taskModule) {
        return undefined
      }

      if (!taskModule.getTaskInfo) {
        return { name: taskModulePaths[taskIndex], value: taskIndex }
      }

      const taskInfo = taskModule.getTaskInfo()

      return { name: taskInfo.title, value: taskIndex }
    })
    .filter(isDefined)

  if (taskChoices.length === 0) {
    throw new Error('No tasks found')
  }

  const selectedTaskIndex = await select<number>({
    message: 'Select a task to run',
    choices: taskChoices
  })

  const taskModule = taskModules[selectedTaskIndex]

  if (!taskModule) {
    throw new Error('Invalid task module')
  }
  const taskModuleInfo = taskModule?.getTaskInfo?.()
  const taskModulePath = taskModulePaths[selectedTaskIndex]

  let params: unknown

  if (taskModuleInfo?.params) {
    const taskPresetModules = presetModules.filter((presetModule) => {
      if (!presetModule?.taskPath) {
        return false
      }

      return presetModule.taskPath === taskModulePath
    })

    const presetChoices = (
      await Promise.all(
        taskPresetModules.map(async (presetModule) => {
          if (!presetModule?.getTaskParams || !presetModule?.getPresetInfo) {
            return undefined
          }

          const presetInfo = presetModule.getPresetInfo()
          const params = await presetModule.getTaskParams()

          return { name: presetInfo.title, value: params }
        })
      )
    ).filter(isDefined)

    if (presetChoices.length > 0) {
      const selectedParams = await select<unknown>({
        message: 'Select a preset to use',
        choices: [{ name: 'None', value: null }, ...presetChoices]
      })

      if (selectedParams !== null) {
        const parsedParams = taskModuleInfo.params.safeParse(selectedParams)

        if (parsedParams.success === true) {
          params = parsedParams.data
        } else {
          // eslint-disable-next-line no-console
          console.warn('Invalid params', parsedParams.error.issues)
        }
      }
    }
  }

  await taskModule.default?.({ params })
  process.exit(0)
}
