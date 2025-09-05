import { execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $disconnect: jest.fn(),
    $use: jest.fn()
  }))
}));

import { DatabaseMigration } from '../src/database/client';

const connectionString = 'postgresql://user:pass@localhost:5432/test';

describe('DatabaseMigration', () => {
  beforeEach(() => {
    (execSync as jest.Mock).mockReset();
  });

  test('migrate executes prisma migrate deploy', async () => {
    const migration = new DatabaseMigration({ connectionString });
    await migration.migrate();
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('prisma migrate deploy'),
      expect.objectContaining({
        env: expect.objectContaining({ DATABASE_URL: connectionString })
      })
    );
  });

  test('reset executes prisma migrate reset', async () => {
    const migration = new DatabaseMigration({ connectionString });
    await migration.reset();
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('prisma migrate reset'),
      expect.objectContaining({
        env: expect.objectContaining({ DATABASE_URL: connectionString })
      })
    );
  });
});
