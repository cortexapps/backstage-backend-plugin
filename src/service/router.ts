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
  TokenManager,
  createLegacyAuthAdapters,
} from '@backstage/backend-common';
import {
  AuthService,
  DiscoveryService,
  HttpAuthService,
} from '@backstage/backend-plugin-api'
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import * as cron from 'node-cron';
import { CortexClient } from '../api/CortexClient';
import { submitEntitySync } from './task';
import { ExtensionApi } from '@cortexapps/backstage-plugin-extensions';
import { CatalogClient } from '@backstage/catalog-client';

export interface RouterOptions {
  logger: Logger;
  discovery: DiscoveryService;
  cronSchedule: string;
  syncWithGzip?: boolean;
  extensionApi?: ExtensionApi;
  tokenManager?: TokenManager;
  auth?: AuthService;
  httpAuth?: HttpAuthService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    response.send({ status: 'ok' });
  });
  
  const { auth } = createLegacyAuthAdapters(options);

  await initCron({
    ...options,
    auth,
  });

  return router;
}

export interface CronOptions {
  logger: Logger;
  discovery: DiscoveryService;
  cronSchedule: string;
  syncWithGzip?: boolean;
  extensionApi?: ExtensionApi;
  auth: AuthService;
}

async function initCron(options: CronOptions) {
  const {
    logger,
    discovery,
    syncWithGzip,
    cronSchedule,
    extensionApi,
    auth,
  } = options;

  const catalogApi = new CatalogClient({ discoveryApi: discovery });
  const cortexApi = new CortexClient({ discoveryApi: discovery });

  cron.schedule(cronSchedule, () => {
    submitEntitySync({
      logger,
      catalogApi,
      cortexApi,
      syncWithGzip: syncWithGzip ?? false,
      extensionApi,
      auth,
    });
  });
}
