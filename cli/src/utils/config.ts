import { readFileSync } from 'fs';
import { resolve } from 'path';

const pjson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

export const cliBinName = pjson.oclif.bin as string;
