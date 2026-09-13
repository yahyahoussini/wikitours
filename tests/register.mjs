// `node --import ./tests/register.mjs --test …` — installs the alias/JSON hooks
// before any test file is evaluated.
import { register } from 'node:module';

register('./alias-loader.mjs', import.meta.url);
