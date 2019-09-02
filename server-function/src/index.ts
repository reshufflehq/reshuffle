import path from 'path';
import fs from 'mz/fs';
import mimeTypes from 'mime-types';
import ms from 'milliseconds';
import fresh from 'fresh';
import url from 'url';
import net from 'net';

// create-react-app uses only 32 bits for hashes, allow caching for a limited
// time for lower chance of collision
const CACHE_TIME_SEC = ms.months(1) / 1000;

export async function statIfFile(filePath: string): Promise<fs.Stats | undefined> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() ? stats : undefined;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
}

interface ServeFile {
  action: 'serveFile';
  fullPath: string;
  contentType: string | false;
  cacheHint: any;
  status?: number;
}

interface SendStatus {
  action: 'sendStatus';
  status: number;
}

interface Invoke {
  action: 'handleInvoke';
}

type Decision = ServeFile | Invoke | SendStatus;

interface ServerOptions {
  directory: string;
  extensions?: string[];
  cachedPath?: string;
  allowedHosts?: string[];
  publicHost?: string;
  listenHost?: string;
}

export class Server {
  private directory: string;
  private extensions: string[];
  private cachedPath: string;
  private allowedHosts: string[];
  private publicHost?: string;
  private listenHost?: string;

  constructor(options: ServerOptions) {
    this.directory = options.directory;
    this.extensions = options.extensions || ['.html'];
    this.cachedPath = options.cachedPath || '/static';
    this.allowedHosts = options.allowedHosts || [];
    this.publicHost = options.publicHost;
    this.listenHost = options.listenHost;
  }

  public async handle(reqUrl: string, headers: { [k: string]: string | string[] | undefined }): Promise<Decision> {
    if (reqUrl === '/invoke') {
      return { action: 'handleInvoke' };
    }
    if (reqUrl === '/') {
      return this.handle('/index.html', headers);
    }
    const urlWithRemovedSegements = path.join('/', reqUrl);
    const fullPath = path.join(this.directory, urlWithRemovedSegements);
    let foundPath: string | undefined;
    let foundStat: fs.Stats | undefined;
    // tslint:disable-next-line:no-conditional-assignment
    if (foundStat = await statIfFile(fullPath)) {
      foundPath = fullPath;
    }
    if (!foundPath) {
      for (const ext of this.extensions) {
        const p = fullPath + ext;
        // tslint:disable-next-line:no-conditional-assignment
        if (foundStat = await statIfFile(p)) {
          foundPath = p;
          break;
        }
      }
    }
    if (foundStat && foundPath) {
      const cacheHint = urlWithRemovedSegements.startsWith(this.cachedPath) ? {
        'last-modified': foundStat.mtime.toUTCString(),
        'cache-control': `public, max-age=${CACHE_TIME_SEC}`,
      } : {};
      if (fresh(headers, cacheHint)) {
        return {
          action: 'sendStatus', status: 304,
        };
      }
      return {
        action: 'serveFile',
        fullPath: foundPath,
        contentType: mimeTypes.contentType(path.extname(foundPath)),
        cacheHint,
      };
    }
    const notFoundPath = path.join(this.directory, '/404.html');
    if (await statIfFile(notFoundPath)) {
      return {
        action: 'serveFile',
        contentType: mimeTypes.contentType('404.html'),
        fullPath: notFoundPath,
        cacheHint: {},
        status: 404,
      };
    }
    if (reqUrl === '/index.html') {
      return { action: 'sendStatus', status: 404 };
    }
    return this.handle('/index.html', headers);
  }

  private getHostnameFromHeaders(
    headers: { [k: string]: string | string[] | undefined },
    headerToCheck: string = 'host'
  ): string | false {
    // get the Host header and extract hostname
    // we don't care about port not matching

    const hostHeader: string = headers[headerToCheck] as string;

    if (!hostHeader) {
      return false;
    }

    // use the node url-parser to retrieve the hostname from the host-header.
    const hostname = url.parse(
      // if hostHeader doesn't have scheme, add // for parsing.
      /^(.+:)?\/\//.test(hostHeader) ? hostHeader : `//${hostHeader}`,
      false,
      true
    ).hostname;

    if (!hostname) {
      return false;
    }

    return hostname;
  }

  // adapted from webpack-dev-server lib/Server.js:checkHeaders
  // https://github.com/webpack/webpack-dev-server/blob/ea61454e87ffa113c485b9ca4b53e586be3b0917/lib/Server.js#L821
  // and split into two methods:
  // checkHeadersAllowedHost - which only verifies a finite list of hosts
  // checkHeadersLocalHost - which allows special cases like 'localhost', and the listening host
  public checkHeadersAllowedHost(
    headers: { [k: string]: string | string[] | undefined },
    headerToCheck: string = 'host'
  ) {

    const hostname = this.getHostnameFromHeaders(headers, headerToCheck);
    if (!hostname) {
      return false;
    }
    // allow if hostname is in allowedHosts
    if (this.allowedHosts.length) {
      for (const allowedHost of this.allowedHosts) {

        if (allowedHost === hostname) {
          return true;
        }

        // support "." as a subdomain wildcard
        // e.g. ".example.com" will allow "example.com", "www.example.com", "subdomain.example.com", etc
        if (allowedHost[0] === '.') {
          // "example.com"
          if (hostname === allowedHost.substring(1)) {
            return true;
          }
          // "*.example.com"
          if (hostname.endsWith(allowedHost)) {
            return true;
          }
        }
      }
    }

    // disallow
    return false;
  }

  public checkHeadersLocalHost(
    headers: { [k: string]: string | string[] | undefined },
    headerToCheck: string = 'host'
  ) {
    const hostname = this.getHostnameFromHeaders(headers, headerToCheck);
    if (!hostname) {
      return false;
    }
    // always allow requests with explicit IPv4 or IPv6-address.
    // A note on IPv6 addresses:
    // hostHeader will always contain the brackets denoting
    // an IPv6-address in URLs,
    // these are removed from the hostname in url.parse(),
    // so we have the pure IPv6-address in hostname.
    if (net.isIPv4(hostname) || net.isIPv6(hostname)) {
      return true;
    }
    // always allow localhost host, for convience
    if (hostname === 'localhost') {
      return true;
    }
    // allow hostname of listening adress
    if (hostname === this.listenHost) {
      return true;
    }
    // also allow public hostname if provided
    if (typeof this.publicHost === 'string') {
      const idxPublic = this.publicHost.indexOf(':');

      const publicHostname =
        idxPublic >= 0 ? this.publicHost.substr(0, idxPublic) : this.publicHost;

      if (hostname === publicHostname) {
        return true;
      }
    }
  }
}
