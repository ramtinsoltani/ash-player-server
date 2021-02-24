import { ServerConfig } from '@singular/core';

export const profiles: { [name: string]: ServerConfig } = {

  dev: {
    port: 5000,
    logRequestHeaders: true,
    logResponseErrors: true
  },

  prod: {
    https: true,
    httpsPort: 5001,
    httpsKey: 'path/to/key.pem',
    httpsCert: 'path/to/cert.pem',
    enableCors: true,
    logRequestHeaders: true,
    logResponseErrors: true
  },

  test: {
    port: 5002,
    writeLogsToFile: false,
    logRequestHeaders: true,
    logResponseErrors: true,
    archiveLogs: false,
    consoleLogLevels: 'all',
  }

};
