export class DatabaseClient {
  async query(_query: string, _params?: any[]): Promise<any> {
    return [];
  }

  async setTenantContext(_tenantId: string): Promise<void> {
    return;
  }

  async transaction<T>(cb: (tx: DatabaseClient) => Promise<T>): Promise<T> {
    return cb(this);
  }
}
