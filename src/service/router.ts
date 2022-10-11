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
import { PluginEndpointDiscovery, TokenManager } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import * as cron from "node-cron";
import { CortexClient } from "../api/CortexClient";
import { syncEntities } from "./task";
import { ExtensionApi } from "@cortexapps/backstage-plugin-extensions";
import { CatalogClient } from "@backstage/catalog-client";

export interface RouterOptions {
  logger: Logger;
  discoveryApi: PluginEndpointDiscovery;
  cronSchedule: string;
  extensionApi?: ExtensionApi;
  tokenManager?: TokenManager;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    response.send({ status: 'ok' });
  });

  await initCron(options)

  return router;
}

async function initCron(options: RouterOptions) {

  const { logger, discoveryApi, cronSchedule, extensionApi, tokenManager } = options

  const catalogApi = new CatalogClient({ discoveryApi })
  const cortexApi = new CortexClient({ discoveryApi })

  cron.schedule(cronSchedule, () => {
    syncEntities({ logger, catalogApi, cortexApi, extensionApi, tokenManager })
  })
}
