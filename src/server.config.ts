import { ServerConfig } from '@singular/core';

export const profiles: { [name: string]: ServerConfig } = {

  dev: {
    port: +process.env.PORT || 8000,
    logRequestHeaders: false,
    logResponseErrors: true,
    writeLogsToFile: false,
    consoleLogLevels: 'all',
    enableCors: true
  }

};
