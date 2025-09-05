declare module 'pg' {
  export class Pool {
    constructor(config: any);
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
  export interface PoolClient {
    query: (...args: any[]) => any;
    release: () => void;
  }
}
