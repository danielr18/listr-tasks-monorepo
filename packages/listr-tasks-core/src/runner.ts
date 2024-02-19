import type { ZodSchema } from 'zod'

export interface TaskInfo<TParamsOut = any> {
  title: string
  params?: ZodSchema<TParamsOut>
}

export interface TaskPresetInfo {
  title: string
}

export interface TaskRunArgs<TTaskInfo extends TaskInfo> {
  params: TTaskInfo['params'] extends ZodSchema<infer TOut> ? TOut : unknown
}
