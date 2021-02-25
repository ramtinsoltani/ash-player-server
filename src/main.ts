import { Singular } from '@singular/core';
import tsconfig from './tsconfig.json';
import { profiles } from './server.config';
import { RequestAssetsPlugin } from './plugins/request-assets.plugin';

Singular
.registerAliases(tsconfig.compilerOptions.paths)
.install(RequestAssetsPlugin)
.config('dev', profiles.dev)
.launch('dev');
