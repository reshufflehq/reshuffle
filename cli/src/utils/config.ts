import { readFileSync } from 'fs';
import { resolve } from 'path';

const pjson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

export const cliBinName = pjson.oclif.bin as string;

export function getBaseUrl(subdomain: string, realm: string, protocol: 'http' | 'https' = 'https') {
  const domain = realm === 'prod' ? 'shiftjs.com' : 'shiftjs.io';
  const actualSubdomain = realm === 'prod' ? subdomain :
    subdomain === 'app' ? realm :
    `${subdomain}-${realm}`;
  return `${protocol}://${actualSubdomain}.${domain}`;
}
