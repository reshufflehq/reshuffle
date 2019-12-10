import { Application } from '@binaris/spice-node-client/interfaces';

export function createApp(defaults: Partial<Application>): Application {
  return {
    accountId: '127001',
    createdAt: new Date('1999-12-31T23:59:59.999Z'),
    updatedAt: new Date('1999-12-31T23:59:59.999Z'),
    id: 'abc',
    name: 'fluffy-pancake-66',
    locked: false,
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
    ...defaults,
  };
}
