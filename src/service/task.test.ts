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
import { syncEntities } from "./task";
import { Logger } from "winston";
import { captor } from "jest-mock-extended";

const winston = require('winston');

describe('<SettingsPage/>', () => {

    const logger: Logger = winston.createLogger({
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
        await syncEntities({
            logger,
            cortexApi,
            catalogApi: catalogApi as CatalogApi,
            extensionApi
        });

        const customMappingsCaptor = captor();
        expect(cortexApi.syncEntities).toHaveBeenLastCalledWith(
            [component1],
            customMappingsCaptor,
            { teams, relationships },
            { token: undefined }
        );

        expect(customMappingsCaptor.value).toHaveLength(1);
        expect(customMappingsCaptor.value[0]()).toBe(extension);
    })
});