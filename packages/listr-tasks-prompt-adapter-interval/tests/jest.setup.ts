import { jest } from '@jest/globals'
import { ListrEnvironmentVariables } from 'listr2'

process.env[ListrEnvironmentVariables.DISABLE_COLOR] = '1'

global.jest = jest as any

jest.setTimeout(60000)
