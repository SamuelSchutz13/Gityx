import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      roots: ['<rootDir>/src/server', '<rootDir>/test'],
      transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
    },
  ],
};

export default config;
