# Cortex Backend Plugin for Backstage

See the [frontend plugin](https://github.com/cortexapps/backstage-plugin) for details on the plugin.
The backend plugin will allow you to sync your Backstage services with Cortex asynchronously, set
to any Cron schedule of your choosing.

To start using the Backstage plugin and see a demo, please [sign up here](https://www.getcortexapp.com/demo) and we will
reach out with more info!

## Setup and Integration

1. In the [packages/backend](https://github.com/backstage/backstage/blob/master/packages/backend/) directory of your backstage
   instance, add the plugin as a package.json dependency:

```shell
$ yarn add @cortexapps/backstage-backend-plugin
```
2. Create a new file: `packages/backend/src/plugins/cortex.ts`:
```ts
import { PluginEnvironment } from '../types';
import { createRouter } from '@cortexapps/backstage-backend-plugin';

export default async function createPlugin(env: PluginEnvironment) {
  return await createRouter({
    discoveryApi: env.discovery,
    logger: env.logger,
    cronSchedule: env.config.getOptionalString('cortex.backend.cron') ?? '0 3,7,11,15,19,23 * * *'
  });
}
```

3. Update `packages/backend/src/index.ts`:
```tsx
import cortex from './plugins/cortex';
...
const cortexEnv = useHotMemoize(module, () => createEnv('cortex'));
...
apiRouter.use('/cortex', await cortex(cortexEnv));
```

4. Update [app-config.yaml](https://github.com/backstage/backstage/blob/master/app-config.yaml#L54) to add a new config under
   the `proxy` section:
```yaml
'/cortex':
    target: ${CORTEX_BACKEND_HOST_URL}
    headers:
      Authorization: Bearer ${CORTEX_TOKEN}
```

5. (Optional) You can choose to have the entity sync cron job use gzip to compress the entities by updating `cortex.ts` from step 2. You must also update the Backstage HTTP proxy to allow the `Content-Encoding` header.

```ts
import { PluginEnvironment } from '../types';
import { createRouter } from '@cortexapps/backstage-backend-plugin';

export default async function createPlugin(env: PluginEnvironment) {
  return await createRouter({
    discoveryApi: env.discovery,
    logger: env.logger,
    syncWithGzip: true,
    cronSchedule: env.config.getOptionalString('cortex.backend.cron') ?? '0 3,7,11,15,19,23 * * *'
  });
}
```

```yaml
proxy:
  '/cortex':
    target: ${CORTEX_BACKEND_HOST_URL}
    headers:
      Authorization: ${CORTEX_TOKEN}
    allowedHeaders:
      - Content-Encoding
```
