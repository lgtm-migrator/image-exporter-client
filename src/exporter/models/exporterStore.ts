/* eslint-disable camelcase */
import {
  types,
  Instance,
  flow,
  getParent,
  getSnapshot,
} from 'mobx-state-tree';
import { Polygon } from '@turf/helpers';
import { ApiHttpResponse } from '../../common/models/api-response';
import { ResponseState } from '../../common/models/ResponseState';
import { getLayerUrl } from '../../common/helpers/layer-url';
import { searchParams } from './search-params';
import { IRootStore } from './rootStore';
import { IGeoPackage } from './geoPackage';

export type GeoPackageResponse = IGeoPackage[];
export interface ExportResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export interface PackageInfo {
  packName: string;
  sizeEst: number;
  tilesEst: number;
  minZoom?: number;
  maxZoom?: number;
}

export type ExporterResponse = ApiHttpResponse<ExportResult>;

export const exporterStore = types
  .model({
    state: types.enumeration<ResponseState>(
      'State',
      Object.values(ResponseState)
    ),
    searchParams: types.optional(searchParams, {}),
    exportedPackages: types.maybe(types.frozen<any>()),
  })
  .views((self) => ({
    get root(): IRootStore {
      return getParent(self);
    },
  }))
  .actions((self) => {
    const startExportGeoPackage: (packInfo: PackageInfo) => Promise<void> = flow(
      function* startExportGeoPackage(packInfo: PackageInfo): Generator<
        Promise<ExporterResponse>,
        void,
        ExporterResponse
      > {
        self.state = ResponseState.PENDING;
        const snapshot = getSnapshot(self.searchParams);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: Record<string, unknown> = {};
        // Prepare body data for request
        params.fileName = packInfo.packName;
        params.sizeEst = packInfo.sizeEst;
        params.tilesEst = packInfo.tilesEst;
        params.directoryName = 'test';
        params.exportedLayers = [{exportType: 'raster', url: getLayerUrl()}];
        const coordinates = (snapshot.geojson as Polygon).coordinates[0];
        params.bbox = [coordinates[0][0], coordinates[0][1], coordinates[2][0], coordinates[2][1]];

        try {
          console.log('Fetch params--->',params);
          const result = yield self.root.fetch('/exportGeopackage', params);
          // const responseBody = result.data.data;
          self.state = ResponseState.DONE;
        } catch (error) {
          console.error(error);
          self.state = ResponseState.ERROR;
        }
      }
    );
    const getGeoPackages: () => Promise<void> = flow(
      function* getGeoPackages(): Generator<
        Promise<GeoPackageResponse>,
        void,
        GeoPackageResponse
      > {
        try {
          console.log('Fetch geoPackages--->');
          // const result = yield self.root.fetch('/TODOGeopackages',{});
          const result = yield Promise.resolve([
            {
              fileName:'kuku',
              sizeEst: 23,
              tilesEst: 120,
              status: 'FINISHED',
              link:'https://packages/kuku.gpkg',
              date: new Date(),
              progress: 100,
            },
            {
              fileName:'muku',
              sizeEst: 345,
              tilesEst: 2000,
              status: 'INPROGRESS',
              link:'https://packages/muku.gpkg',
              date: new Date(),
              progress: 80,
            },
          ])
          self.exportedPackages = result;
        } catch (error) {
          console.error(error);
          self.state = ResponseState.ERROR;
        }
      }
    );


    return {
      startExportGeoPackage,
      getGeoPackages,
    };
  });

export interface IConflictsStore extends Instance<typeof exporterStore> {}
