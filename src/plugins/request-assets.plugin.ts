import { Plugin, PluginHooks, PluginLogger, PluginDataBeforeInternalMiddleware, Request as OriginalRequest } from '@singular/core';

@Plugin({
  name: 'request-assets'
})
export class RequestAssetsPlugin implements PluginHooks.BeforeInternalMiddleware {

  constructor() { }

  beforeInternalMiddleware(log: PluginLogger, data: PluginDataBeforeInternalMiddleware): void {

    // Initialize assets object on request
    data.app.use((req, res, next) => {

      (<any>req).assets = {};

      next();

    });

    log.debug('Request assets object initialized');

  }

}

export interface Request<T=any> extends OriginalRequest {

  assets: T;

}
