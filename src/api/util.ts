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
import { Entity } from "@backstage/catalog-model";

export const ENTITY_DEFAULT_NAMESPACE = 'default';
export const LOCATION_ANNOTATION = "backstage.io/managed-by-location";
export const ORIGIN_LOCATION_ANNOTATION = "backstage.io/managed-by-origin-location";
export const CATALOG_FILTER_EXISTS = Symbol('CATALOG_FILTER_EXISTS');

export function stringifyEntityRef(
  ref: Entity | { kind: string; namespace?: string; name: string },
): string {
  let kind;
  let namespace;
  let name;

  if ('metadata' in ref) {
    kind = ref.kind;
    namespace = ref.metadata.namespace ?? ENTITY_DEFAULT_NAMESPACE;
    name = ref.metadata.name;
  } else {
    kind = ref.kind;
    namespace = ref.namespace ?? ENTITY_DEFAULT_NAMESPACE;
    name = ref.name;
  }

  return `${kind.toLowerCase()}:${namespace.toLowerCase()}/${name.toLowerCase()}`;
}

export function stringifyLocationReference(ref: {
  type: string;
  target: string;
}): string {
  const { type, target } = ref;

  if (!type) {
    throw new TypeError(`Unable to stringify location reference, empty type`);
  } else if (!target) {
    throw new TypeError(`Unable to stringify location reference, empty target`);
  }

  return `${type}:${target}`;
}
