import { Entity, EntityName, Location } from '@backstage/catalog-model';

export const CATALOG_FILTER_EXISTS = Symbol('CATALOG_FILTER_EXISTS');

export type CatalogEntitiesRequest = {
  filter?:
    | Record<string, string | symbol | (string | symbol)[]>[]
    | Record<string, string | symbol | (string | symbol)[]>
    | undefined;
  fields?: string[] | undefined;
};

export type CatalogListResponse<T> = {
  items: T[];
};

export type CatalogRequestOptions = {
  token?: string;
};

export interface CatalogApi {
  // Entities
  getEntities(
    request?: CatalogEntitiesRequest,
    options?: CatalogRequestOptions,
  ): Promise<CatalogListResponse<Entity>>;
  getEntityByName(
    name: EntityName,
    options?: CatalogRequestOptions,
  ): Promise<Entity | undefined>;
  removeEntityByUid(
    uid: string,
    options?: CatalogRequestOptions,
  ): Promise<void>;

  // Locations
  getLocationById(
    id: string,
    options?: CatalogRequestOptions,
  ): Promise<Location | undefined>;
  getOriginLocationByEntity(
    entity: Entity,
    options?: CatalogRequestOptions,
  ): Promise<Location | undefined>;
  getLocationByEntity(
    entity: Entity,
    options?: CatalogRequestOptions,
  ): Promise<Location | undefined>;
  addLocation(
    location: AddLocationRequest,
    options?: CatalogRequestOptions,
  ): Promise<AddLocationResponse>;
  removeLocationById(
    id: string,
    options?: CatalogRequestOptions,
  ): Promise<void>;
}

export type AddLocationRequest = {
  type?: string;
  target: string;
  dryRun?: boolean;
  presence?: 'optional' | 'required';
};

export type AddLocationResponse = {
  location: Location;
  entities: Entity[];
};
