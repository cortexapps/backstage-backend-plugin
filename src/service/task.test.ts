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
import { CortexApi } from "../api/CortexApi";
import mock from 'jest-mock-extended/lib/Mock';
import { Entity } from "@backstage/catalog-model";
import { ExtensionApi } from "@cortexapps/backstage-plugin-extensions";
import { CatalogApi } from "@backstage/catalog-client";
import { submitEntitySync } from "./task";
import * as winston from "winston";

describe('task', () => {
    const logger = winston.createLogger({
        transports: [
            new winston.transports.Console()
        ]
    })
    const cortexApi = mock<CortexApi>()

    const component1: Entity = {
        apiVersion: '1',
        kind: 'Component',
        metadata: { name: 'component', namespace: 'default' },
    }

    const component2: Entity = {
        apiVersion: '1',
        kind: 'Component',
        metadata: { name: 'component2', namespace: 'default' },
    }

    const catalogApi: Partial<CatalogApi> = {
        async getEntities(_) {
            return {
                items: [component1]
            }
        }
    }

    const team1 = {
        teamTag: "my-group",
        name: "My Group",
        shortDescription: "Short Description",
        fullDescription: "Full Description",
        links: [
            { name: "Link", type: "DOCUMENTATION", url: "URL", description: "description" }
        ],
        slackChannels: [
            { name: "Slack Channel", notificationsEnabled: true }
        ],
        emailMembers: [
            { name: "Email Member", email: "emailmember@cortex.io" }
        ],
        additionalMembers: [
            { name: "Additional Member", email: "additionalmember@cortex.io" }
        ]
    }

    const team2 = {
        teamTag: "my-other-group",
        name: "My Other Group"
    }

    const teams = [team1, team2]
    const relationships = [
        { parentTeamTag: team1.teamTag, childTeamTag: team2.teamTag }
    ]

    const extension = {
        'x-cortex-git': {
            'github': {
                repository: 'my/repo'
            }
        }
    }

    const extensionApi: Partial<ExtensionApi> = {
        async getCustomMappings() {
            return [() => extension]
        },

        async getTeamOverrides(_) {
            return {
                teams,
                relationships,
            }
        }
    }

    it('should sync entities with overrides', async () => {
        await submitEntitySync({
            logger,
            cortexApi,
            syncWithGzip: false,
            catalogApi: catalogApi as CatalogApi,
            extensionApi
        });

        expect(cortexApi.submitEntitySync).toHaveBeenLastCalledWith(
            [{ ...component1, spec: extension }],
            false,
            { teams, relationships },
            { token: undefined }
        );
    })

    it('should sync entities with gzip override', async () => {
        await submitEntitySync({
            logger,
            cortexApi,
            syncWithGzip: true,
            catalogApi: catalogApi as CatalogApi,
            extensionApi
        });

        expect(cortexApi.submitEntitySync).toHaveBeenLastCalledWith(
          [{ ...component1, spec: extension }],
          true,
          { teams, relationships },
          { token: undefined }
        );
    })

    it('should support sync with kind filter extension', async () => {
        const extensionApi: Partial<ExtensionApi> = {
            async getSyncEntityFilter() {
                return {
                    kinds: [],
                }
            }
        }

        const catalogApi: Partial<CatalogApi> = {
            async getEntities({ filter }) {
                console.log(filter);
                if (filter['kind'] === undefined) {
                    throw Error('Kind filter extension not in use')
                }
                return {
                    items: [component1]
                }
            }
        }

        await submitEntitySync({
            logger,
            cortexApi,
            syncWithGzip: true,
            catalogApi: catalogApi as CatalogApi,
            extensionApi
        });

        expect(cortexApi.submitEntitySync).toHaveBeenLastCalledWith(
          [component1],
          true,
          undefined,
          { token: undefined }
        );
    })

    it('should support sync with individual entity filter extension', async () => {
        const extensionApi: Partial<ExtensionApi> = {
            async getSyncEntityFilter() {
                return {
                    entityFilter: (entity) => entity.metadata.name === component1.metadata.name
                }
            }
        }

        const catalogApi: Partial<CatalogApi> = {
            async getEntities(_) {
                return Promise.resolve({
                    items: [component1, component2]
                })
            }
        }

        await submitEntitySync({
            logger,
            cortexApi,
            syncWithGzip: true,
            catalogApi: catalogApi as CatalogApi,
            extensionApi
        });

        expect(cortexApi.submitEntitySync).toHaveBeenLastCalledWith(
          [component1],
          true,
          undefined,
          { token: undefined }
        );
    })
});