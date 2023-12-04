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
import { CortexApi } from './CortexApi';
import { Entity } from '@backstage/catalog-model';
import { PluginEndpointDiscovery } from '@backstage/backend-common';
import { TeamOverrides } from '@cortexapps/backstage-plugin-extensions';
import { EntitySyncProgress, RequestOptions } from './types';
import { Buffer } from 'buffer';
import { gzipSync } from 'zlib';
import { chunk } from 'lodash';

const fetch = require('node-fetch');

type Options = {
  discoveryApi: PluginEndpointDiscovery;
};

export class CortexClient implements CortexApi {
  private readonly discoveryApi: PluginEndpointDiscovery;

  constructor(options: Options) {
    this.discoveryApi = options.discoveryApi;
  }

  async submitEntitySync(
    entities: Entity[],
    shouldGzipBody: boolean,
    teamOverrides?: TeamOverrides,
    requestOptions?: RequestOptions,
  ): Promise<EntitySyncProgress> {
    const post = async (path: string, body?: any) => {
      return shouldGzipBody
        ? await this.postVoidWithGzipBody(path, body, requestOptions)
        : await this.postVoid(path, body, requestOptions);
    };

    await this.postVoid('/api/backstage/v2/entities/sync-init', undefined, requestOptions);

    for (let customMappingsChunk of chunk(entities, CHUNK_SIZE)) {
      await post(`/api/backstage/v2/entities/sync-chunked`, {
        entities: customMappingsChunk,
      });
    }

    for (let teamOverridesTeamChunk of chunk(
      teamOverrides?.teams ?? [],
      CHUNK_SIZE,
    )) {
      await post(`/api/backstage/v2/entities/sync-chunked`, {
        entities: [],
        teamOverrides: {
          teams: teamOverridesTeamChunk,
          relationships: [],
        },
      });
    }

    for (let teamOverridesRelationshipsChunk of chunk(
      teamOverrides?.relationships ?? [],
      CHUNK_SIZE,
    )) {
      await post(`/api/backstage/v2/entities/sync-chunked`, {
        entities: [],
        teamOverrides: {
          teams: [],
          relationships: teamOverridesRelationshipsChunk,
        },
      });
    }

    return await this.post(
      '/api/backstage/v2/entities/sync-submit',
      undefined,
      requestOptions,
    );
  }

  private async getBasePath(): Promise<string> {
    const proxyBasePath = await this.discoveryApi.getBaseUrl('proxy');
    return `${proxyBasePath}/cortex`;
  }

  private async post(
    path: string,
    body?: any,
    requestOptions?: RequestOptions,
  ): Promise<any> {
    const basePath = await this.getBasePath();
    const url = `${basePath}${path}`;

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...(requestOptions?.token && {
          Authorization: `Bearer ${requestOptions.token}`,
        }),
      },
    });

    if (response.status !== 200) {
      throw new Error(`Error communicating with Cortex`);
    }

    return response.json();
  }

  private async postVoid(
    path: string,
    body?: any,
    requestOptions?: RequestOptions,
  ): Promise<void> {
    const basePath = await this.getBasePath();
    const url = `${basePath}${path}`;

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...(requestOptions?.token && {
          Authorization: `Bearer ${requestOptions.token}`,
        }),
      },
    });
    if (response.status !== 200) {
      throw new Error(`Error communicating with Cortex`);
    }

    return;
  }

  private async postVoidWithGzipBody(
    path: string,
    body?: any,
    requestOptions?: RequestOptions,
  ): Promise<void> {
    const basePath = await this.getBasePath();
    const url = `${basePath}${path}`;

    const input = Buffer.from(JSON.stringify(body), 'utf-8');
    const compressed = gzipSync(input);

    const response = await fetch(url, {
      method: 'POST',
      body: compressed,
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        ...(requestOptions?.token && {
          Authorization: `Bearer ${requestOptions.token}`,
        }),
      },
    });

    if (response.status !== 200) {
      throw new Error(`Error communicating with Cortex`);
    }

    return;
  }
}

const CHUNK_SIZE = 1000;
