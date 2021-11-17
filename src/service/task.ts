/*
 * Copyright 2021 Cortex Applications Inc.
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
import { CortexApi } from "../api/CortexApi";
import { Logger } from 'winston';
import { CatalogApi } from "@backstage/catalog-client";
import { ExtensionApi } from "@cortexapps/backstage-plugin-extensions";

interface SyncEntitiesOptions {
  logger: Logger;
  cortexApi: CortexApi;
  catalogApi: CatalogApi
  extensionApi?: ExtensionApi;
}

export const syncEntities: (options: SyncEntitiesOptions) => void = async ({ logger, cortexApi, catalogApi, extensionApi }) => {
  const customMappings = await extensionApi?.getCustomMappings() ?? []
  const { items: entities } = await catalogApi.getEntities()

  logger.info("Syncing entities with Cortex...")
  await cortexApi.syncEntities(entities, customMappings)
  logger.info("Finished syncing entities with Cortex")
}
