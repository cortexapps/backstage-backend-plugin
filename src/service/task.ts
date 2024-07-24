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
import { CortexApi } from '../api/CortexApi';
import { CatalogApi } from '@backstage/catalog-client';
import { ExtensionApi } from '@cortexapps/backstage-plugin-extensions';
import { AuthService, LoggerService } from '@backstage/backend-plugin-api'
import { Entity } from '@backstage/catalog-model';
import { applyCustomMappings } from '../utils/componentUtils';

interface SyncEntitiesOptions {
  logger: LoggerService;
  cortexApi: CortexApi;
  syncWithGzip: boolean;
  catalogApi: CatalogApi;
  extensionApi?: ExtensionApi;
  auth: AuthService;
}

const getBackstageEntities: (options: {
  catalogApi: CatalogApi;
  extensionApi?: ExtensionApi;
  token?: string;
}) => Promise<Entity[]> = async ({ catalogApi, extensionApi, token }) => {
  const syncEntityFilter = await extensionApi?.getSyncEntityFilter?.();
  const { items: entities } = await catalogApi.getEntities(
    syncEntityFilter?.kinds
      ? { filter: { kind: syncEntityFilter?.kinds } }
      : undefined,
    { token }
  );
  const filteredEntities = syncEntityFilter?.entityFilter
    ? entities.filter(syncEntityFilter?.entityFilter)
    : entities;

  const customMappings = await extensionApi?.getCustomMappings?.();
  const withCustomMappings: Entity[] = customMappings
    ? filteredEntities.map(entity =>
        applyCustomMappings(entity, customMappings),
      )
    : filteredEntities;

  return withCustomMappings;
};
export const submitEntitySync: (options: SyncEntitiesOptions) => Promise<void> =
  async ({
    logger,
    cortexApi,
    syncWithGzip,
    catalogApi,
    extensionApi,
    auth,
  }) => {
    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    })

    logger.info('Fetching all Backstage entities...');
    const entities = await getBackstageEntities({ catalogApi, extensionApi, token });

    logger.info('Fetching Cortex extensions...');
    const groupOverrides = await extensionApi?.getTeamOverrides?.(entities);

    logger.info('Submitting entity sync task to Cortex...');
    try {
      await cortexApi.submitEntitySync(entities, syncWithGzip, groupOverrides, {
        token,
      });
    } catch (err: any) {
      logger.error(
        `Error while submitting entity sync task to Cortex: ${err.message}`,
      );
    }

    logger.info('Submitted entity sync task to Cortex');
  };
