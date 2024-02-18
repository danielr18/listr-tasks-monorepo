// @ts-expect-error - gitops-secrets is not typed
import gitopsSecrets from 'gitops-secrets'
import type { ListrTask } from 'listr2'

async function loadDopplerSecretsToEnv (): Promise<void> {
  const secrets = await gitopsSecrets.providers.doppler.fetch({
    dopplerToken: process.env.DOPPLER_TOKEN,
    dopplerProject: process.env.DOPPLER_PROJECT ?? null,
    dopplerConfig: process.env.DOPPLER_CONFIG ?? null
  })

  gitopsSecrets.populateEnv(secrets)
}

export const loadSecretsTask = {
  title: 'Loading Secrets',
  task: async (_ctx, task): Promise<void> => {
    if (process.env.DOPPLER_TOKEN) {
      task.output = 'Loading Doppler Secrets'
      await loadDopplerSecretsToEnv()
      task.title = 'Loaded Secrets'
    }
  }
} satisfies ListrTask
