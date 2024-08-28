# Cortex Backend Plugin for Backstage

See the [Cortex Scorecard Plugin](https://www.npmjs.com/package/@cortexapps/backstage-plugin) for more details.
The backend plugin will allow you to sync your Backstage services with Cortex asynchronously, set
to any cron schedule of your choosing.

To start using the Backstage plugin and see a demo, please [book a demo](https://www.cortex.io/demo)!

## Setup and Integration ([old backend model](https://backstage.io/docs/backend-system/building-backends/migrating))

1. In the [packages/backend](https://github.com/backstage/backstage/blob/master/packages/backend/) directory of your Backstage
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
    cronSchedule:
      env.config.getOptionalString('cortex.backend.cron') ??
      '0 3,7,11,15,19,23 * * *',
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
    cronSchedule:
      env.config.getOptionalString('cortex.backend.cron') ??
      '0 3,7,11,15,19,23 * * *',
  });
}
```

```yaml
proxy:
  '/cortex':
    target: ${CORTEX_BACKEND_HOST_URL}
    headers:
      Authorization: Bearer ${CORTEX_TOKEN}
    allowedHeaders:
      - Content-Encoding
```

## Setup and Integration ([new backend model](https://backstage.io/docs/backend-system/building-backends/migrating))

1. In the [packages/backend](https://github.com/backstage/backstage/blob/master/packages/backend/) directory of your Backstage
   instance, add the plugin as a package.json dependency:

```shell
$ yarn add @cortexapps/backstage-backend-plugin
```

2. Update `packages/backend/src/index.ts`:

```tsx
import { cortexPlugin } from '@cortexapps/backstage-backend-plugin';
...
const backend = createBackend();
...
backend.add(cortexPlugin)
...
backend.start()
```

3. Update [app-config.yaml](https://github.com/backstage/backstage/blob/master/app-config.yaml#L54) to add a new config under
   the `proxy.endpoints` section:

```yaml
proxy:
  endpoints:
    '/cortex':
      target: ${CORTEX_BACKEND_HOST_URL}
      headers:
        Authorization: Bearer ${CORTEX_TOKEN}
```

4. (Optional) You may further configure entity sync cron job to set a custom schedule or use gzip to compress the entities by adding appropriate configuration properties. If enabling gzip, you must also update the Backstage HTTP proxy to allow the `Content-Encoding` header.

```yaml
cortex:
  syncWithGzip: true
  backend:
    cron: 0 * * * * # every hour
---
proxy:
  endpoints:
    '/cortex':
      target: ${CORTEX_BACKEND_HOST_URL}
      headers:
        Authorization: Bearer ${CORTEX_TOKEN}
      allowedHeaders:
        - Content-Encoding
```

5. (Optional) If you wish to make use of custom mappings via the `ExtensionsApi` in `@cortexapps/backstage-plugin-extensions`, you must configure a module to supply an implementation of this API to the Cortex plugin.
   <br><br>Implementing the `ExtensionsApi` interface is discussed further in the [`cortexapps/backstage-plugin` repo](https://github.com/cortexapps/backstage-plugin?tab=readme-ov-file#advanced).
   <br><br>The official [Backstage documentation](https://backstage.io/docs/backend-system/building-plugins-and-modules/index) suggests first creating a new package for the module using `yarn new` and selecting `backend-module`. With a moduleId of `extension-api` the full package should be created at `/modules/cortex-backend-module-extension-api`.
   <br><br>In `module.ts` of the new package, create a module which supplies your custom implementation of `ExtensionApi`:

```ts
// src/module.ts
import { createBackendModule } from '@backstage/backend-plugin-api';
import { cortexExtensionApiExtensionPoint } from '@cortexapps/backstage-plugin-extensions';
import { MyExtensionApiImpl } from `./MyExtensionApiImpl`;

export const cortexModuleExtensionApiProvider = createBackendModule({
  pluginId: 'cortex-backend',
  moduleId: 'my-extension-api',
  register(env) {
    env.registerInit({
      deps: {
        cortexBackend: cortexExtensionApiExtensionPoint,
      },
      async init({ cortexBackend }) {
        cortexBackend.setExtensionApi(new MyExtensionApiImpl());
      },
    });
  },
});
```

Export the module from `index.ts`:

```ts
// src/index.ts
export { cortexModuleExtensionApiProvider as default } from './module';
```

And finally add the extension to the backend in `packages/backend/src/index.ts` after the Cortex plugin itself:

```ts
backend.add(cortexPlugin); // should already be present from step 2
backend.add(import('<your-module-package>'));
```

Alternatively, if you do not wish to separate the module into its own package, you can instantiate `cortexModuleExtensionApiProvider` as shown above and add it to the backend directly:

```ts
const cortexModuleExtensionApiProvider = createBackendModule({...})
...
backend.add(cortexModuleExtensionApiProvider);
```
