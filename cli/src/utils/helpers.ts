import { dirname, join } from 'path';
import { readFile } from 'mz/fs';
import findUp from 'find-up';
import dotenv from 'dotenv';
import { CLIError } from '@oclif/errors';
import { Environment } from '@binaris/spice-node-client/interfaces';

export interface Project {
  directory: string;
  applicationId: string;
  defaultEnv: string;
}

export function findProjectByDirectory(projects: Project[] | undefined, projectDir: string) {
  if (projects === undefined) {
    return undefined;
  }
  // TODO: case insensitive search dependening on OS
  return projects.find(({ directory }) => directory === projectDir);
}

export async function getProjectRootDir(): Promise<string> {
  const packageJsonPath = await findUp('package.json', { type: 'file' });
  if (packageJsonPath === undefined) {
    throw new CLIError('Could not find a relevant package.json file');
  }
  return dirname(packageJsonPath);
}

export function getEnvFromArgs(args: string[]): Array<[string, string]> {
  return args.map((a) => {
    const [key, ...rest] = a.split('=');
    if (rest.length === 0) {
      const val = process.env[key];
      if (!val) {
        throw new CLIError(`Missing environment variable ${key}`);
      }
      return [key, val];
    }
    return [key, rest.join('=')];
  });
}

export function mergeEnvArrays(...arrs: Array<Array<[string, string]>>): Array<[string, string]> {
  const merged: Record<string, string> = {};
  for (const arr of arrs) {
    for (const [k, v] of arr) {
      merged[k] = v;
    }
  }
  return Object.entries(merged);
}

export async function getProjectEnv(): Promise<Array<[string, string]>> {
  const envFile = join(await getProjectRootDir(), '.env');
  try {
    const content = await readFile(envFile);
    return Object.entries(dotenv.parse(content));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

export async function getProjectPackageJson() {
  const packageJsonPath = await findUp('package.json', { type: 'file' });
  if (packageJsonPath === undefined) {
    throw new CLIError('Could not find a relevant package.json file');
  }
  const content = await readFile(packageJsonPath, 'utf8');
  const loaded = JSON.parse(content);

  if (typeof loaded !== 'object') {
    throw new Error('Malformed package.json');
  }
  return loaded;
}

export function getPrimaryDomain(environment: Environment) {
  const { domains } = environment;
  const connectedCustomDomain = domains.find((d) => d.type === 'custom' && d.connected);
  if (connectedCustomDomain) {
    return connectedCustomDomain.name;
  }
  return `${domains.find((d) => d.type === 'subdomain')!.name}`;
}

export function getPrimaryURL(environment: Environment) {
  return `https://${getPrimaryDomain(environment)}`;
}
