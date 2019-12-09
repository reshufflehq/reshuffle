import { Application } from '@binaris/spice-node-client/interfaces';

export function createApp( locked: boolean, lockReason?: string) {
  const makeApp = (overrides?: Partial<Application>): Application => ({
    accountId: '127001',
    createdAt: new Date('1999-12-31T23:59:59.999Z'),
    updatedAt: new Date('1999-12-31T23:59:59.999Z'),
    locked,
    lockReason,
    id: 'abc',
    name: 'fluffy-pancake-66',
    environments: [
      {
        name: 'default',
        domains: [
          {
            type: 'subdomain',
            name: 'a.b.c',
          },
        ],
      },
    ],
    ...overrides,
  });
  return makeApp;
}
