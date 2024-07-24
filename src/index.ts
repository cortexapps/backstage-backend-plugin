/*
 * Copyright 2022 Cortex Applications, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    coreServices,
    createBackendPlugin,
} from '@backstage/backend-plugin-api';
import {  } from '@cortexapps/backstage-plugin-extensions';
import { createRouter } from './service/router';

export const cortexPlugin = createBackendPlugin({
    pluginId: 'cortex',
    register(env) {
        env.registerInit({
        deps: {
            logger: coreServices.logger,
            config: coreServices.rootConfig,
            discovery: coreServices.discovery,
            // The http router service is used to register the router created by the createRouter.
            http: coreServices.httpRouter,
            auth: coreServices.auth,
            httpAuth: coreServices.httpAuth
        },
        async init({ config, logger, discovery, http, auth, httpAuth }) {
            const cronSchedule =
                config.getOptionalString('cortex.backend.cron') ?? '0 3,7,11,15,19,23 * * *';
            const syncWithGzip =
                config.getOptionalBoolean('cortex.syncWithGzip') ?? false;
            const router = await createRouter({
                logger,
                discovery,
                cronSchedule,
                syncWithGzip,
                auth,
                httpAuth,
            });

            // We register the router with the http service.
            http.use(router);
        },
        });
    },
});

export * from './service/router';
