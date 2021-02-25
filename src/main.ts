import { Singular } from '@singular/core';
import tsconfig from './tsconfig.json';
import { profiles } from './server.config';

Singular
.registerAliases(tsconfig.compilerOptions.paths)
.config('dev', profiles.dev)
.launch('dev');
