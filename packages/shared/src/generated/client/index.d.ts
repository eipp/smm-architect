
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Workspace
 * 
 */
export type Workspace = $Result.DefaultSelection<Prisma.$WorkspacePayload>
/**
 * Model WorkspaceRun
 * 
 */
export type WorkspaceRun = $Result.DefaultSelection<Prisma.$WorkspaceRunPayload>
/**
 * Model AuditBundle
 * 
 */
export type AuditBundle = $Result.DefaultSelection<Prisma.$AuditBundlePayload>
/**
 * Model Connector
 * 
 */
export type Connector = $Result.DefaultSelection<Prisma.$ConnectorPayload>
/**
 * Model ConsentRecord
 * 
 */
export type ConsentRecord = $Result.DefaultSelection<Prisma.$ConsentRecordPayload>
/**
 * Model BrandTwin
 * 
 */
export type BrandTwin = $Result.DefaultSelection<Prisma.$BrandTwinPayload>
/**
 * Model DecisionCard
 * 
 */
export type DecisionCard = $Result.DefaultSelection<Prisma.$DecisionCardPayload>
/**
 * Model SimulationResult
 * 
 */
export type SimulationResult = $Result.DefaultSelection<Prisma.$SimulationResultPayload>
/**
 * Model AssetFingerprint
 * 
 */
export type AssetFingerprint = $Result.DefaultSelection<Prisma.$AssetFingerprintPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Workspaces
 * const workspaces = await prisma.workspace.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Workspaces
   * const workspaces = await prisma.workspace.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.workspace`: Exposes CRUD operations for the **Workspace** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Workspaces
    * const workspaces = await prisma.workspace.findMany()
    * ```
    */
  get workspace(): Prisma.WorkspaceDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.workspaceRun`: Exposes CRUD operations for the **WorkspaceRun** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more WorkspaceRuns
    * const workspaceRuns = await prisma.workspaceRun.findMany()
    * ```
    */
  get workspaceRun(): Prisma.WorkspaceRunDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.auditBundle`: Exposes CRUD operations for the **AuditBundle** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuditBundles
    * const auditBundles = await prisma.auditBundle.findMany()
    * ```
    */
  get auditBundle(): Prisma.AuditBundleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.connector`: Exposes CRUD operations for the **Connector** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Connectors
    * const connectors = await prisma.connector.findMany()
    * ```
    */
  get connector(): Prisma.ConnectorDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.consentRecord`: Exposes CRUD operations for the **ConsentRecord** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ConsentRecords
    * const consentRecords = await prisma.consentRecord.findMany()
    * ```
    */
  get consentRecord(): Prisma.ConsentRecordDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.brandTwin`: Exposes CRUD operations for the **BrandTwin** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BrandTwins
    * const brandTwins = await prisma.brandTwin.findMany()
    * ```
    */
  get brandTwin(): Prisma.BrandTwinDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.decisionCard`: Exposes CRUD operations for the **DecisionCard** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DecisionCards
    * const decisionCards = await prisma.decisionCard.findMany()
    * ```
    */
  get decisionCard(): Prisma.DecisionCardDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.simulationResult`: Exposes CRUD operations for the **SimulationResult** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SimulationResults
    * const simulationResults = await prisma.simulationResult.findMany()
    * ```
    */
  get simulationResult(): Prisma.SimulationResultDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.assetFingerprint`: Exposes CRUD operations for the **AssetFingerprint** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AssetFingerprints
    * const assetFingerprints = await prisma.assetFingerprint.findMany()
    * ```
    */
  get assetFingerprint(): Prisma.AssetFingerprintDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.15.0
   * Query Engine version: 85179d7826409ee107a6ba334b5e305ae3fba9fb
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Workspace: 'Workspace',
    WorkspaceRun: 'WorkspaceRun',
    AuditBundle: 'AuditBundle',
    Connector: 'Connector',
    ConsentRecord: 'ConsentRecord',
    BrandTwin: 'BrandTwin',
    DecisionCard: 'DecisionCard',
    SimulationResult: 'SimulationResult',
    AssetFingerprint: 'AssetFingerprint'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "workspace" | "workspaceRun" | "auditBundle" | "connector" | "consentRecord" | "brandTwin" | "decisionCard" | "simulationResult" | "assetFingerprint"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Workspace: {
        payload: Prisma.$WorkspacePayload<ExtArgs>
        fields: Prisma.WorkspaceFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WorkspaceFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WorkspaceFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload>
          }
          findFirst: {
            args: Prisma.WorkspaceFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WorkspaceFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload>
          }
          findMany: {
            args: Prisma.WorkspaceFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload>[]
          }
          create: {
            args: Prisma.WorkspaceCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload>
          }
          createMany: {
            args: Prisma.WorkspaceCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WorkspaceCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload>[]
          }
          delete: {
            args: Prisma.WorkspaceDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload>
          }
          update: {
            args: Prisma.WorkspaceUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload>
          }
          deleteMany: {
            args: Prisma.WorkspaceDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WorkspaceUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.WorkspaceUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload>[]
          }
          upsert: {
            args: Prisma.WorkspaceUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspacePayload>
          }
          aggregate: {
            args: Prisma.WorkspaceAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWorkspace>
          }
          groupBy: {
            args: Prisma.WorkspaceGroupByArgs<ExtArgs>
            result: $Utils.Optional<WorkspaceGroupByOutputType>[]
          }
          count: {
            args: Prisma.WorkspaceCountArgs<ExtArgs>
            result: $Utils.Optional<WorkspaceCountAggregateOutputType> | number
          }
        }
      }
      WorkspaceRun: {
        payload: Prisma.$WorkspaceRunPayload<ExtArgs>
        fields: Prisma.WorkspaceRunFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WorkspaceRunFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WorkspaceRunFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload>
          }
          findFirst: {
            args: Prisma.WorkspaceRunFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WorkspaceRunFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload>
          }
          findMany: {
            args: Prisma.WorkspaceRunFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload>[]
          }
          create: {
            args: Prisma.WorkspaceRunCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload>
          }
          createMany: {
            args: Prisma.WorkspaceRunCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WorkspaceRunCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload>[]
          }
          delete: {
            args: Prisma.WorkspaceRunDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload>
          }
          update: {
            args: Prisma.WorkspaceRunUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload>
          }
          deleteMany: {
            args: Prisma.WorkspaceRunDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WorkspaceRunUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.WorkspaceRunUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload>[]
          }
          upsert: {
            args: Prisma.WorkspaceRunUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WorkspaceRunPayload>
          }
          aggregate: {
            args: Prisma.WorkspaceRunAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWorkspaceRun>
          }
          groupBy: {
            args: Prisma.WorkspaceRunGroupByArgs<ExtArgs>
            result: $Utils.Optional<WorkspaceRunGroupByOutputType>[]
          }
          count: {
            args: Prisma.WorkspaceRunCountArgs<ExtArgs>
            result: $Utils.Optional<WorkspaceRunCountAggregateOutputType> | number
          }
        }
      }
      AuditBundle: {
        payload: Prisma.$AuditBundlePayload<ExtArgs>
        fields: Prisma.AuditBundleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuditBundleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuditBundleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload>
          }
          findFirst: {
            args: Prisma.AuditBundleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuditBundleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload>
          }
          findMany: {
            args: Prisma.AuditBundleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload>[]
          }
          create: {
            args: Prisma.AuditBundleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload>
          }
          createMany: {
            args: Prisma.AuditBundleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuditBundleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload>[]
          }
          delete: {
            args: Prisma.AuditBundleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload>
          }
          update: {
            args: Prisma.AuditBundleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload>
          }
          deleteMany: {
            args: Prisma.AuditBundleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuditBundleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AuditBundleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload>[]
          }
          upsert: {
            args: Prisma.AuditBundleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditBundlePayload>
          }
          aggregate: {
            args: Prisma.AuditBundleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuditBundle>
          }
          groupBy: {
            args: Prisma.AuditBundleGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuditBundleGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuditBundleCountArgs<ExtArgs>
            result: $Utils.Optional<AuditBundleCountAggregateOutputType> | number
          }
        }
      }
      Connector: {
        payload: Prisma.$ConnectorPayload<ExtArgs>
        fields: Prisma.ConnectorFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConnectorFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConnectorFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          findFirst: {
            args: Prisma.ConnectorFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConnectorFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          findMany: {
            args: Prisma.ConnectorFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>[]
          }
          create: {
            args: Prisma.ConnectorCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          createMany: {
            args: Prisma.ConnectorCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ConnectorCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>[]
          }
          delete: {
            args: Prisma.ConnectorDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          update: {
            args: Prisma.ConnectorUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          deleteMany: {
            args: Prisma.ConnectorDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConnectorUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ConnectorUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>[]
          }
          upsert: {
            args: Prisma.ConnectorUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          aggregate: {
            args: Prisma.ConnectorAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConnector>
          }
          groupBy: {
            args: Prisma.ConnectorGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConnectorGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConnectorCountArgs<ExtArgs>
            result: $Utils.Optional<ConnectorCountAggregateOutputType> | number
          }
        }
      }
      ConsentRecord: {
        payload: Prisma.$ConsentRecordPayload<ExtArgs>
        fields: Prisma.ConsentRecordFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConsentRecordFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConsentRecordFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload>
          }
          findFirst: {
            args: Prisma.ConsentRecordFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConsentRecordFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload>
          }
          findMany: {
            args: Prisma.ConsentRecordFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload>[]
          }
          create: {
            args: Prisma.ConsentRecordCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload>
          }
          createMany: {
            args: Prisma.ConsentRecordCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ConsentRecordCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload>[]
          }
          delete: {
            args: Prisma.ConsentRecordDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload>
          }
          update: {
            args: Prisma.ConsentRecordUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload>
          }
          deleteMany: {
            args: Prisma.ConsentRecordDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConsentRecordUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ConsentRecordUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload>[]
          }
          upsert: {
            args: Prisma.ConsentRecordUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConsentRecordPayload>
          }
          aggregate: {
            args: Prisma.ConsentRecordAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConsentRecord>
          }
          groupBy: {
            args: Prisma.ConsentRecordGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConsentRecordGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConsentRecordCountArgs<ExtArgs>
            result: $Utils.Optional<ConsentRecordCountAggregateOutputType> | number
          }
        }
      }
      BrandTwin: {
        payload: Prisma.$BrandTwinPayload<ExtArgs>
        fields: Prisma.BrandTwinFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BrandTwinFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BrandTwinFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload>
          }
          findFirst: {
            args: Prisma.BrandTwinFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BrandTwinFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload>
          }
          findMany: {
            args: Prisma.BrandTwinFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload>[]
          }
          create: {
            args: Prisma.BrandTwinCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload>
          }
          createMany: {
            args: Prisma.BrandTwinCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BrandTwinCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload>[]
          }
          delete: {
            args: Prisma.BrandTwinDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload>
          }
          update: {
            args: Prisma.BrandTwinUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload>
          }
          deleteMany: {
            args: Prisma.BrandTwinDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BrandTwinUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BrandTwinUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload>[]
          }
          upsert: {
            args: Prisma.BrandTwinUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BrandTwinPayload>
          }
          aggregate: {
            args: Prisma.BrandTwinAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBrandTwin>
          }
          groupBy: {
            args: Prisma.BrandTwinGroupByArgs<ExtArgs>
            result: $Utils.Optional<BrandTwinGroupByOutputType>[]
          }
          count: {
            args: Prisma.BrandTwinCountArgs<ExtArgs>
            result: $Utils.Optional<BrandTwinCountAggregateOutputType> | number
          }
        }
      }
      DecisionCard: {
        payload: Prisma.$DecisionCardPayload<ExtArgs>
        fields: Prisma.DecisionCardFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DecisionCardFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DecisionCardFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload>
          }
          findFirst: {
            args: Prisma.DecisionCardFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DecisionCardFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload>
          }
          findMany: {
            args: Prisma.DecisionCardFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload>[]
          }
          create: {
            args: Prisma.DecisionCardCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload>
          }
          createMany: {
            args: Prisma.DecisionCardCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DecisionCardCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload>[]
          }
          delete: {
            args: Prisma.DecisionCardDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload>
          }
          update: {
            args: Prisma.DecisionCardUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload>
          }
          deleteMany: {
            args: Prisma.DecisionCardDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DecisionCardUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DecisionCardUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload>[]
          }
          upsert: {
            args: Prisma.DecisionCardUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionCardPayload>
          }
          aggregate: {
            args: Prisma.DecisionCardAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDecisionCard>
          }
          groupBy: {
            args: Prisma.DecisionCardGroupByArgs<ExtArgs>
            result: $Utils.Optional<DecisionCardGroupByOutputType>[]
          }
          count: {
            args: Prisma.DecisionCardCountArgs<ExtArgs>
            result: $Utils.Optional<DecisionCardCountAggregateOutputType> | number
          }
        }
      }
      SimulationResult: {
        payload: Prisma.$SimulationResultPayload<ExtArgs>
        fields: Prisma.SimulationResultFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SimulationResultFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SimulationResultFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload>
          }
          findFirst: {
            args: Prisma.SimulationResultFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SimulationResultFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload>
          }
          findMany: {
            args: Prisma.SimulationResultFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload>[]
          }
          create: {
            args: Prisma.SimulationResultCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload>
          }
          createMany: {
            args: Prisma.SimulationResultCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SimulationResultCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload>[]
          }
          delete: {
            args: Prisma.SimulationResultDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload>
          }
          update: {
            args: Prisma.SimulationResultUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload>
          }
          deleteMany: {
            args: Prisma.SimulationResultDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SimulationResultUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SimulationResultUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload>[]
          }
          upsert: {
            args: Prisma.SimulationResultUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationResultPayload>
          }
          aggregate: {
            args: Prisma.SimulationResultAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSimulationResult>
          }
          groupBy: {
            args: Prisma.SimulationResultGroupByArgs<ExtArgs>
            result: $Utils.Optional<SimulationResultGroupByOutputType>[]
          }
          count: {
            args: Prisma.SimulationResultCountArgs<ExtArgs>
            result: $Utils.Optional<SimulationResultCountAggregateOutputType> | number
          }
        }
      }
      AssetFingerprint: {
        payload: Prisma.$AssetFingerprintPayload<ExtArgs>
        fields: Prisma.AssetFingerprintFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AssetFingerprintFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AssetFingerprintFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload>
          }
          findFirst: {
            args: Prisma.AssetFingerprintFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AssetFingerprintFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload>
          }
          findMany: {
            args: Prisma.AssetFingerprintFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload>[]
          }
          create: {
            args: Prisma.AssetFingerprintCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload>
          }
          createMany: {
            args: Prisma.AssetFingerprintCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AssetFingerprintCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload>[]
          }
          delete: {
            args: Prisma.AssetFingerprintDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload>
          }
          update: {
            args: Prisma.AssetFingerprintUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload>
          }
          deleteMany: {
            args: Prisma.AssetFingerprintDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AssetFingerprintUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AssetFingerprintUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload>[]
          }
          upsert: {
            args: Prisma.AssetFingerprintUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssetFingerprintPayload>
          }
          aggregate: {
            args: Prisma.AssetFingerprintAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAssetFingerprint>
          }
          groupBy: {
            args: Prisma.AssetFingerprintGroupByArgs<ExtArgs>
            result: $Utils.Optional<AssetFingerprintGroupByOutputType>[]
          }
          count: {
            args: Prisma.AssetFingerprintCountArgs<ExtArgs>
            result: $Utils.Optional<AssetFingerprintCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    workspace?: WorkspaceOmit
    workspaceRun?: WorkspaceRunOmit
    auditBundle?: AuditBundleOmit
    connector?: ConnectorOmit
    consentRecord?: ConsentRecordOmit
    brandTwin?: BrandTwinOmit
    decisionCard?: DecisionCardOmit
    simulationResult?: SimulationResultOmit
    assetFingerprint?: AssetFingerprintOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type WorkspaceCountOutputType
   */

  export type WorkspaceCountOutputType = {
    workspaceRuns: number
    auditBundles: number
    connectors: number
    consentRecords: number
    brandTwins: number
    decisionCards: number
    simulationResults: number
    assetFingerprints: number
  }

  export type WorkspaceCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspaceRuns?: boolean | WorkspaceCountOutputTypeCountWorkspaceRunsArgs
    auditBundles?: boolean | WorkspaceCountOutputTypeCountAuditBundlesArgs
    connectors?: boolean | WorkspaceCountOutputTypeCountConnectorsArgs
    consentRecords?: boolean | WorkspaceCountOutputTypeCountConsentRecordsArgs
    brandTwins?: boolean | WorkspaceCountOutputTypeCountBrandTwinsArgs
    decisionCards?: boolean | WorkspaceCountOutputTypeCountDecisionCardsArgs
    simulationResults?: boolean | WorkspaceCountOutputTypeCountSimulationResultsArgs
    assetFingerprints?: boolean | WorkspaceCountOutputTypeCountAssetFingerprintsArgs
  }

  // Custom InputTypes
  /**
   * WorkspaceCountOutputType without action
   */
  export type WorkspaceCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceCountOutputType
     */
    select?: WorkspaceCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * WorkspaceCountOutputType without action
   */
  export type WorkspaceCountOutputTypeCountWorkspaceRunsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WorkspaceRunWhereInput
  }

  /**
   * WorkspaceCountOutputType without action
   */
  export type WorkspaceCountOutputTypeCountAuditBundlesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditBundleWhereInput
  }

  /**
   * WorkspaceCountOutputType without action
   */
  export type WorkspaceCountOutputTypeCountConnectorsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectorWhereInput
  }

  /**
   * WorkspaceCountOutputType without action
   */
  export type WorkspaceCountOutputTypeCountConsentRecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConsentRecordWhereInput
  }

  /**
   * WorkspaceCountOutputType without action
   */
  export type WorkspaceCountOutputTypeCountBrandTwinsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BrandTwinWhereInput
  }

  /**
   * WorkspaceCountOutputType without action
   */
  export type WorkspaceCountOutputTypeCountDecisionCardsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DecisionCardWhereInput
  }

  /**
   * WorkspaceCountOutputType without action
   */
  export type WorkspaceCountOutputTypeCountSimulationResultsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SimulationResultWhereInput
  }

  /**
   * WorkspaceCountOutputType without action
   */
  export type WorkspaceCountOutputTypeCountAssetFingerprintsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AssetFingerprintWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Workspace
   */

  export type AggregateWorkspace = {
    _count: WorkspaceCountAggregateOutputType | null
    _avg: WorkspaceAvgAggregateOutputType | null
    _sum: WorkspaceSumAggregateOutputType | null
    _min: WorkspaceMinAggregateOutputType | null
    _max: WorkspaceMaxAggregateOutputType | null
  }

  export type WorkspaceAvgAggregateOutputType = {
    ttlHours: number | null
  }

  export type WorkspaceSumAggregateOutputType = {
    ttlHours: number | null
  }

  export type WorkspaceMinAggregateOutputType = {
    workspaceId: string | null
    tenantId: string | null
    createdBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
    lifecycle: string | null
    contractVersion: string | null
    riskProfile: string | null
    ttlHours: number | null
    policyBundleRef: string | null
    policyBundleChecksum: string | null
  }

  export type WorkspaceMaxAggregateOutputType = {
    workspaceId: string | null
    tenantId: string | null
    createdBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
    lifecycle: string | null
    contractVersion: string | null
    riskProfile: string | null
    ttlHours: number | null
    policyBundleRef: string | null
    policyBundleChecksum: string | null
  }

  export type WorkspaceCountAggregateOutputType = {
    workspaceId: number
    tenantId: number
    createdBy: number
    createdAt: number
    updatedAt: number
    lifecycle: number
    contractVersion: number
    goals: number
    primaryChannels: number
    budget: number
    approvalPolicy: number
    riskProfile: number
    dataRetention: number
    ttlHours: number
    policyBundleRef: number
    policyBundleChecksum: number
    contractData: number
    _all: number
  }


  export type WorkspaceAvgAggregateInputType = {
    ttlHours?: true
  }

  export type WorkspaceSumAggregateInputType = {
    ttlHours?: true
  }

  export type WorkspaceMinAggregateInputType = {
    workspaceId?: true
    tenantId?: true
    createdBy?: true
    createdAt?: true
    updatedAt?: true
    lifecycle?: true
    contractVersion?: true
    riskProfile?: true
    ttlHours?: true
    policyBundleRef?: true
    policyBundleChecksum?: true
  }

  export type WorkspaceMaxAggregateInputType = {
    workspaceId?: true
    tenantId?: true
    createdBy?: true
    createdAt?: true
    updatedAt?: true
    lifecycle?: true
    contractVersion?: true
    riskProfile?: true
    ttlHours?: true
    policyBundleRef?: true
    policyBundleChecksum?: true
  }

  export type WorkspaceCountAggregateInputType = {
    workspaceId?: true
    tenantId?: true
    createdBy?: true
    createdAt?: true
    updatedAt?: true
    lifecycle?: true
    contractVersion?: true
    goals?: true
    primaryChannels?: true
    budget?: true
    approvalPolicy?: true
    riskProfile?: true
    dataRetention?: true
    ttlHours?: true
    policyBundleRef?: true
    policyBundleChecksum?: true
    contractData?: true
    _all?: true
  }

  export type WorkspaceAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Workspace to aggregate.
     */
    where?: WorkspaceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workspaces to fetch.
     */
    orderBy?: WorkspaceOrderByWithRelationInput | WorkspaceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WorkspaceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workspaces from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workspaces.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Workspaces
    **/
    _count?: true | WorkspaceCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WorkspaceAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WorkspaceSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WorkspaceMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WorkspaceMaxAggregateInputType
  }

  export type GetWorkspaceAggregateType<T extends WorkspaceAggregateArgs> = {
        [P in keyof T & keyof AggregateWorkspace]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWorkspace[P]>
      : GetScalarType<T[P], AggregateWorkspace[P]>
  }




  export type WorkspaceGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WorkspaceWhereInput
    orderBy?: WorkspaceOrderByWithAggregationInput | WorkspaceOrderByWithAggregationInput[]
    by: WorkspaceScalarFieldEnum[] | WorkspaceScalarFieldEnum
    having?: WorkspaceScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WorkspaceCountAggregateInputType | true
    _avg?: WorkspaceAvgAggregateInputType
    _sum?: WorkspaceSumAggregateInputType
    _min?: WorkspaceMinAggregateInputType
    _max?: WorkspaceMaxAggregateInputType
  }

  export type WorkspaceGroupByOutputType = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt: Date
    updatedAt: Date
    lifecycle: string
    contractVersion: string
    goals: JsonValue
    primaryChannels: JsonValue
    budget: JsonValue
    approvalPolicy: JsonValue
    riskProfile: string
    dataRetention: JsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonValue
    _count: WorkspaceCountAggregateOutputType | null
    _avg: WorkspaceAvgAggregateOutputType | null
    _sum: WorkspaceSumAggregateOutputType | null
    _min: WorkspaceMinAggregateOutputType | null
    _max: WorkspaceMaxAggregateOutputType | null
  }

  type GetWorkspaceGroupByPayload<T extends WorkspaceGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WorkspaceGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WorkspaceGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WorkspaceGroupByOutputType[P]>
            : GetScalarType<T[P], WorkspaceGroupByOutputType[P]>
        }
      >
    >


  export type WorkspaceSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    workspaceId?: boolean
    tenantId?: boolean
    createdBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lifecycle?: boolean
    contractVersion?: boolean
    goals?: boolean
    primaryChannels?: boolean
    budget?: boolean
    approvalPolicy?: boolean
    riskProfile?: boolean
    dataRetention?: boolean
    ttlHours?: boolean
    policyBundleRef?: boolean
    policyBundleChecksum?: boolean
    contractData?: boolean
    workspaceRuns?: boolean | Workspace$workspaceRunsArgs<ExtArgs>
    auditBundles?: boolean | Workspace$auditBundlesArgs<ExtArgs>
    connectors?: boolean | Workspace$connectorsArgs<ExtArgs>
    consentRecords?: boolean | Workspace$consentRecordsArgs<ExtArgs>
    brandTwins?: boolean | Workspace$brandTwinsArgs<ExtArgs>
    decisionCards?: boolean | Workspace$decisionCardsArgs<ExtArgs>
    simulationResults?: boolean | Workspace$simulationResultsArgs<ExtArgs>
    assetFingerprints?: boolean | Workspace$assetFingerprintsArgs<ExtArgs>
    _count?: boolean | WorkspaceCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["workspace"]>

  export type WorkspaceSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    workspaceId?: boolean
    tenantId?: boolean
    createdBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lifecycle?: boolean
    contractVersion?: boolean
    goals?: boolean
    primaryChannels?: boolean
    budget?: boolean
    approvalPolicy?: boolean
    riskProfile?: boolean
    dataRetention?: boolean
    ttlHours?: boolean
    policyBundleRef?: boolean
    policyBundleChecksum?: boolean
    contractData?: boolean
  }, ExtArgs["result"]["workspace"]>

  export type WorkspaceSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    workspaceId?: boolean
    tenantId?: boolean
    createdBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lifecycle?: boolean
    contractVersion?: boolean
    goals?: boolean
    primaryChannels?: boolean
    budget?: boolean
    approvalPolicy?: boolean
    riskProfile?: boolean
    dataRetention?: boolean
    ttlHours?: boolean
    policyBundleRef?: boolean
    policyBundleChecksum?: boolean
    contractData?: boolean
  }, ExtArgs["result"]["workspace"]>

  export type WorkspaceSelectScalar = {
    workspaceId?: boolean
    tenantId?: boolean
    createdBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lifecycle?: boolean
    contractVersion?: boolean
    goals?: boolean
    primaryChannels?: boolean
    budget?: boolean
    approvalPolicy?: boolean
    riskProfile?: boolean
    dataRetention?: boolean
    ttlHours?: boolean
    policyBundleRef?: boolean
    policyBundleChecksum?: boolean
    contractData?: boolean
  }

  export type WorkspaceOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"workspaceId" | "tenantId" | "createdBy" | "createdAt" | "updatedAt" | "lifecycle" | "contractVersion" | "goals" | "primaryChannels" | "budget" | "approvalPolicy" | "riskProfile" | "dataRetention" | "ttlHours" | "policyBundleRef" | "policyBundleChecksum" | "contractData", ExtArgs["result"]["workspace"]>
  export type WorkspaceInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspaceRuns?: boolean | Workspace$workspaceRunsArgs<ExtArgs>
    auditBundles?: boolean | Workspace$auditBundlesArgs<ExtArgs>
    connectors?: boolean | Workspace$connectorsArgs<ExtArgs>
    consentRecords?: boolean | Workspace$consentRecordsArgs<ExtArgs>
    brandTwins?: boolean | Workspace$brandTwinsArgs<ExtArgs>
    decisionCards?: boolean | Workspace$decisionCardsArgs<ExtArgs>
    simulationResults?: boolean | Workspace$simulationResultsArgs<ExtArgs>
    assetFingerprints?: boolean | Workspace$assetFingerprintsArgs<ExtArgs>
    _count?: boolean | WorkspaceCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type WorkspaceIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type WorkspaceIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $WorkspacePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Workspace"
    objects: {
      workspaceRuns: Prisma.$WorkspaceRunPayload<ExtArgs>[]
      auditBundles: Prisma.$AuditBundlePayload<ExtArgs>[]
      connectors: Prisma.$ConnectorPayload<ExtArgs>[]
      consentRecords: Prisma.$ConsentRecordPayload<ExtArgs>[]
      brandTwins: Prisma.$BrandTwinPayload<ExtArgs>[]
      decisionCards: Prisma.$DecisionCardPayload<ExtArgs>[]
      simulationResults: Prisma.$SimulationResultPayload<ExtArgs>[]
      assetFingerprints: Prisma.$AssetFingerprintPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      workspaceId: string
      tenantId: string
      createdBy: string
      createdAt: Date
      updatedAt: Date
      lifecycle: string
      contractVersion: string
      goals: Prisma.JsonValue
      primaryChannels: Prisma.JsonValue
      budget: Prisma.JsonValue
      approvalPolicy: Prisma.JsonValue
      riskProfile: string
      dataRetention: Prisma.JsonValue
      ttlHours: number
      policyBundleRef: string
      policyBundleChecksum: string
      contractData: Prisma.JsonValue
    }, ExtArgs["result"]["workspace"]>
    composites: {}
  }

  type WorkspaceGetPayload<S extends boolean | null | undefined | WorkspaceDefaultArgs> = $Result.GetResult<Prisma.$WorkspacePayload, S>

  type WorkspaceCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<WorkspaceFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: WorkspaceCountAggregateInputType | true
    }

  export interface WorkspaceDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Workspace'], meta: { name: 'Workspace' } }
    /**
     * Find zero or one Workspace that matches the filter.
     * @param {WorkspaceFindUniqueArgs} args - Arguments to find a Workspace
     * @example
     * // Get one Workspace
     * const workspace = await prisma.workspace.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WorkspaceFindUniqueArgs>(args: SelectSubset<T, WorkspaceFindUniqueArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Workspace that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WorkspaceFindUniqueOrThrowArgs} args - Arguments to find a Workspace
     * @example
     * // Get one Workspace
     * const workspace = await prisma.workspace.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WorkspaceFindUniqueOrThrowArgs>(args: SelectSubset<T, WorkspaceFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Workspace that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceFindFirstArgs} args - Arguments to find a Workspace
     * @example
     * // Get one Workspace
     * const workspace = await prisma.workspace.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WorkspaceFindFirstArgs>(args?: SelectSubset<T, WorkspaceFindFirstArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Workspace that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceFindFirstOrThrowArgs} args - Arguments to find a Workspace
     * @example
     * // Get one Workspace
     * const workspace = await prisma.workspace.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WorkspaceFindFirstOrThrowArgs>(args?: SelectSubset<T, WorkspaceFindFirstOrThrowArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Workspaces that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Workspaces
     * const workspaces = await prisma.workspace.findMany()
     * 
     * // Get first 10 Workspaces
     * const workspaces = await prisma.workspace.findMany({ take: 10 })
     * 
     * // Only select the `workspaceId`
     * const workspaceWithWorkspaceIdOnly = await prisma.workspace.findMany({ select: { workspaceId: true } })
     * 
     */
    findMany<T extends WorkspaceFindManyArgs>(args?: SelectSubset<T, WorkspaceFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Workspace.
     * @param {WorkspaceCreateArgs} args - Arguments to create a Workspace.
     * @example
     * // Create one Workspace
     * const Workspace = await prisma.workspace.create({
     *   data: {
     *     // ... data to create a Workspace
     *   }
     * })
     * 
     */
    create<T extends WorkspaceCreateArgs>(args: SelectSubset<T, WorkspaceCreateArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Workspaces.
     * @param {WorkspaceCreateManyArgs} args - Arguments to create many Workspaces.
     * @example
     * // Create many Workspaces
     * const workspace = await prisma.workspace.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WorkspaceCreateManyArgs>(args?: SelectSubset<T, WorkspaceCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Workspaces and returns the data saved in the database.
     * @param {WorkspaceCreateManyAndReturnArgs} args - Arguments to create many Workspaces.
     * @example
     * // Create many Workspaces
     * const workspace = await prisma.workspace.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Workspaces and only return the `workspaceId`
     * const workspaceWithWorkspaceIdOnly = await prisma.workspace.createManyAndReturn({
     *   select: { workspaceId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WorkspaceCreateManyAndReturnArgs>(args?: SelectSubset<T, WorkspaceCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Workspace.
     * @param {WorkspaceDeleteArgs} args - Arguments to delete one Workspace.
     * @example
     * // Delete one Workspace
     * const Workspace = await prisma.workspace.delete({
     *   where: {
     *     // ... filter to delete one Workspace
     *   }
     * })
     * 
     */
    delete<T extends WorkspaceDeleteArgs>(args: SelectSubset<T, WorkspaceDeleteArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Workspace.
     * @param {WorkspaceUpdateArgs} args - Arguments to update one Workspace.
     * @example
     * // Update one Workspace
     * const workspace = await prisma.workspace.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WorkspaceUpdateArgs>(args: SelectSubset<T, WorkspaceUpdateArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Workspaces.
     * @param {WorkspaceDeleteManyArgs} args - Arguments to filter Workspaces to delete.
     * @example
     * // Delete a few Workspaces
     * const { count } = await prisma.workspace.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WorkspaceDeleteManyArgs>(args?: SelectSubset<T, WorkspaceDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Workspaces.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Workspaces
     * const workspace = await prisma.workspace.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WorkspaceUpdateManyArgs>(args: SelectSubset<T, WorkspaceUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Workspaces and returns the data updated in the database.
     * @param {WorkspaceUpdateManyAndReturnArgs} args - Arguments to update many Workspaces.
     * @example
     * // Update many Workspaces
     * const workspace = await prisma.workspace.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Workspaces and only return the `workspaceId`
     * const workspaceWithWorkspaceIdOnly = await prisma.workspace.updateManyAndReturn({
     *   select: { workspaceId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends WorkspaceUpdateManyAndReturnArgs>(args: SelectSubset<T, WorkspaceUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Workspace.
     * @param {WorkspaceUpsertArgs} args - Arguments to update or create a Workspace.
     * @example
     * // Update or create a Workspace
     * const workspace = await prisma.workspace.upsert({
     *   create: {
     *     // ... data to create a Workspace
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Workspace we want to update
     *   }
     * })
     */
    upsert<T extends WorkspaceUpsertArgs>(args: SelectSubset<T, WorkspaceUpsertArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Workspaces.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceCountArgs} args - Arguments to filter Workspaces to count.
     * @example
     * // Count the number of Workspaces
     * const count = await prisma.workspace.count({
     *   where: {
     *     // ... the filter for the Workspaces we want to count
     *   }
     * })
    **/
    count<T extends WorkspaceCountArgs>(
      args?: Subset<T, WorkspaceCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WorkspaceCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Workspace.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WorkspaceAggregateArgs>(args: Subset<T, WorkspaceAggregateArgs>): Prisma.PrismaPromise<GetWorkspaceAggregateType<T>>

    /**
     * Group by Workspace.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WorkspaceGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WorkspaceGroupByArgs['orderBy'] }
        : { orderBy?: WorkspaceGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WorkspaceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWorkspaceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Workspace model
   */
  readonly fields: WorkspaceFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Workspace.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WorkspaceClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    workspaceRuns<T extends Workspace$workspaceRunsArgs<ExtArgs> = {}>(args?: Subset<T, Workspace$workspaceRunsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    auditBundles<T extends Workspace$auditBundlesArgs<ExtArgs> = {}>(args?: Subset<T, Workspace$auditBundlesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    connectors<T extends Workspace$connectorsArgs<ExtArgs> = {}>(args?: Subset<T, Workspace$connectorsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    consentRecords<T extends Workspace$consentRecordsArgs<ExtArgs> = {}>(args?: Subset<T, Workspace$consentRecordsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    brandTwins<T extends Workspace$brandTwinsArgs<ExtArgs> = {}>(args?: Subset<T, Workspace$brandTwinsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    decisionCards<T extends Workspace$decisionCardsArgs<ExtArgs> = {}>(args?: Subset<T, Workspace$decisionCardsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    simulationResults<T extends Workspace$simulationResultsArgs<ExtArgs> = {}>(args?: Subset<T, Workspace$simulationResultsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    assetFingerprints<T extends Workspace$assetFingerprintsArgs<ExtArgs> = {}>(args?: Subset<T, Workspace$assetFingerprintsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Workspace model
   */
  interface WorkspaceFieldRefs {
    readonly workspaceId: FieldRef<"Workspace", 'String'>
    readonly tenantId: FieldRef<"Workspace", 'String'>
    readonly createdBy: FieldRef<"Workspace", 'String'>
    readonly createdAt: FieldRef<"Workspace", 'DateTime'>
    readonly updatedAt: FieldRef<"Workspace", 'DateTime'>
    readonly lifecycle: FieldRef<"Workspace", 'String'>
    readonly contractVersion: FieldRef<"Workspace", 'String'>
    readonly goals: FieldRef<"Workspace", 'Json'>
    readonly primaryChannels: FieldRef<"Workspace", 'Json'>
    readonly budget: FieldRef<"Workspace", 'Json'>
    readonly approvalPolicy: FieldRef<"Workspace", 'Json'>
    readonly riskProfile: FieldRef<"Workspace", 'String'>
    readonly dataRetention: FieldRef<"Workspace", 'Json'>
    readonly ttlHours: FieldRef<"Workspace", 'Int'>
    readonly policyBundleRef: FieldRef<"Workspace", 'String'>
    readonly policyBundleChecksum: FieldRef<"Workspace", 'String'>
    readonly contractData: FieldRef<"Workspace", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * Workspace findUnique
   */
  export type WorkspaceFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceInclude<ExtArgs> | null
    /**
     * Filter, which Workspace to fetch.
     */
    where: WorkspaceWhereUniqueInput
  }

  /**
   * Workspace findUniqueOrThrow
   */
  export type WorkspaceFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceInclude<ExtArgs> | null
    /**
     * Filter, which Workspace to fetch.
     */
    where: WorkspaceWhereUniqueInput
  }

  /**
   * Workspace findFirst
   */
  export type WorkspaceFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceInclude<ExtArgs> | null
    /**
     * Filter, which Workspace to fetch.
     */
    where?: WorkspaceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workspaces to fetch.
     */
    orderBy?: WorkspaceOrderByWithRelationInput | WorkspaceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Workspaces.
     */
    cursor?: WorkspaceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workspaces from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workspaces.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Workspaces.
     */
    distinct?: WorkspaceScalarFieldEnum | WorkspaceScalarFieldEnum[]
  }

  /**
   * Workspace findFirstOrThrow
   */
  export type WorkspaceFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceInclude<ExtArgs> | null
    /**
     * Filter, which Workspace to fetch.
     */
    where?: WorkspaceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workspaces to fetch.
     */
    orderBy?: WorkspaceOrderByWithRelationInput | WorkspaceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Workspaces.
     */
    cursor?: WorkspaceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workspaces from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workspaces.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Workspaces.
     */
    distinct?: WorkspaceScalarFieldEnum | WorkspaceScalarFieldEnum[]
  }

  /**
   * Workspace findMany
   */
  export type WorkspaceFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceInclude<ExtArgs> | null
    /**
     * Filter, which Workspaces to fetch.
     */
    where?: WorkspaceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Workspaces to fetch.
     */
    orderBy?: WorkspaceOrderByWithRelationInput | WorkspaceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Workspaces.
     */
    cursor?: WorkspaceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Workspaces from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Workspaces.
     */
    skip?: number
    distinct?: WorkspaceScalarFieldEnum | WorkspaceScalarFieldEnum[]
  }

  /**
   * Workspace create
   */
  export type WorkspaceCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceInclude<ExtArgs> | null
    /**
     * The data needed to create a Workspace.
     */
    data: XOR<WorkspaceCreateInput, WorkspaceUncheckedCreateInput>
  }

  /**
   * Workspace createMany
   */
  export type WorkspaceCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Workspaces.
     */
    data: WorkspaceCreateManyInput | WorkspaceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Workspace createManyAndReturn
   */
  export type WorkspaceCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * The data used to create many Workspaces.
     */
    data: WorkspaceCreateManyInput | WorkspaceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Workspace update
   */
  export type WorkspaceUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceInclude<ExtArgs> | null
    /**
     * The data needed to update a Workspace.
     */
    data: XOR<WorkspaceUpdateInput, WorkspaceUncheckedUpdateInput>
    /**
     * Choose, which Workspace to update.
     */
    where: WorkspaceWhereUniqueInput
  }

  /**
   * Workspace updateMany
   */
  export type WorkspaceUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Workspaces.
     */
    data: XOR<WorkspaceUpdateManyMutationInput, WorkspaceUncheckedUpdateManyInput>
    /**
     * Filter which Workspaces to update
     */
    where?: WorkspaceWhereInput
    /**
     * Limit how many Workspaces to update.
     */
    limit?: number
  }

  /**
   * Workspace updateManyAndReturn
   */
  export type WorkspaceUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * The data used to update Workspaces.
     */
    data: XOR<WorkspaceUpdateManyMutationInput, WorkspaceUncheckedUpdateManyInput>
    /**
     * Filter which Workspaces to update
     */
    where?: WorkspaceWhereInput
    /**
     * Limit how many Workspaces to update.
     */
    limit?: number
  }

  /**
   * Workspace upsert
   */
  export type WorkspaceUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceInclude<ExtArgs> | null
    /**
     * The filter to search for the Workspace to update in case it exists.
     */
    where: WorkspaceWhereUniqueInput
    /**
     * In case the Workspace found by the `where` argument doesn't exist, create a new Workspace with this data.
     */
    create: XOR<WorkspaceCreateInput, WorkspaceUncheckedCreateInput>
    /**
     * In case the Workspace was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WorkspaceUpdateInput, WorkspaceUncheckedUpdateInput>
  }

  /**
   * Workspace delete
   */
  export type WorkspaceDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceInclude<ExtArgs> | null
    /**
     * Filter which Workspace to delete.
     */
    where: WorkspaceWhereUniqueInput
  }

  /**
   * Workspace deleteMany
   */
  export type WorkspaceDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Workspaces to delete
     */
    where?: WorkspaceWhereInput
    /**
     * Limit how many Workspaces to delete.
     */
    limit?: number
  }

  /**
   * Workspace.workspaceRuns
   */
  export type Workspace$workspaceRunsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
    where?: WorkspaceRunWhereInput
    orderBy?: WorkspaceRunOrderByWithRelationInput | WorkspaceRunOrderByWithRelationInput[]
    cursor?: WorkspaceRunWhereUniqueInput
    take?: number
    skip?: number
    distinct?: WorkspaceRunScalarFieldEnum | WorkspaceRunScalarFieldEnum[]
  }

  /**
   * Workspace.auditBundles
   */
  export type Workspace$auditBundlesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
    where?: AuditBundleWhereInput
    orderBy?: AuditBundleOrderByWithRelationInput | AuditBundleOrderByWithRelationInput[]
    cursor?: AuditBundleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuditBundleScalarFieldEnum | AuditBundleScalarFieldEnum[]
  }

  /**
   * Workspace.connectors
   */
  export type Workspace$connectorsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    where?: ConnectorWhereInput
    orderBy?: ConnectorOrderByWithRelationInput | ConnectorOrderByWithRelationInput[]
    cursor?: ConnectorWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ConnectorScalarFieldEnum | ConnectorScalarFieldEnum[]
  }

  /**
   * Workspace.consentRecords
   */
  export type Workspace$consentRecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
    where?: ConsentRecordWhereInput
    orderBy?: ConsentRecordOrderByWithRelationInput | ConsentRecordOrderByWithRelationInput[]
    cursor?: ConsentRecordWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ConsentRecordScalarFieldEnum | ConsentRecordScalarFieldEnum[]
  }

  /**
   * Workspace.brandTwins
   */
  export type Workspace$brandTwinsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
    where?: BrandTwinWhereInput
    orderBy?: BrandTwinOrderByWithRelationInput | BrandTwinOrderByWithRelationInput[]
    cursor?: BrandTwinWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BrandTwinScalarFieldEnum | BrandTwinScalarFieldEnum[]
  }

  /**
   * Workspace.decisionCards
   */
  export type Workspace$decisionCardsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
    where?: DecisionCardWhereInput
    orderBy?: DecisionCardOrderByWithRelationInput | DecisionCardOrderByWithRelationInput[]
    cursor?: DecisionCardWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DecisionCardScalarFieldEnum | DecisionCardScalarFieldEnum[]
  }

  /**
   * Workspace.simulationResults
   */
  export type Workspace$simulationResultsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
    where?: SimulationResultWhereInput
    orderBy?: SimulationResultOrderByWithRelationInput | SimulationResultOrderByWithRelationInput[]
    cursor?: SimulationResultWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SimulationResultScalarFieldEnum | SimulationResultScalarFieldEnum[]
  }

  /**
   * Workspace.assetFingerprints
   */
  export type Workspace$assetFingerprintsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
    where?: AssetFingerprintWhereInput
    orderBy?: AssetFingerprintOrderByWithRelationInput | AssetFingerprintOrderByWithRelationInput[]
    cursor?: AssetFingerprintWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AssetFingerprintScalarFieldEnum | AssetFingerprintScalarFieldEnum[]
  }

  /**
   * Workspace without action
   */
  export type WorkspaceDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Workspace
     */
    select?: WorkspaceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Workspace
     */
    omit?: WorkspaceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceInclude<ExtArgs> | null
  }


  /**
   * Model WorkspaceRun
   */

  export type AggregateWorkspaceRun = {
    _count: WorkspaceRunCountAggregateOutputType | null
    _avg: WorkspaceRunAvgAggregateOutputType | null
    _sum: WorkspaceRunSumAggregateOutputType | null
    _min: WorkspaceRunMinAggregateOutputType | null
    _max: WorkspaceRunMaxAggregateOutputType | null
  }

  export type WorkspaceRunAvgAggregateOutputType = {
    costUsd: Decimal | null
    readinessScore: Decimal | null
  }

  export type WorkspaceRunSumAggregateOutputType = {
    costUsd: Decimal | null
    readinessScore: Decimal | null
  }

  export type WorkspaceRunMinAggregateOutputType = {
    runId: string | null
    workspaceId: string | null
    status: string | null
    startedAt: Date | null
    finishedAt: Date | null
    costUsd: Decimal | null
    readinessScore: Decimal | null
    createdAt: Date | null
  }

  export type WorkspaceRunMaxAggregateOutputType = {
    runId: string | null
    workspaceId: string | null
    status: string | null
    startedAt: Date | null
    finishedAt: Date | null
    costUsd: Decimal | null
    readinessScore: Decimal | null
    createdAt: Date | null
  }

  export type WorkspaceRunCountAggregateOutputType = {
    runId: number
    workspaceId: number
    status: number
    startedAt: number
    finishedAt: number
    costUsd: number
    readinessScore: number
    results: number
    createdAt: number
    _all: number
  }


  export type WorkspaceRunAvgAggregateInputType = {
    costUsd?: true
    readinessScore?: true
  }

  export type WorkspaceRunSumAggregateInputType = {
    costUsd?: true
    readinessScore?: true
  }

  export type WorkspaceRunMinAggregateInputType = {
    runId?: true
    workspaceId?: true
    status?: true
    startedAt?: true
    finishedAt?: true
    costUsd?: true
    readinessScore?: true
    createdAt?: true
  }

  export type WorkspaceRunMaxAggregateInputType = {
    runId?: true
    workspaceId?: true
    status?: true
    startedAt?: true
    finishedAt?: true
    costUsd?: true
    readinessScore?: true
    createdAt?: true
  }

  export type WorkspaceRunCountAggregateInputType = {
    runId?: true
    workspaceId?: true
    status?: true
    startedAt?: true
    finishedAt?: true
    costUsd?: true
    readinessScore?: true
    results?: true
    createdAt?: true
    _all?: true
  }

  export type WorkspaceRunAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WorkspaceRun to aggregate.
     */
    where?: WorkspaceRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WorkspaceRuns to fetch.
     */
    orderBy?: WorkspaceRunOrderByWithRelationInput | WorkspaceRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WorkspaceRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WorkspaceRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WorkspaceRuns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned WorkspaceRuns
    **/
    _count?: true | WorkspaceRunCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WorkspaceRunAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WorkspaceRunSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WorkspaceRunMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WorkspaceRunMaxAggregateInputType
  }

  export type GetWorkspaceRunAggregateType<T extends WorkspaceRunAggregateArgs> = {
        [P in keyof T & keyof AggregateWorkspaceRun]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWorkspaceRun[P]>
      : GetScalarType<T[P], AggregateWorkspaceRun[P]>
  }




  export type WorkspaceRunGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WorkspaceRunWhereInput
    orderBy?: WorkspaceRunOrderByWithAggregationInput | WorkspaceRunOrderByWithAggregationInput[]
    by: WorkspaceRunScalarFieldEnum[] | WorkspaceRunScalarFieldEnum
    having?: WorkspaceRunScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WorkspaceRunCountAggregateInputType | true
    _avg?: WorkspaceRunAvgAggregateInputType
    _sum?: WorkspaceRunSumAggregateInputType
    _min?: WorkspaceRunMinAggregateInputType
    _max?: WorkspaceRunMaxAggregateInputType
  }

  export type WorkspaceRunGroupByOutputType = {
    runId: string
    workspaceId: string
    status: string
    startedAt: Date
    finishedAt: Date | null
    costUsd: Decimal | null
    readinessScore: Decimal | null
    results: JsonValue | null
    createdAt: Date
    _count: WorkspaceRunCountAggregateOutputType | null
    _avg: WorkspaceRunAvgAggregateOutputType | null
    _sum: WorkspaceRunSumAggregateOutputType | null
    _min: WorkspaceRunMinAggregateOutputType | null
    _max: WorkspaceRunMaxAggregateOutputType | null
  }

  type GetWorkspaceRunGroupByPayload<T extends WorkspaceRunGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WorkspaceRunGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WorkspaceRunGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WorkspaceRunGroupByOutputType[P]>
            : GetScalarType<T[P], WorkspaceRunGroupByOutputType[P]>
        }
      >
    >


  export type WorkspaceRunSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    runId?: boolean
    workspaceId?: boolean
    status?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    costUsd?: boolean
    readinessScore?: boolean
    results?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["workspaceRun"]>

  export type WorkspaceRunSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    runId?: boolean
    workspaceId?: boolean
    status?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    costUsd?: boolean
    readinessScore?: boolean
    results?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["workspaceRun"]>

  export type WorkspaceRunSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    runId?: boolean
    workspaceId?: boolean
    status?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    costUsd?: boolean
    readinessScore?: boolean
    results?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["workspaceRun"]>

  export type WorkspaceRunSelectScalar = {
    runId?: boolean
    workspaceId?: boolean
    status?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    costUsd?: boolean
    readinessScore?: boolean
    results?: boolean
    createdAt?: boolean
  }

  export type WorkspaceRunOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"runId" | "workspaceId" | "status" | "startedAt" | "finishedAt" | "costUsd" | "readinessScore" | "results" | "createdAt", ExtArgs["result"]["workspaceRun"]>
  export type WorkspaceRunInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type WorkspaceRunIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type WorkspaceRunIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }

  export type $WorkspaceRunPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "WorkspaceRun"
    objects: {
      workspace: Prisma.$WorkspacePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      runId: string
      workspaceId: string
      status: string
      startedAt: Date
      finishedAt: Date | null
      costUsd: Prisma.Decimal | null
      readinessScore: Prisma.Decimal | null
      results: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["workspaceRun"]>
    composites: {}
  }

  type WorkspaceRunGetPayload<S extends boolean | null | undefined | WorkspaceRunDefaultArgs> = $Result.GetResult<Prisma.$WorkspaceRunPayload, S>

  type WorkspaceRunCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<WorkspaceRunFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: WorkspaceRunCountAggregateInputType | true
    }

  export interface WorkspaceRunDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['WorkspaceRun'], meta: { name: 'WorkspaceRun' } }
    /**
     * Find zero or one WorkspaceRun that matches the filter.
     * @param {WorkspaceRunFindUniqueArgs} args - Arguments to find a WorkspaceRun
     * @example
     * // Get one WorkspaceRun
     * const workspaceRun = await prisma.workspaceRun.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WorkspaceRunFindUniqueArgs>(args: SelectSubset<T, WorkspaceRunFindUniqueArgs<ExtArgs>>): Prisma__WorkspaceRunClient<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one WorkspaceRun that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WorkspaceRunFindUniqueOrThrowArgs} args - Arguments to find a WorkspaceRun
     * @example
     * // Get one WorkspaceRun
     * const workspaceRun = await prisma.workspaceRun.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WorkspaceRunFindUniqueOrThrowArgs>(args: SelectSubset<T, WorkspaceRunFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WorkspaceRunClient<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first WorkspaceRun that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceRunFindFirstArgs} args - Arguments to find a WorkspaceRun
     * @example
     * // Get one WorkspaceRun
     * const workspaceRun = await prisma.workspaceRun.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WorkspaceRunFindFirstArgs>(args?: SelectSubset<T, WorkspaceRunFindFirstArgs<ExtArgs>>): Prisma__WorkspaceRunClient<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first WorkspaceRun that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceRunFindFirstOrThrowArgs} args - Arguments to find a WorkspaceRun
     * @example
     * // Get one WorkspaceRun
     * const workspaceRun = await prisma.workspaceRun.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WorkspaceRunFindFirstOrThrowArgs>(args?: SelectSubset<T, WorkspaceRunFindFirstOrThrowArgs<ExtArgs>>): Prisma__WorkspaceRunClient<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more WorkspaceRuns that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceRunFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all WorkspaceRuns
     * const workspaceRuns = await prisma.workspaceRun.findMany()
     * 
     * // Get first 10 WorkspaceRuns
     * const workspaceRuns = await prisma.workspaceRun.findMany({ take: 10 })
     * 
     * // Only select the `runId`
     * const workspaceRunWithRunIdOnly = await prisma.workspaceRun.findMany({ select: { runId: true } })
     * 
     */
    findMany<T extends WorkspaceRunFindManyArgs>(args?: SelectSubset<T, WorkspaceRunFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a WorkspaceRun.
     * @param {WorkspaceRunCreateArgs} args - Arguments to create a WorkspaceRun.
     * @example
     * // Create one WorkspaceRun
     * const WorkspaceRun = await prisma.workspaceRun.create({
     *   data: {
     *     // ... data to create a WorkspaceRun
     *   }
     * })
     * 
     */
    create<T extends WorkspaceRunCreateArgs>(args: SelectSubset<T, WorkspaceRunCreateArgs<ExtArgs>>): Prisma__WorkspaceRunClient<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many WorkspaceRuns.
     * @param {WorkspaceRunCreateManyArgs} args - Arguments to create many WorkspaceRuns.
     * @example
     * // Create many WorkspaceRuns
     * const workspaceRun = await prisma.workspaceRun.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WorkspaceRunCreateManyArgs>(args?: SelectSubset<T, WorkspaceRunCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many WorkspaceRuns and returns the data saved in the database.
     * @param {WorkspaceRunCreateManyAndReturnArgs} args - Arguments to create many WorkspaceRuns.
     * @example
     * // Create many WorkspaceRuns
     * const workspaceRun = await prisma.workspaceRun.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many WorkspaceRuns and only return the `runId`
     * const workspaceRunWithRunIdOnly = await prisma.workspaceRun.createManyAndReturn({
     *   select: { runId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WorkspaceRunCreateManyAndReturnArgs>(args?: SelectSubset<T, WorkspaceRunCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a WorkspaceRun.
     * @param {WorkspaceRunDeleteArgs} args - Arguments to delete one WorkspaceRun.
     * @example
     * // Delete one WorkspaceRun
     * const WorkspaceRun = await prisma.workspaceRun.delete({
     *   where: {
     *     // ... filter to delete one WorkspaceRun
     *   }
     * })
     * 
     */
    delete<T extends WorkspaceRunDeleteArgs>(args: SelectSubset<T, WorkspaceRunDeleteArgs<ExtArgs>>): Prisma__WorkspaceRunClient<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one WorkspaceRun.
     * @param {WorkspaceRunUpdateArgs} args - Arguments to update one WorkspaceRun.
     * @example
     * // Update one WorkspaceRun
     * const workspaceRun = await prisma.workspaceRun.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WorkspaceRunUpdateArgs>(args: SelectSubset<T, WorkspaceRunUpdateArgs<ExtArgs>>): Prisma__WorkspaceRunClient<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more WorkspaceRuns.
     * @param {WorkspaceRunDeleteManyArgs} args - Arguments to filter WorkspaceRuns to delete.
     * @example
     * // Delete a few WorkspaceRuns
     * const { count } = await prisma.workspaceRun.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WorkspaceRunDeleteManyArgs>(args?: SelectSubset<T, WorkspaceRunDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WorkspaceRuns.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceRunUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many WorkspaceRuns
     * const workspaceRun = await prisma.workspaceRun.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WorkspaceRunUpdateManyArgs>(args: SelectSubset<T, WorkspaceRunUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WorkspaceRuns and returns the data updated in the database.
     * @param {WorkspaceRunUpdateManyAndReturnArgs} args - Arguments to update many WorkspaceRuns.
     * @example
     * // Update many WorkspaceRuns
     * const workspaceRun = await prisma.workspaceRun.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more WorkspaceRuns and only return the `runId`
     * const workspaceRunWithRunIdOnly = await prisma.workspaceRun.updateManyAndReturn({
     *   select: { runId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends WorkspaceRunUpdateManyAndReturnArgs>(args: SelectSubset<T, WorkspaceRunUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one WorkspaceRun.
     * @param {WorkspaceRunUpsertArgs} args - Arguments to update or create a WorkspaceRun.
     * @example
     * // Update or create a WorkspaceRun
     * const workspaceRun = await prisma.workspaceRun.upsert({
     *   create: {
     *     // ... data to create a WorkspaceRun
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the WorkspaceRun we want to update
     *   }
     * })
     */
    upsert<T extends WorkspaceRunUpsertArgs>(args: SelectSubset<T, WorkspaceRunUpsertArgs<ExtArgs>>): Prisma__WorkspaceRunClient<$Result.GetResult<Prisma.$WorkspaceRunPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of WorkspaceRuns.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceRunCountArgs} args - Arguments to filter WorkspaceRuns to count.
     * @example
     * // Count the number of WorkspaceRuns
     * const count = await prisma.workspaceRun.count({
     *   where: {
     *     // ... the filter for the WorkspaceRuns we want to count
     *   }
     * })
    **/
    count<T extends WorkspaceRunCountArgs>(
      args?: Subset<T, WorkspaceRunCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WorkspaceRunCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a WorkspaceRun.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceRunAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WorkspaceRunAggregateArgs>(args: Subset<T, WorkspaceRunAggregateArgs>): Prisma.PrismaPromise<GetWorkspaceRunAggregateType<T>>

    /**
     * Group by WorkspaceRun.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorkspaceRunGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WorkspaceRunGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WorkspaceRunGroupByArgs['orderBy'] }
        : { orderBy?: WorkspaceRunGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WorkspaceRunGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWorkspaceRunGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the WorkspaceRun model
   */
  readonly fields: WorkspaceRunFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for WorkspaceRun.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WorkspaceRunClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    workspace<T extends WorkspaceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WorkspaceDefaultArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the WorkspaceRun model
   */
  interface WorkspaceRunFieldRefs {
    readonly runId: FieldRef<"WorkspaceRun", 'String'>
    readonly workspaceId: FieldRef<"WorkspaceRun", 'String'>
    readonly status: FieldRef<"WorkspaceRun", 'String'>
    readonly startedAt: FieldRef<"WorkspaceRun", 'DateTime'>
    readonly finishedAt: FieldRef<"WorkspaceRun", 'DateTime'>
    readonly costUsd: FieldRef<"WorkspaceRun", 'Decimal'>
    readonly readinessScore: FieldRef<"WorkspaceRun", 'Decimal'>
    readonly results: FieldRef<"WorkspaceRun", 'Json'>
    readonly createdAt: FieldRef<"WorkspaceRun", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * WorkspaceRun findUnique
   */
  export type WorkspaceRunFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
    /**
     * Filter, which WorkspaceRun to fetch.
     */
    where: WorkspaceRunWhereUniqueInput
  }

  /**
   * WorkspaceRun findUniqueOrThrow
   */
  export type WorkspaceRunFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
    /**
     * Filter, which WorkspaceRun to fetch.
     */
    where: WorkspaceRunWhereUniqueInput
  }

  /**
   * WorkspaceRun findFirst
   */
  export type WorkspaceRunFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
    /**
     * Filter, which WorkspaceRun to fetch.
     */
    where?: WorkspaceRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WorkspaceRuns to fetch.
     */
    orderBy?: WorkspaceRunOrderByWithRelationInput | WorkspaceRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WorkspaceRuns.
     */
    cursor?: WorkspaceRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WorkspaceRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WorkspaceRuns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WorkspaceRuns.
     */
    distinct?: WorkspaceRunScalarFieldEnum | WorkspaceRunScalarFieldEnum[]
  }

  /**
   * WorkspaceRun findFirstOrThrow
   */
  export type WorkspaceRunFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
    /**
     * Filter, which WorkspaceRun to fetch.
     */
    where?: WorkspaceRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WorkspaceRuns to fetch.
     */
    orderBy?: WorkspaceRunOrderByWithRelationInput | WorkspaceRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WorkspaceRuns.
     */
    cursor?: WorkspaceRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WorkspaceRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WorkspaceRuns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WorkspaceRuns.
     */
    distinct?: WorkspaceRunScalarFieldEnum | WorkspaceRunScalarFieldEnum[]
  }

  /**
   * WorkspaceRun findMany
   */
  export type WorkspaceRunFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
    /**
     * Filter, which WorkspaceRuns to fetch.
     */
    where?: WorkspaceRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WorkspaceRuns to fetch.
     */
    orderBy?: WorkspaceRunOrderByWithRelationInput | WorkspaceRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing WorkspaceRuns.
     */
    cursor?: WorkspaceRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WorkspaceRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WorkspaceRuns.
     */
    skip?: number
    distinct?: WorkspaceRunScalarFieldEnum | WorkspaceRunScalarFieldEnum[]
  }

  /**
   * WorkspaceRun create
   */
  export type WorkspaceRunCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
    /**
     * The data needed to create a WorkspaceRun.
     */
    data: XOR<WorkspaceRunCreateInput, WorkspaceRunUncheckedCreateInput>
  }

  /**
   * WorkspaceRun createMany
   */
  export type WorkspaceRunCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many WorkspaceRuns.
     */
    data: WorkspaceRunCreateManyInput | WorkspaceRunCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * WorkspaceRun createManyAndReturn
   */
  export type WorkspaceRunCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * The data used to create many WorkspaceRuns.
     */
    data: WorkspaceRunCreateManyInput | WorkspaceRunCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * WorkspaceRun update
   */
  export type WorkspaceRunUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
    /**
     * The data needed to update a WorkspaceRun.
     */
    data: XOR<WorkspaceRunUpdateInput, WorkspaceRunUncheckedUpdateInput>
    /**
     * Choose, which WorkspaceRun to update.
     */
    where: WorkspaceRunWhereUniqueInput
  }

  /**
   * WorkspaceRun updateMany
   */
  export type WorkspaceRunUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update WorkspaceRuns.
     */
    data: XOR<WorkspaceRunUpdateManyMutationInput, WorkspaceRunUncheckedUpdateManyInput>
    /**
     * Filter which WorkspaceRuns to update
     */
    where?: WorkspaceRunWhereInput
    /**
     * Limit how many WorkspaceRuns to update.
     */
    limit?: number
  }

  /**
   * WorkspaceRun updateManyAndReturn
   */
  export type WorkspaceRunUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * The data used to update WorkspaceRuns.
     */
    data: XOR<WorkspaceRunUpdateManyMutationInput, WorkspaceRunUncheckedUpdateManyInput>
    /**
     * Filter which WorkspaceRuns to update
     */
    where?: WorkspaceRunWhereInput
    /**
     * Limit how many WorkspaceRuns to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * WorkspaceRun upsert
   */
  export type WorkspaceRunUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
    /**
     * The filter to search for the WorkspaceRun to update in case it exists.
     */
    where: WorkspaceRunWhereUniqueInput
    /**
     * In case the WorkspaceRun found by the `where` argument doesn't exist, create a new WorkspaceRun with this data.
     */
    create: XOR<WorkspaceRunCreateInput, WorkspaceRunUncheckedCreateInput>
    /**
     * In case the WorkspaceRun was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WorkspaceRunUpdateInput, WorkspaceRunUncheckedUpdateInput>
  }

  /**
   * WorkspaceRun delete
   */
  export type WorkspaceRunDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
    /**
     * Filter which WorkspaceRun to delete.
     */
    where: WorkspaceRunWhereUniqueInput
  }

  /**
   * WorkspaceRun deleteMany
   */
  export type WorkspaceRunDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WorkspaceRuns to delete
     */
    where?: WorkspaceRunWhereInput
    /**
     * Limit how many WorkspaceRuns to delete.
     */
    limit?: number
  }

  /**
   * WorkspaceRun without action
   */
  export type WorkspaceRunDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WorkspaceRun
     */
    select?: WorkspaceRunSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WorkspaceRun
     */
    omit?: WorkspaceRunOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WorkspaceRunInclude<ExtArgs> | null
  }


  /**
   * Model AuditBundle
   */

  export type AggregateAuditBundle = {
    _count: AuditBundleCountAggregateOutputType | null
    _min: AuditBundleMinAggregateOutputType | null
    _max: AuditBundleMaxAggregateOutputType | null
  }

  export type AuditBundleMinAggregateOutputType = {
    bundleId: string | null
    workspaceId: string | null
    signatureKeyId: string | null
    signature: string | null
    signedAt: Date | null
    createdAt: Date | null
  }

  export type AuditBundleMaxAggregateOutputType = {
    bundleId: string | null
    workspaceId: string | null
    signatureKeyId: string | null
    signature: string | null
    signedAt: Date | null
    createdAt: Date | null
  }

  export type AuditBundleCountAggregateOutputType = {
    bundleId: number
    workspaceId: number
    bundleData: number
    signatureKeyId: number
    signature: number
    signedAt: number
    createdAt: number
    _all: number
  }


  export type AuditBundleMinAggregateInputType = {
    bundleId?: true
    workspaceId?: true
    signatureKeyId?: true
    signature?: true
    signedAt?: true
    createdAt?: true
  }

  export type AuditBundleMaxAggregateInputType = {
    bundleId?: true
    workspaceId?: true
    signatureKeyId?: true
    signature?: true
    signedAt?: true
    createdAt?: true
  }

  export type AuditBundleCountAggregateInputType = {
    bundleId?: true
    workspaceId?: true
    bundleData?: true
    signatureKeyId?: true
    signature?: true
    signedAt?: true
    createdAt?: true
    _all?: true
  }

  export type AuditBundleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditBundle to aggregate.
     */
    where?: AuditBundleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditBundles to fetch.
     */
    orderBy?: AuditBundleOrderByWithRelationInput | AuditBundleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuditBundleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditBundles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditBundles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuditBundles
    **/
    _count?: true | AuditBundleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuditBundleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuditBundleMaxAggregateInputType
  }

  export type GetAuditBundleAggregateType<T extends AuditBundleAggregateArgs> = {
        [P in keyof T & keyof AggregateAuditBundle]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuditBundle[P]>
      : GetScalarType<T[P], AggregateAuditBundle[P]>
  }




  export type AuditBundleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditBundleWhereInput
    orderBy?: AuditBundleOrderByWithAggregationInput | AuditBundleOrderByWithAggregationInput[]
    by: AuditBundleScalarFieldEnum[] | AuditBundleScalarFieldEnum
    having?: AuditBundleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuditBundleCountAggregateInputType | true
    _min?: AuditBundleMinAggregateInputType
    _max?: AuditBundleMaxAggregateInputType
  }

  export type AuditBundleGroupByOutputType = {
    bundleId: string
    workspaceId: string
    bundleData: JsonValue
    signatureKeyId: string
    signature: string
    signedAt: Date
    createdAt: Date
    _count: AuditBundleCountAggregateOutputType | null
    _min: AuditBundleMinAggregateOutputType | null
    _max: AuditBundleMaxAggregateOutputType | null
  }

  type GetAuditBundleGroupByPayload<T extends AuditBundleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuditBundleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuditBundleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuditBundleGroupByOutputType[P]>
            : GetScalarType<T[P], AuditBundleGroupByOutputType[P]>
        }
      >
    >


  export type AuditBundleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    bundleId?: boolean
    workspaceId?: boolean
    bundleData?: boolean
    signatureKeyId?: boolean
    signature?: boolean
    signedAt?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditBundle"]>

  export type AuditBundleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    bundleId?: boolean
    workspaceId?: boolean
    bundleData?: boolean
    signatureKeyId?: boolean
    signature?: boolean
    signedAt?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditBundle"]>

  export type AuditBundleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    bundleId?: boolean
    workspaceId?: boolean
    bundleData?: boolean
    signatureKeyId?: boolean
    signature?: boolean
    signedAt?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditBundle"]>

  export type AuditBundleSelectScalar = {
    bundleId?: boolean
    workspaceId?: boolean
    bundleData?: boolean
    signatureKeyId?: boolean
    signature?: boolean
    signedAt?: boolean
    createdAt?: boolean
  }

  export type AuditBundleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"bundleId" | "workspaceId" | "bundleData" | "signatureKeyId" | "signature" | "signedAt" | "createdAt", ExtArgs["result"]["auditBundle"]>
  export type AuditBundleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type AuditBundleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type AuditBundleIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }

  export type $AuditBundlePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuditBundle"
    objects: {
      workspace: Prisma.$WorkspacePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      bundleId: string
      workspaceId: string
      bundleData: Prisma.JsonValue
      signatureKeyId: string
      signature: string
      signedAt: Date
      createdAt: Date
    }, ExtArgs["result"]["auditBundle"]>
    composites: {}
  }

  type AuditBundleGetPayload<S extends boolean | null | undefined | AuditBundleDefaultArgs> = $Result.GetResult<Prisma.$AuditBundlePayload, S>

  type AuditBundleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AuditBundleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AuditBundleCountAggregateInputType | true
    }

  export interface AuditBundleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuditBundle'], meta: { name: 'AuditBundle' } }
    /**
     * Find zero or one AuditBundle that matches the filter.
     * @param {AuditBundleFindUniqueArgs} args - Arguments to find a AuditBundle
     * @example
     * // Get one AuditBundle
     * const auditBundle = await prisma.auditBundle.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuditBundleFindUniqueArgs>(args: SelectSubset<T, AuditBundleFindUniqueArgs<ExtArgs>>): Prisma__AuditBundleClient<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AuditBundle that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AuditBundleFindUniqueOrThrowArgs} args - Arguments to find a AuditBundle
     * @example
     * // Get one AuditBundle
     * const auditBundle = await prisma.auditBundle.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuditBundleFindUniqueOrThrowArgs>(args: SelectSubset<T, AuditBundleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuditBundleClient<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditBundle that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditBundleFindFirstArgs} args - Arguments to find a AuditBundle
     * @example
     * // Get one AuditBundle
     * const auditBundle = await prisma.auditBundle.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuditBundleFindFirstArgs>(args?: SelectSubset<T, AuditBundleFindFirstArgs<ExtArgs>>): Prisma__AuditBundleClient<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditBundle that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditBundleFindFirstOrThrowArgs} args - Arguments to find a AuditBundle
     * @example
     * // Get one AuditBundle
     * const auditBundle = await prisma.auditBundle.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuditBundleFindFirstOrThrowArgs>(args?: SelectSubset<T, AuditBundleFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuditBundleClient<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AuditBundles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditBundleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuditBundles
     * const auditBundles = await prisma.auditBundle.findMany()
     * 
     * // Get first 10 AuditBundles
     * const auditBundles = await prisma.auditBundle.findMany({ take: 10 })
     * 
     * // Only select the `bundleId`
     * const auditBundleWithBundleIdOnly = await prisma.auditBundle.findMany({ select: { bundleId: true } })
     * 
     */
    findMany<T extends AuditBundleFindManyArgs>(args?: SelectSubset<T, AuditBundleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AuditBundle.
     * @param {AuditBundleCreateArgs} args - Arguments to create a AuditBundle.
     * @example
     * // Create one AuditBundle
     * const AuditBundle = await prisma.auditBundle.create({
     *   data: {
     *     // ... data to create a AuditBundle
     *   }
     * })
     * 
     */
    create<T extends AuditBundleCreateArgs>(args: SelectSubset<T, AuditBundleCreateArgs<ExtArgs>>): Prisma__AuditBundleClient<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AuditBundles.
     * @param {AuditBundleCreateManyArgs} args - Arguments to create many AuditBundles.
     * @example
     * // Create many AuditBundles
     * const auditBundle = await prisma.auditBundle.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuditBundleCreateManyArgs>(args?: SelectSubset<T, AuditBundleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuditBundles and returns the data saved in the database.
     * @param {AuditBundleCreateManyAndReturnArgs} args - Arguments to create many AuditBundles.
     * @example
     * // Create many AuditBundles
     * const auditBundle = await prisma.auditBundle.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuditBundles and only return the `bundleId`
     * const auditBundleWithBundleIdOnly = await prisma.auditBundle.createManyAndReturn({
     *   select: { bundleId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuditBundleCreateManyAndReturnArgs>(args?: SelectSubset<T, AuditBundleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AuditBundle.
     * @param {AuditBundleDeleteArgs} args - Arguments to delete one AuditBundle.
     * @example
     * // Delete one AuditBundle
     * const AuditBundle = await prisma.auditBundle.delete({
     *   where: {
     *     // ... filter to delete one AuditBundle
     *   }
     * })
     * 
     */
    delete<T extends AuditBundleDeleteArgs>(args: SelectSubset<T, AuditBundleDeleteArgs<ExtArgs>>): Prisma__AuditBundleClient<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AuditBundle.
     * @param {AuditBundleUpdateArgs} args - Arguments to update one AuditBundle.
     * @example
     * // Update one AuditBundle
     * const auditBundle = await prisma.auditBundle.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuditBundleUpdateArgs>(args: SelectSubset<T, AuditBundleUpdateArgs<ExtArgs>>): Prisma__AuditBundleClient<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AuditBundles.
     * @param {AuditBundleDeleteManyArgs} args - Arguments to filter AuditBundles to delete.
     * @example
     * // Delete a few AuditBundles
     * const { count } = await prisma.auditBundle.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuditBundleDeleteManyArgs>(args?: SelectSubset<T, AuditBundleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditBundles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditBundleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuditBundles
     * const auditBundle = await prisma.auditBundle.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuditBundleUpdateManyArgs>(args: SelectSubset<T, AuditBundleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditBundles and returns the data updated in the database.
     * @param {AuditBundleUpdateManyAndReturnArgs} args - Arguments to update many AuditBundles.
     * @example
     * // Update many AuditBundles
     * const auditBundle = await prisma.auditBundle.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AuditBundles and only return the `bundleId`
     * const auditBundleWithBundleIdOnly = await prisma.auditBundle.updateManyAndReturn({
     *   select: { bundleId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AuditBundleUpdateManyAndReturnArgs>(args: SelectSubset<T, AuditBundleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AuditBundle.
     * @param {AuditBundleUpsertArgs} args - Arguments to update or create a AuditBundle.
     * @example
     * // Update or create a AuditBundle
     * const auditBundle = await prisma.auditBundle.upsert({
     *   create: {
     *     // ... data to create a AuditBundle
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuditBundle we want to update
     *   }
     * })
     */
    upsert<T extends AuditBundleUpsertArgs>(args: SelectSubset<T, AuditBundleUpsertArgs<ExtArgs>>): Prisma__AuditBundleClient<$Result.GetResult<Prisma.$AuditBundlePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AuditBundles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditBundleCountArgs} args - Arguments to filter AuditBundles to count.
     * @example
     * // Count the number of AuditBundles
     * const count = await prisma.auditBundle.count({
     *   where: {
     *     // ... the filter for the AuditBundles we want to count
     *   }
     * })
    **/
    count<T extends AuditBundleCountArgs>(
      args?: Subset<T, AuditBundleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuditBundleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuditBundle.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditBundleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AuditBundleAggregateArgs>(args: Subset<T, AuditBundleAggregateArgs>): Prisma.PrismaPromise<GetAuditBundleAggregateType<T>>

    /**
     * Group by AuditBundle.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditBundleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AuditBundleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuditBundleGroupByArgs['orderBy'] }
        : { orderBy?: AuditBundleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AuditBundleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuditBundleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuditBundle model
   */
  readonly fields: AuditBundleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuditBundle.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuditBundleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    workspace<T extends WorkspaceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WorkspaceDefaultArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AuditBundle model
   */
  interface AuditBundleFieldRefs {
    readonly bundleId: FieldRef<"AuditBundle", 'String'>
    readonly workspaceId: FieldRef<"AuditBundle", 'String'>
    readonly bundleData: FieldRef<"AuditBundle", 'Json'>
    readonly signatureKeyId: FieldRef<"AuditBundle", 'String'>
    readonly signature: FieldRef<"AuditBundle", 'String'>
    readonly signedAt: FieldRef<"AuditBundle", 'DateTime'>
    readonly createdAt: FieldRef<"AuditBundle", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuditBundle findUnique
   */
  export type AuditBundleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
    /**
     * Filter, which AuditBundle to fetch.
     */
    where: AuditBundleWhereUniqueInput
  }

  /**
   * AuditBundle findUniqueOrThrow
   */
  export type AuditBundleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
    /**
     * Filter, which AuditBundle to fetch.
     */
    where: AuditBundleWhereUniqueInput
  }

  /**
   * AuditBundle findFirst
   */
  export type AuditBundleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
    /**
     * Filter, which AuditBundle to fetch.
     */
    where?: AuditBundleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditBundles to fetch.
     */
    orderBy?: AuditBundleOrderByWithRelationInput | AuditBundleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditBundles.
     */
    cursor?: AuditBundleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditBundles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditBundles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditBundles.
     */
    distinct?: AuditBundleScalarFieldEnum | AuditBundleScalarFieldEnum[]
  }

  /**
   * AuditBundle findFirstOrThrow
   */
  export type AuditBundleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
    /**
     * Filter, which AuditBundle to fetch.
     */
    where?: AuditBundleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditBundles to fetch.
     */
    orderBy?: AuditBundleOrderByWithRelationInput | AuditBundleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditBundles.
     */
    cursor?: AuditBundleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditBundles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditBundles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditBundles.
     */
    distinct?: AuditBundleScalarFieldEnum | AuditBundleScalarFieldEnum[]
  }

  /**
   * AuditBundle findMany
   */
  export type AuditBundleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
    /**
     * Filter, which AuditBundles to fetch.
     */
    where?: AuditBundleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditBundles to fetch.
     */
    orderBy?: AuditBundleOrderByWithRelationInput | AuditBundleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuditBundles.
     */
    cursor?: AuditBundleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditBundles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditBundles.
     */
    skip?: number
    distinct?: AuditBundleScalarFieldEnum | AuditBundleScalarFieldEnum[]
  }

  /**
   * AuditBundle create
   */
  export type AuditBundleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
    /**
     * The data needed to create a AuditBundle.
     */
    data: XOR<AuditBundleCreateInput, AuditBundleUncheckedCreateInput>
  }

  /**
   * AuditBundle createMany
   */
  export type AuditBundleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuditBundles.
     */
    data: AuditBundleCreateManyInput | AuditBundleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuditBundle createManyAndReturn
   */
  export type AuditBundleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * The data used to create many AuditBundles.
     */
    data: AuditBundleCreateManyInput | AuditBundleCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditBundle update
   */
  export type AuditBundleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
    /**
     * The data needed to update a AuditBundle.
     */
    data: XOR<AuditBundleUpdateInput, AuditBundleUncheckedUpdateInput>
    /**
     * Choose, which AuditBundle to update.
     */
    where: AuditBundleWhereUniqueInput
  }

  /**
   * AuditBundle updateMany
   */
  export type AuditBundleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuditBundles.
     */
    data: XOR<AuditBundleUpdateManyMutationInput, AuditBundleUncheckedUpdateManyInput>
    /**
     * Filter which AuditBundles to update
     */
    where?: AuditBundleWhereInput
    /**
     * Limit how many AuditBundles to update.
     */
    limit?: number
  }

  /**
   * AuditBundle updateManyAndReturn
   */
  export type AuditBundleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * The data used to update AuditBundles.
     */
    data: XOR<AuditBundleUpdateManyMutationInput, AuditBundleUncheckedUpdateManyInput>
    /**
     * Filter which AuditBundles to update
     */
    where?: AuditBundleWhereInput
    /**
     * Limit how many AuditBundles to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditBundle upsert
   */
  export type AuditBundleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
    /**
     * The filter to search for the AuditBundle to update in case it exists.
     */
    where: AuditBundleWhereUniqueInput
    /**
     * In case the AuditBundle found by the `where` argument doesn't exist, create a new AuditBundle with this data.
     */
    create: XOR<AuditBundleCreateInput, AuditBundleUncheckedCreateInput>
    /**
     * In case the AuditBundle was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuditBundleUpdateInput, AuditBundleUncheckedUpdateInput>
  }

  /**
   * AuditBundle delete
   */
  export type AuditBundleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
    /**
     * Filter which AuditBundle to delete.
     */
    where: AuditBundleWhereUniqueInput
  }

  /**
   * AuditBundle deleteMany
   */
  export type AuditBundleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditBundles to delete
     */
    where?: AuditBundleWhereInput
    /**
     * Limit how many AuditBundles to delete.
     */
    limit?: number
  }

  /**
   * AuditBundle without action
   */
  export type AuditBundleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditBundle
     */
    select?: AuditBundleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditBundle
     */
    omit?: AuditBundleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditBundleInclude<ExtArgs> | null
  }


  /**
   * Model Connector
   */

  export type AggregateConnector = {
    _count: ConnectorCountAggregateOutputType | null
    _min: ConnectorMinAggregateOutputType | null
    _max: ConnectorMaxAggregateOutputType | null
  }

  export type ConnectorMinAggregateOutputType = {
    connectorId: string | null
    workspaceId: string | null
    platform: string | null
    accountId: string | null
    displayName: string | null
    status: string | null
    lastConnectedAt: Date | null
    ownerContact: string | null
    credentialsRef: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ConnectorMaxAggregateOutputType = {
    connectorId: string | null
    workspaceId: string | null
    platform: string | null
    accountId: string | null
    displayName: string | null
    status: string | null
    lastConnectedAt: Date | null
    ownerContact: string | null
    credentialsRef: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ConnectorCountAggregateOutputType = {
    connectorId: number
    workspaceId: number
    platform: number
    accountId: number
    displayName: number
    status: number
    scopes: number
    lastConnectedAt: number
    ownerContact: number
    credentialsRef: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ConnectorMinAggregateInputType = {
    connectorId?: true
    workspaceId?: true
    platform?: true
    accountId?: true
    displayName?: true
    status?: true
    lastConnectedAt?: true
    ownerContact?: true
    credentialsRef?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ConnectorMaxAggregateInputType = {
    connectorId?: true
    workspaceId?: true
    platform?: true
    accountId?: true
    displayName?: true
    status?: true
    lastConnectedAt?: true
    ownerContact?: true
    credentialsRef?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ConnectorCountAggregateInputType = {
    connectorId?: true
    workspaceId?: true
    platform?: true
    accountId?: true
    displayName?: true
    status?: true
    scopes?: true
    lastConnectedAt?: true
    ownerContact?: true
    credentialsRef?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ConnectorAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Connector to aggregate.
     */
    where?: ConnectorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connectors to fetch.
     */
    orderBy?: ConnectorOrderByWithRelationInput | ConnectorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConnectorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connectors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connectors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Connectors
    **/
    _count?: true | ConnectorCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConnectorMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConnectorMaxAggregateInputType
  }

  export type GetConnectorAggregateType<T extends ConnectorAggregateArgs> = {
        [P in keyof T & keyof AggregateConnector]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConnector[P]>
      : GetScalarType<T[P], AggregateConnector[P]>
  }




  export type ConnectorGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectorWhereInput
    orderBy?: ConnectorOrderByWithAggregationInput | ConnectorOrderByWithAggregationInput[]
    by: ConnectorScalarFieldEnum[] | ConnectorScalarFieldEnum
    having?: ConnectorScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConnectorCountAggregateInputType | true
    _min?: ConnectorMinAggregateInputType
    _max?: ConnectorMaxAggregateInputType
  }

  export type ConnectorGroupByOutputType = {
    connectorId: string
    workspaceId: string
    platform: string
    accountId: string
    displayName: string
    status: string
    scopes: JsonValue | null
    lastConnectedAt: Date | null
    ownerContact: string | null
    credentialsRef: string | null
    createdAt: Date
    updatedAt: Date
    _count: ConnectorCountAggregateOutputType | null
    _min: ConnectorMinAggregateOutputType | null
    _max: ConnectorMaxAggregateOutputType | null
  }

  type GetConnectorGroupByPayload<T extends ConnectorGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConnectorGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConnectorGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConnectorGroupByOutputType[P]>
            : GetScalarType<T[P], ConnectorGroupByOutputType[P]>
        }
      >
    >


  export type ConnectorSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    connectorId?: boolean
    workspaceId?: boolean
    platform?: boolean
    accountId?: boolean
    displayName?: boolean
    status?: boolean
    scopes?: boolean
    lastConnectedAt?: boolean
    ownerContact?: boolean
    credentialsRef?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["connector"]>

  export type ConnectorSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    connectorId?: boolean
    workspaceId?: boolean
    platform?: boolean
    accountId?: boolean
    displayName?: boolean
    status?: boolean
    scopes?: boolean
    lastConnectedAt?: boolean
    ownerContact?: boolean
    credentialsRef?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["connector"]>

  export type ConnectorSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    connectorId?: boolean
    workspaceId?: boolean
    platform?: boolean
    accountId?: boolean
    displayName?: boolean
    status?: boolean
    scopes?: boolean
    lastConnectedAt?: boolean
    ownerContact?: boolean
    credentialsRef?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["connector"]>

  export type ConnectorSelectScalar = {
    connectorId?: boolean
    workspaceId?: boolean
    platform?: boolean
    accountId?: boolean
    displayName?: boolean
    status?: boolean
    scopes?: boolean
    lastConnectedAt?: boolean
    ownerContact?: boolean
    credentialsRef?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ConnectorOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"connectorId" | "workspaceId" | "platform" | "accountId" | "displayName" | "status" | "scopes" | "lastConnectedAt" | "ownerContact" | "credentialsRef" | "createdAt" | "updatedAt", ExtArgs["result"]["connector"]>
  export type ConnectorInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type ConnectorIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type ConnectorIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }

  export type $ConnectorPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Connector"
    objects: {
      workspace: Prisma.$WorkspacePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      connectorId: string
      workspaceId: string
      platform: string
      accountId: string
      displayName: string
      status: string
      scopes: Prisma.JsonValue | null
      lastConnectedAt: Date | null
      ownerContact: string | null
      credentialsRef: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["connector"]>
    composites: {}
  }

  type ConnectorGetPayload<S extends boolean | null | undefined | ConnectorDefaultArgs> = $Result.GetResult<Prisma.$ConnectorPayload, S>

  type ConnectorCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ConnectorFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ConnectorCountAggregateInputType | true
    }

  export interface ConnectorDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Connector'], meta: { name: 'Connector' } }
    /**
     * Find zero or one Connector that matches the filter.
     * @param {ConnectorFindUniqueArgs} args - Arguments to find a Connector
     * @example
     * // Get one Connector
     * const connector = await prisma.connector.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConnectorFindUniqueArgs>(args: SelectSubset<T, ConnectorFindUniqueArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Connector that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ConnectorFindUniqueOrThrowArgs} args - Arguments to find a Connector
     * @example
     * // Get one Connector
     * const connector = await prisma.connector.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConnectorFindUniqueOrThrowArgs>(args: SelectSubset<T, ConnectorFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Connector that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorFindFirstArgs} args - Arguments to find a Connector
     * @example
     * // Get one Connector
     * const connector = await prisma.connector.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConnectorFindFirstArgs>(args?: SelectSubset<T, ConnectorFindFirstArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Connector that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorFindFirstOrThrowArgs} args - Arguments to find a Connector
     * @example
     * // Get one Connector
     * const connector = await prisma.connector.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConnectorFindFirstOrThrowArgs>(args?: SelectSubset<T, ConnectorFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Connectors that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Connectors
     * const connectors = await prisma.connector.findMany()
     * 
     * // Get first 10 Connectors
     * const connectors = await prisma.connector.findMany({ take: 10 })
     * 
     * // Only select the `connectorId`
     * const connectorWithConnectorIdOnly = await prisma.connector.findMany({ select: { connectorId: true } })
     * 
     */
    findMany<T extends ConnectorFindManyArgs>(args?: SelectSubset<T, ConnectorFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Connector.
     * @param {ConnectorCreateArgs} args - Arguments to create a Connector.
     * @example
     * // Create one Connector
     * const Connector = await prisma.connector.create({
     *   data: {
     *     // ... data to create a Connector
     *   }
     * })
     * 
     */
    create<T extends ConnectorCreateArgs>(args: SelectSubset<T, ConnectorCreateArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Connectors.
     * @param {ConnectorCreateManyArgs} args - Arguments to create many Connectors.
     * @example
     * // Create many Connectors
     * const connector = await prisma.connector.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConnectorCreateManyArgs>(args?: SelectSubset<T, ConnectorCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Connectors and returns the data saved in the database.
     * @param {ConnectorCreateManyAndReturnArgs} args - Arguments to create many Connectors.
     * @example
     * // Create many Connectors
     * const connector = await prisma.connector.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Connectors and only return the `connectorId`
     * const connectorWithConnectorIdOnly = await prisma.connector.createManyAndReturn({
     *   select: { connectorId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ConnectorCreateManyAndReturnArgs>(args?: SelectSubset<T, ConnectorCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Connector.
     * @param {ConnectorDeleteArgs} args - Arguments to delete one Connector.
     * @example
     * // Delete one Connector
     * const Connector = await prisma.connector.delete({
     *   where: {
     *     // ... filter to delete one Connector
     *   }
     * })
     * 
     */
    delete<T extends ConnectorDeleteArgs>(args: SelectSubset<T, ConnectorDeleteArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Connector.
     * @param {ConnectorUpdateArgs} args - Arguments to update one Connector.
     * @example
     * // Update one Connector
     * const connector = await prisma.connector.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConnectorUpdateArgs>(args: SelectSubset<T, ConnectorUpdateArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Connectors.
     * @param {ConnectorDeleteManyArgs} args - Arguments to filter Connectors to delete.
     * @example
     * // Delete a few Connectors
     * const { count } = await prisma.connector.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConnectorDeleteManyArgs>(args?: SelectSubset<T, ConnectorDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Connectors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Connectors
     * const connector = await prisma.connector.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConnectorUpdateManyArgs>(args: SelectSubset<T, ConnectorUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Connectors and returns the data updated in the database.
     * @param {ConnectorUpdateManyAndReturnArgs} args - Arguments to update many Connectors.
     * @example
     * // Update many Connectors
     * const connector = await prisma.connector.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Connectors and only return the `connectorId`
     * const connectorWithConnectorIdOnly = await prisma.connector.updateManyAndReturn({
     *   select: { connectorId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ConnectorUpdateManyAndReturnArgs>(args: SelectSubset<T, ConnectorUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Connector.
     * @param {ConnectorUpsertArgs} args - Arguments to update or create a Connector.
     * @example
     * // Update or create a Connector
     * const connector = await prisma.connector.upsert({
     *   create: {
     *     // ... data to create a Connector
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Connector we want to update
     *   }
     * })
     */
    upsert<T extends ConnectorUpsertArgs>(args: SelectSubset<T, ConnectorUpsertArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Connectors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorCountArgs} args - Arguments to filter Connectors to count.
     * @example
     * // Count the number of Connectors
     * const count = await prisma.connector.count({
     *   where: {
     *     // ... the filter for the Connectors we want to count
     *   }
     * })
    **/
    count<T extends ConnectorCountArgs>(
      args?: Subset<T, ConnectorCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConnectorCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Connector.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConnectorAggregateArgs>(args: Subset<T, ConnectorAggregateArgs>): Prisma.PrismaPromise<GetConnectorAggregateType<T>>

    /**
     * Group by Connector.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConnectorGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConnectorGroupByArgs['orderBy'] }
        : { orderBy?: ConnectorGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConnectorGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConnectorGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Connector model
   */
  readonly fields: ConnectorFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Connector.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConnectorClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    workspace<T extends WorkspaceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WorkspaceDefaultArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Connector model
   */
  interface ConnectorFieldRefs {
    readonly connectorId: FieldRef<"Connector", 'String'>
    readonly workspaceId: FieldRef<"Connector", 'String'>
    readonly platform: FieldRef<"Connector", 'String'>
    readonly accountId: FieldRef<"Connector", 'String'>
    readonly displayName: FieldRef<"Connector", 'String'>
    readonly status: FieldRef<"Connector", 'String'>
    readonly scopes: FieldRef<"Connector", 'Json'>
    readonly lastConnectedAt: FieldRef<"Connector", 'DateTime'>
    readonly ownerContact: FieldRef<"Connector", 'String'>
    readonly credentialsRef: FieldRef<"Connector", 'String'>
    readonly createdAt: FieldRef<"Connector", 'DateTime'>
    readonly updatedAt: FieldRef<"Connector", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Connector findUnique
   */
  export type ConnectorFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter, which Connector to fetch.
     */
    where: ConnectorWhereUniqueInput
  }

  /**
   * Connector findUniqueOrThrow
   */
  export type ConnectorFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter, which Connector to fetch.
     */
    where: ConnectorWhereUniqueInput
  }

  /**
   * Connector findFirst
   */
  export type ConnectorFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter, which Connector to fetch.
     */
    where?: ConnectorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connectors to fetch.
     */
    orderBy?: ConnectorOrderByWithRelationInput | ConnectorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Connectors.
     */
    cursor?: ConnectorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connectors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connectors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Connectors.
     */
    distinct?: ConnectorScalarFieldEnum | ConnectorScalarFieldEnum[]
  }

  /**
   * Connector findFirstOrThrow
   */
  export type ConnectorFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter, which Connector to fetch.
     */
    where?: ConnectorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connectors to fetch.
     */
    orderBy?: ConnectorOrderByWithRelationInput | ConnectorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Connectors.
     */
    cursor?: ConnectorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connectors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connectors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Connectors.
     */
    distinct?: ConnectorScalarFieldEnum | ConnectorScalarFieldEnum[]
  }

  /**
   * Connector findMany
   */
  export type ConnectorFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter, which Connectors to fetch.
     */
    where?: ConnectorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connectors to fetch.
     */
    orderBy?: ConnectorOrderByWithRelationInput | ConnectorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Connectors.
     */
    cursor?: ConnectorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connectors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connectors.
     */
    skip?: number
    distinct?: ConnectorScalarFieldEnum | ConnectorScalarFieldEnum[]
  }

  /**
   * Connector create
   */
  export type ConnectorCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * The data needed to create a Connector.
     */
    data: XOR<ConnectorCreateInput, ConnectorUncheckedCreateInput>
  }

  /**
   * Connector createMany
   */
  export type ConnectorCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Connectors.
     */
    data: ConnectorCreateManyInput | ConnectorCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Connector createManyAndReturn
   */
  export type ConnectorCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * The data used to create many Connectors.
     */
    data: ConnectorCreateManyInput | ConnectorCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Connector update
   */
  export type ConnectorUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * The data needed to update a Connector.
     */
    data: XOR<ConnectorUpdateInput, ConnectorUncheckedUpdateInput>
    /**
     * Choose, which Connector to update.
     */
    where: ConnectorWhereUniqueInput
  }

  /**
   * Connector updateMany
   */
  export type ConnectorUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Connectors.
     */
    data: XOR<ConnectorUpdateManyMutationInput, ConnectorUncheckedUpdateManyInput>
    /**
     * Filter which Connectors to update
     */
    where?: ConnectorWhereInput
    /**
     * Limit how many Connectors to update.
     */
    limit?: number
  }

  /**
   * Connector updateManyAndReturn
   */
  export type ConnectorUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * The data used to update Connectors.
     */
    data: XOR<ConnectorUpdateManyMutationInput, ConnectorUncheckedUpdateManyInput>
    /**
     * Filter which Connectors to update
     */
    where?: ConnectorWhereInput
    /**
     * Limit how many Connectors to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Connector upsert
   */
  export type ConnectorUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * The filter to search for the Connector to update in case it exists.
     */
    where: ConnectorWhereUniqueInput
    /**
     * In case the Connector found by the `where` argument doesn't exist, create a new Connector with this data.
     */
    create: XOR<ConnectorCreateInput, ConnectorUncheckedCreateInput>
    /**
     * In case the Connector was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConnectorUpdateInput, ConnectorUncheckedUpdateInput>
  }

  /**
   * Connector delete
   */
  export type ConnectorDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter which Connector to delete.
     */
    where: ConnectorWhereUniqueInput
  }

  /**
   * Connector deleteMany
   */
  export type ConnectorDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Connectors to delete
     */
    where?: ConnectorWhereInput
    /**
     * Limit how many Connectors to delete.
     */
    limit?: number
  }

  /**
   * Connector without action
   */
  export type ConnectorDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connector
     */
    omit?: ConnectorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
  }


  /**
   * Model ConsentRecord
   */

  export type AggregateConsentRecord = {
    _count: ConsentRecordCountAggregateOutputType | null
    _min: ConsentRecordMinAggregateOutputType | null
    _max: ConsentRecordMaxAggregateOutputType | null
  }

  export type ConsentRecordMinAggregateOutputType = {
    consentId: string | null
    workspaceId: string | null
    consentType: string | null
    grantedBy: string | null
    grantedAt: Date | null
    expiresAt: Date | null
    documentRef: string | null
    verifierSignature: string | null
    createdAt: Date | null
  }

  export type ConsentRecordMaxAggregateOutputType = {
    consentId: string | null
    workspaceId: string | null
    consentType: string | null
    grantedBy: string | null
    grantedAt: Date | null
    expiresAt: Date | null
    documentRef: string | null
    verifierSignature: string | null
    createdAt: Date | null
  }

  export type ConsentRecordCountAggregateOutputType = {
    consentId: number
    workspaceId: number
    consentType: number
    grantedBy: number
    grantedAt: number
    expiresAt: number
    documentRef: number
    verifierSignature: number
    createdAt: number
    _all: number
  }


  export type ConsentRecordMinAggregateInputType = {
    consentId?: true
    workspaceId?: true
    consentType?: true
    grantedBy?: true
    grantedAt?: true
    expiresAt?: true
    documentRef?: true
    verifierSignature?: true
    createdAt?: true
  }

  export type ConsentRecordMaxAggregateInputType = {
    consentId?: true
    workspaceId?: true
    consentType?: true
    grantedBy?: true
    grantedAt?: true
    expiresAt?: true
    documentRef?: true
    verifierSignature?: true
    createdAt?: true
  }

  export type ConsentRecordCountAggregateInputType = {
    consentId?: true
    workspaceId?: true
    consentType?: true
    grantedBy?: true
    grantedAt?: true
    expiresAt?: true
    documentRef?: true
    verifierSignature?: true
    createdAt?: true
    _all?: true
  }

  export type ConsentRecordAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConsentRecord to aggregate.
     */
    where?: ConsentRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConsentRecords to fetch.
     */
    orderBy?: ConsentRecordOrderByWithRelationInput | ConsentRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConsentRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConsentRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConsentRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ConsentRecords
    **/
    _count?: true | ConsentRecordCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConsentRecordMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConsentRecordMaxAggregateInputType
  }

  export type GetConsentRecordAggregateType<T extends ConsentRecordAggregateArgs> = {
        [P in keyof T & keyof AggregateConsentRecord]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConsentRecord[P]>
      : GetScalarType<T[P], AggregateConsentRecord[P]>
  }




  export type ConsentRecordGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConsentRecordWhereInput
    orderBy?: ConsentRecordOrderByWithAggregationInput | ConsentRecordOrderByWithAggregationInput[]
    by: ConsentRecordScalarFieldEnum[] | ConsentRecordScalarFieldEnum
    having?: ConsentRecordScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConsentRecordCountAggregateInputType | true
    _min?: ConsentRecordMinAggregateInputType
    _max?: ConsentRecordMaxAggregateInputType
  }

  export type ConsentRecordGroupByOutputType = {
    consentId: string
    workspaceId: string
    consentType: string
    grantedBy: string
    grantedAt: Date
    expiresAt: Date
    documentRef: string | null
    verifierSignature: string | null
    createdAt: Date
    _count: ConsentRecordCountAggregateOutputType | null
    _min: ConsentRecordMinAggregateOutputType | null
    _max: ConsentRecordMaxAggregateOutputType | null
  }

  type GetConsentRecordGroupByPayload<T extends ConsentRecordGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConsentRecordGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConsentRecordGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConsentRecordGroupByOutputType[P]>
            : GetScalarType<T[P], ConsentRecordGroupByOutputType[P]>
        }
      >
    >


  export type ConsentRecordSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    consentId?: boolean
    workspaceId?: boolean
    consentType?: boolean
    grantedBy?: boolean
    grantedAt?: boolean
    expiresAt?: boolean
    documentRef?: boolean
    verifierSignature?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["consentRecord"]>

  export type ConsentRecordSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    consentId?: boolean
    workspaceId?: boolean
    consentType?: boolean
    grantedBy?: boolean
    grantedAt?: boolean
    expiresAt?: boolean
    documentRef?: boolean
    verifierSignature?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["consentRecord"]>

  export type ConsentRecordSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    consentId?: boolean
    workspaceId?: boolean
    consentType?: boolean
    grantedBy?: boolean
    grantedAt?: boolean
    expiresAt?: boolean
    documentRef?: boolean
    verifierSignature?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["consentRecord"]>

  export type ConsentRecordSelectScalar = {
    consentId?: boolean
    workspaceId?: boolean
    consentType?: boolean
    grantedBy?: boolean
    grantedAt?: boolean
    expiresAt?: boolean
    documentRef?: boolean
    verifierSignature?: boolean
    createdAt?: boolean
  }

  export type ConsentRecordOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"consentId" | "workspaceId" | "consentType" | "grantedBy" | "grantedAt" | "expiresAt" | "documentRef" | "verifierSignature" | "createdAt", ExtArgs["result"]["consentRecord"]>
  export type ConsentRecordInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type ConsentRecordIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type ConsentRecordIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }

  export type $ConsentRecordPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ConsentRecord"
    objects: {
      workspace: Prisma.$WorkspacePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      consentId: string
      workspaceId: string
      consentType: string
      grantedBy: string
      grantedAt: Date
      expiresAt: Date
      documentRef: string | null
      verifierSignature: string | null
      createdAt: Date
    }, ExtArgs["result"]["consentRecord"]>
    composites: {}
  }

  type ConsentRecordGetPayload<S extends boolean | null | undefined | ConsentRecordDefaultArgs> = $Result.GetResult<Prisma.$ConsentRecordPayload, S>

  type ConsentRecordCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ConsentRecordFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ConsentRecordCountAggregateInputType | true
    }

  export interface ConsentRecordDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ConsentRecord'], meta: { name: 'ConsentRecord' } }
    /**
     * Find zero or one ConsentRecord that matches the filter.
     * @param {ConsentRecordFindUniqueArgs} args - Arguments to find a ConsentRecord
     * @example
     * // Get one ConsentRecord
     * const consentRecord = await prisma.consentRecord.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConsentRecordFindUniqueArgs>(args: SelectSubset<T, ConsentRecordFindUniqueArgs<ExtArgs>>): Prisma__ConsentRecordClient<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ConsentRecord that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ConsentRecordFindUniqueOrThrowArgs} args - Arguments to find a ConsentRecord
     * @example
     * // Get one ConsentRecord
     * const consentRecord = await prisma.consentRecord.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConsentRecordFindUniqueOrThrowArgs>(args: SelectSubset<T, ConsentRecordFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConsentRecordClient<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ConsentRecord that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConsentRecordFindFirstArgs} args - Arguments to find a ConsentRecord
     * @example
     * // Get one ConsentRecord
     * const consentRecord = await prisma.consentRecord.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConsentRecordFindFirstArgs>(args?: SelectSubset<T, ConsentRecordFindFirstArgs<ExtArgs>>): Prisma__ConsentRecordClient<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ConsentRecord that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConsentRecordFindFirstOrThrowArgs} args - Arguments to find a ConsentRecord
     * @example
     * // Get one ConsentRecord
     * const consentRecord = await prisma.consentRecord.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConsentRecordFindFirstOrThrowArgs>(args?: SelectSubset<T, ConsentRecordFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConsentRecordClient<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ConsentRecords that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConsentRecordFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ConsentRecords
     * const consentRecords = await prisma.consentRecord.findMany()
     * 
     * // Get first 10 ConsentRecords
     * const consentRecords = await prisma.consentRecord.findMany({ take: 10 })
     * 
     * // Only select the `consentId`
     * const consentRecordWithConsentIdOnly = await prisma.consentRecord.findMany({ select: { consentId: true } })
     * 
     */
    findMany<T extends ConsentRecordFindManyArgs>(args?: SelectSubset<T, ConsentRecordFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ConsentRecord.
     * @param {ConsentRecordCreateArgs} args - Arguments to create a ConsentRecord.
     * @example
     * // Create one ConsentRecord
     * const ConsentRecord = await prisma.consentRecord.create({
     *   data: {
     *     // ... data to create a ConsentRecord
     *   }
     * })
     * 
     */
    create<T extends ConsentRecordCreateArgs>(args: SelectSubset<T, ConsentRecordCreateArgs<ExtArgs>>): Prisma__ConsentRecordClient<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ConsentRecords.
     * @param {ConsentRecordCreateManyArgs} args - Arguments to create many ConsentRecords.
     * @example
     * // Create many ConsentRecords
     * const consentRecord = await prisma.consentRecord.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConsentRecordCreateManyArgs>(args?: SelectSubset<T, ConsentRecordCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ConsentRecords and returns the data saved in the database.
     * @param {ConsentRecordCreateManyAndReturnArgs} args - Arguments to create many ConsentRecords.
     * @example
     * // Create many ConsentRecords
     * const consentRecord = await prisma.consentRecord.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ConsentRecords and only return the `consentId`
     * const consentRecordWithConsentIdOnly = await prisma.consentRecord.createManyAndReturn({
     *   select: { consentId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ConsentRecordCreateManyAndReturnArgs>(args?: SelectSubset<T, ConsentRecordCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ConsentRecord.
     * @param {ConsentRecordDeleteArgs} args - Arguments to delete one ConsentRecord.
     * @example
     * // Delete one ConsentRecord
     * const ConsentRecord = await prisma.consentRecord.delete({
     *   where: {
     *     // ... filter to delete one ConsentRecord
     *   }
     * })
     * 
     */
    delete<T extends ConsentRecordDeleteArgs>(args: SelectSubset<T, ConsentRecordDeleteArgs<ExtArgs>>): Prisma__ConsentRecordClient<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ConsentRecord.
     * @param {ConsentRecordUpdateArgs} args - Arguments to update one ConsentRecord.
     * @example
     * // Update one ConsentRecord
     * const consentRecord = await prisma.consentRecord.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConsentRecordUpdateArgs>(args: SelectSubset<T, ConsentRecordUpdateArgs<ExtArgs>>): Prisma__ConsentRecordClient<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ConsentRecords.
     * @param {ConsentRecordDeleteManyArgs} args - Arguments to filter ConsentRecords to delete.
     * @example
     * // Delete a few ConsentRecords
     * const { count } = await prisma.consentRecord.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConsentRecordDeleteManyArgs>(args?: SelectSubset<T, ConsentRecordDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ConsentRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConsentRecordUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ConsentRecords
     * const consentRecord = await prisma.consentRecord.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConsentRecordUpdateManyArgs>(args: SelectSubset<T, ConsentRecordUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ConsentRecords and returns the data updated in the database.
     * @param {ConsentRecordUpdateManyAndReturnArgs} args - Arguments to update many ConsentRecords.
     * @example
     * // Update many ConsentRecords
     * const consentRecord = await prisma.consentRecord.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ConsentRecords and only return the `consentId`
     * const consentRecordWithConsentIdOnly = await prisma.consentRecord.updateManyAndReturn({
     *   select: { consentId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ConsentRecordUpdateManyAndReturnArgs>(args: SelectSubset<T, ConsentRecordUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ConsentRecord.
     * @param {ConsentRecordUpsertArgs} args - Arguments to update or create a ConsentRecord.
     * @example
     * // Update or create a ConsentRecord
     * const consentRecord = await prisma.consentRecord.upsert({
     *   create: {
     *     // ... data to create a ConsentRecord
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ConsentRecord we want to update
     *   }
     * })
     */
    upsert<T extends ConsentRecordUpsertArgs>(args: SelectSubset<T, ConsentRecordUpsertArgs<ExtArgs>>): Prisma__ConsentRecordClient<$Result.GetResult<Prisma.$ConsentRecordPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ConsentRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConsentRecordCountArgs} args - Arguments to filter ConsentRecords to count.
     * @example
     * // Count the number of ConsentRecords
     * const count = await prisma.consentRecord.count({
     *   where: {
     *     // ... the filter for the ConsentRecords we want to count
     *   }
     * })
    **/
    count<T extends ConsentRecordCountArgs>(
      args?: Subset<T, ConsentRecordCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConsentRecordCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ConsentRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConsentRecordAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConsentRecordAggregateArgs>(args: Subset<T, ConsentRecordAggregateArgs>): Prisma.PrismaPromise<GetConsentRecordAggregateType<T>>

    /**
     * Group by ConsentRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConsentRecordGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConsentRecordGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConsentRecordGroupByArgs['orderBy'] }
        : { orderBy?: ConsentRecordGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConsentRecordGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConsentRecordGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ConsentRecord model
   */
  readonly fields: ConsentRecordFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ConsentRecord.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConsentRecordClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    workspace<T extends WorkspaceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WorkspaceDefaultArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ConsentRecord model
   */
  interface ConsentRecordFieldRefs {
    readonly consentId: FieldRef<"ConsentRecord", 'String'>
    readonly workspaceId: FieldRef<"ConsentRecord", 'String'>
    readonly consentType: FieldRef<"ConsentRecord", 'String'>
    readonly grantedBy: FieldRef<"ConsentRecord", 'String'>
    readonly grantedAt: FieldRef<"ConsentRecord", 'DateTime'>
    readonly expiresAt: FieldRef<"ConsentRecord", 'DateTime'>
    readonly documentRef: FieldRef<"ConsentRecord", 'String'>
    readonly verifierSignature: FieldRef<"ConsentRecord", 'String'>
    readonly createdAt: FieldRef<"ConsentRecord", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ConsentRecord findUnique
   */
  export type ConsentRecordFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
    /**
     * Filter, which ConsentRecord to fetch.
     */
    where: ConsentRecordWhereUniqueInput
  }

  /**
   * ConsentRecord findUniqueOrThrow
   */
  export type ConsentRecordFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
    /**
     * Filter, which ConsentRecord to fetch.
     */
    where: ConsentRecordWhereUniqueInput
  }

  /**
   * ConsentRecord findFirst
   */
  export type ConsentRecordFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
    /**
     * Filter, which ConsentRecord to fetch.
     */
    where?: ConsentRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConsentRecords to fetch.
     */
    orderBy?: ConsentRecordOrderByWithRelationInput | ConsentRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConsentRecords.
     */
    cursor?: ConsentRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConsentRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConsentRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConsentRecords.
     */
    distinct?: ConsentRecordScalarFieldEnum | ConsentRecordScalarFieldEnum[]
  }

  /**
   * ConsentRecord findFirstOrThrow
   */
  export type ConsentRecordFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
    /**
     * Filter, which ConsentRecord to fetch.
     */
    where?: ConsentRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConsentRecords to fetch.
     */
    orderBy?: ConsentRecordOrderByWithRelationInput | ConsentRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConsentRecords.
     */
    cursor?: ConsentRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConsentRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConsentRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConsentRecords.
     */
    distinct?: ConsentRecordScalarFieldEnum | ConsentRecordScalarFieldEnum[]
  }

  /**
   * ConsentRecord findMany
   */
  export type ConsentRecordFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
    /**
     * Filter, which ConsentRecords to fetch.
     */
    where?: ConsentRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConsentRecords to fetch.
     */
    orderBy?: ConsentRecordOrderByWithRelationInput | ConsentRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ConsentRecords.
     */
    cursor?: ConsentRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConsentRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConsentRecords.
     */
    skip?: number
    distinct?: ConsentRecordScalarFieldEnum | ConsentRecordScalarFieldEnum[]
  }

  /**
   * ConsentRecord create
   */
  export type ConsentRecordCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
    /**
     * The data needed to create a ConsentRecord.
     */
    data: XOR<ConsentRecordCreateInput, ConsentRecordUncheckedCreateInput>
  }

  /**
   * ConsentRecord createMany
   */
  export type ConsentRecordCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ConsentRecords.
     */
    data: ConsentRecordCreateManyInput | ConsentRecordCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ConsentRecord createManyAndReturn
   */
  export type ConsentRecordCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * The data used to create many ConsentRecords.
     */
    data: ConsentRecordCreateManyInput | ConsentRecordCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ConsentRecord update
   */
  export type ConsentRecordUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
    /**
     * The data needed to update a ConsentRecord.
     */
    data: XOR<ConsentRecordUpdateInput, ConsentRecordUncheckedUpdateInput>
    /**
     * Choose, which ConsentRecord to update.
     */
    where: ConsentRecordWhereUniqueInput
  }

  /**
   * ConsentRecord updateMany
   */
  export type ConsentRecordUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ConsentRecords.
     */
    data: XOR<ConsentRecordUpdateManyMutationInput, ConsentRecordUncheckedUpdateManyInput>
    /**
     * Filter which ConsentRecords to update
     */
    where?: ConsentRecordWhereInput
    /**
     * Limit how many ConsentRecords to update.
     */
    limit?: number
  }

  /**
   * ConsentRecord updateManyAndReturn
   */
  export type ConsentRecordUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * The data used to update ConsentRecords.
     */
    data: XOR<ConsentRecordUpdateManyMutationInput, ConsentRecordUncheckedUpdateManyInput>
    /**
     * Filter which ConsentRecords to update
     */
    where?: ConsentRecordWhereInput
    /**
     * Limit how many ConsentRecords to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ConsentRecord upsert
   */
  export type ConsentRecordUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
    /**
     * The filter to search for the ConsentRecord to update in case it exists.
     */
    where: ConsentRecordWhereUniqueInput
    /**
     * In case the ConsentRecord found by the `where` argument doesn't exist, create a new ConsentRecord with this data.
     */
    create: XOR<ConsentRecordCreateInput, ConsentRecordUncheckedCreateInput>
    /**
     * In case the ConsentRecord was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConsentRecordUpdateInput, ConsentRecordUncheckedUpdateInput>
  }

  /**
   * ConsentRecord delete
   */
  export type ConsentRecordDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
    /**
     * Filter which ConsentRecord to delete.
     */
    where: ConsentRecordWhereUniqueInput
  }

  /**
   * ConsentRecord deleteMany
   */
  export type ConsentRecordDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConsentRecords to delete
     */
    where?: ConsentRecordWhereInput
    /**
     * Limit how many ConsentRecords to delete.
     */
    limit?: number
  }

  /**
   * ConsentRecord without action
   */
  export type ConsentRecordDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConsentRecord
     */
    select?: ConsentRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConsentRecord
     */
    omit?: ConsentRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConsentRecordInclude<ExtArgs> | null
  }


  /**
   * Model BrandTwin
   */

  export type AggregateBrandTwin = {
    _count: BrandTwinCountAggregateOutputType | null
    _avg: BrandTwinAvgAggregateOutputType | null
    _sum: BrandTwinSumAggregateOutputType | null
    _min: BrandTwinMinAggregateOutputType | null
    _max: BrandTwinMaxAggregateOutputType | null
  }

  export type BrandTwinAvgAggregateOutputType = {
    qualityScore: Decimal | null
  }

  export type BrandTwinSumAggregateOutputType = {
    qualityScore: Decimal | null
  }

  export type BrandTwinMinAggregateOutputType = {
    brandId: string | null
    workspaceId: string | null
    snapshotAt: Date | null
    qualityScore: Decimal | null
    createdAt: Date | null
  }

  export type BrandTwinMaxAggregateOutputType = {
    brandId: string | null
    workspaceId: string | null
    snapshotAt: Date | null
    qualityScore: Decimal | null
    createdAt: Date | null
  }

  export type BrandTwinCountAggregateOutputType = {
    brandId: number
    workspaceId: number
    snapshotAt: number
    brandData: number
    qualityScore: number
    createdAt: number
    _all: number
  }


  export type BrandTwinAvgAggregateInputType = {
    qualityScore?: true
  }

  export type BrandTwinSumAggregateInputType = {
    qualityScore?: true
  }

  export type BrandTwinMinAggregateInputType = {
    brandId?: true
    workspaceId?: true
    snapshotAt?: true
    qualityScore?: true
    createdAt?: true
  }

  export type BrandTwinMaxAggregateInputType = {
    brandId?: true
    workspaceId?: true
    snapshotAt?: true
    qualityScore?: true
    createdAt?: true
  }

  export type BrandTwinCountAggregateInputType = {
    brandId?: true
    workspaceId?: true
    snapshotAt?: true
    brandData?: true
    qualityScore?: true
    createdAt?: true
    _all?: true
  }

  export type BrandTwinAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BrandTwin to aggregate.
     */
    where?: BrandTwinWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BrandTwins to fetch.
     */
    orderBy?: BrandTwinOrderByWithRelationInput | BrandTwinOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BrandTwinWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BrandTwins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BrandTwins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BrandTwins
    **/
    _count?: true | BrandTwinCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BrandTwinAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BrandTwinSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BrandTwinMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BrandTwinMaxAggregateInputType
  }

  export type GetBrandTwinAggregateType<T extends BrandTwinAggregateArgs> = {
        [P in keyof T & keyof AggregateBrandTwin]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBrandTwin[P]>
      : GetScalarType<T[P], AggregateBrandTwin[P]>
  }




  export type BrandTwinGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BrandTwinWhereInput
    orderBy?: BrandTwinOrderByWithAggregationInput | BrandTwinOrderByWithAggregationInput[]
    by: BrandTwinScalarFieldEnum[] | BrandTwinScalarFieldEnum
    having?: BrandTwinScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BrandTwinCountAggregateInputType | true
    _avg?: BrandTwinAvgAggregateInputType
    _sum?: BrandTwinSumAggregateInputType
    _min?: BrandTwinMinAggregateInputType
    _max?: BrandTwinMaxAggregateInputType
  }

  export type BrandTwinGroupByOutputType = {
    brandId: string
    workspaceId: string
    snapshotAt: Date
    brandData: JsonValue
    qualityScore: Decimal | null
    createdAt: Date
    _count: BrandTwinCountAggregateOutputType | null
    _avg: BrandTwinAvgAggregateOutputType | null
    _sum: BrandTwinSumAggregateOutputType | null
    _min: BrandTwinMinAggregateOutputType | null
    _max: BrandTwinMaxAggregateOutputType | null
  }

  type GetBrandTwinGroupByPayload<T extends BrandTwinGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BrandTwinGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BrandTwinGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BrandTwinGroupByOutputType[P]>
            : GetScalarType<T[P], BrandTwinGroupByOutputType[P]>
        }
      >
    >


  export type BrandTwinSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    brandId?: boolean
    workspaceId?: boolean
    snapshotAt?: boolean
    brandData?: boolean
    qualityScore?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["brandTwin"]>

  export type BrandTwinSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    brandId?: boolean
    workspaceId?: boolean
    snapshotAt?: boolean
    brandData?: boolean
    qualityScore?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["brandTwin"]>

  export type BrandTwinSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    brandId?: boolean
    workspaceId?: boolean
    snapshotAt?: boolean
    brandData?: boolean
    qualityScore?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["brandTwin"]>

  export type BrandTwinSelectScalar = {
    brandId?: boolean
    workspaceId?: boolean
    snapshotAt?: boolean
    brandData?: boolean
    qualityScore?: boolean
    createdAt?: boolean
  }

  export type BrandTwinOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"brandId" | "workspaceId" | "snapshotAt" | "brandData" | "qualityScore" | "createdAt", ExtArgs["result"]["brandTwin"]>
  export type BrandTwinInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type BrandTwinIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type BrandTwinIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }

  export type $BrandTwinPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "BrandTwin"
    objects: {
      workspace: Prisma.$WorkspacePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      brandId: string
      workspaceId: string
      snapshotAt: Date
      brandData: Prisma.JsonValue
      qualityScore: Prisma.Decimal | null
      createdAt: Date
    }, ExtArgs["result"]["brandTwin"]>
    composites: {}
  }

  type BrandTwinGetPayload<S extends boolean | null | undefined | BrandTwinDefaultArgs> = $Result.GetResult<Prisma.$BrandTwinPayload, S>

  type BrandTwinCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BrandTwinFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BrandTwinCountAggregateInputType | true
    }

  export interface BrandTwinDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BrandTwin'], meta: { name: 'BrandTwin' } }
    /**
     * Find zero or one BrandTwin that matches the filter.
     * @param {BrandTwinFindUniqueArgs} args - Arguments to find a BrandTwin
     * @example
     * // Get one BrandTwin
     * const brandTwin = await prisma.brandTwin.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BrandTwinFindUniqueArgs>(args: SelectSubset<T, BrandTwinFindUniqueArgs<ExtArgs>>): Prisma__BrandTwinClient<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one BrandTwin that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BrandTwinFindUniqueOrThrowArgs} args - Arguments to find a BrandTwin
     * @example
     * // Get one BrandTwin
     * const brandTwin = await prisma.brandTwin.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BrandTwinFindUniqueOrThrowArgs>(args: SelectSubset<T, BrandTwinFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BrandTwinClient<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BrandTwin that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BrandTwinFindFirstArgs} args - Arguments to find a BrandTwin
     * @example
     * // Get one BrandTwin
     * const brandTwin = await prisma.brandTwin.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BrandTwinFindFirstArgs>(args?: SelectSubset<T, BrandTwinFindFirstArgs<ExtArgs>>): Prisma__BrandTwinClient<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BrandTwin that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BrandTwinFindFirstOrThrowArgs} args - Arguments to find a BrandTwin
     * @example
     * // Get one BrandTwin
     * const brandTwin = await prisma.brandTwin.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BrandTwinFindFirstOrThrowArgs>(args?: SelectSubset<T, BrandTwinFindFirstOrThrowArgs<ExtArgs>>): Prisma__BrandTwinClient<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more BrandTwins that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BrandTwinFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BrandTwins
     * const brandTwins = await prisma.brandTwin.findMany()
     * 
     * // Get first 10 BrandTwins
     * const brandTwins = await prisma.brandTwin.findMany({ take: 10 })
     * 
     * // Only select the `brandId`
     * const brandTwinWithBrandIdOnly = await prisma.brandTwin.findMany({ select: { brandId: true } })
     * 
     */
    findMany<T extends BrandTwinFindManyArgs>(args?: SelectSubset<T, BrandTwinFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a BrandTwin.
     * @param {BrandTwinCreateArgs} args - Arguments to create a BrandTwin.
     * @example
     * // Create one BrandTwin
     * const BrandTwin = await prisma.brandTwin.create({
     *   data: {
     *     // ... data to create a BrandTwin
     *   }
     * })
     * 
     */
    create<T extends BrandTwinCreateArgs>(args: SelectSubset<T, BrandTwinCreateArgs<ExtArgs>>): Prisma__BrandTwinClient<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many BrandTwins.
     * @param {BrandTwinCreateManyArgs} args - Arguments to create many BrandTwins.
     * @example
     * // Create many BrandTwins
     * const brandTwin = await prisma.brandTwin.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BrandTwinCreateManyArgs>(args?: SelectSubset<T, BrandTwinCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many BrandTwins and returns the data saved in the database.
     * @param {BrandTwinCreateManyAndReturnArgs} args - Arguments to create many BrandTwins.
     * @example
     * // Create many BrandTwins
     * const brandTwin = await prisma.brandTwin.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many BrandTwins and only return the `brandId`
     * const brandTwinWithBrandIdOnly = await prisma.brandTwin.createManyAndReturn({
     *   select: { brandId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BrandTwinCreateManyAndReturnArgs>(args?: SelectSubset<T, BrandTwinCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a BrandTwin.
     * @param {BrandTwinDeleteArgs} args - Arguments to delete one BrandTwin.
     * @example
     * // Delete one BrandTwin
     * const BrandTwin = await prisma.brandTwin.delete({
     *   where: {
     *     // ... filter to delete one BrandTwin
     *   }
     * })
     * 
     */
    delete<T extends BrandTwinDeleteArgs>(args: SelectSubset<T, BrandTwinDeleteArgs<ExtArgs>>): Prisma__BrandTwinClient<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one BrandTwin.
     * @param {BrandTwinUpdateArgs} args - Arguments to update one BrandTwin.
     * @example
     * // Update one BrandTwin
     * const brandTwin = await prisma.brandTwin.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BrandTwinUpdateArgs>(args: SelectSubset<T, BrandTwinUpdateArgs<ExtArgs>>): Prisma__BrandTwinClient<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more BrandTwins.
     * @param {BrandTwinDeleteManyArgs} args - Arguments to filter BrandTwins to delete.
     * @example
     * // Delete a few BrandTwins
     * const { count } = await prisma.brandTwin.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BrandTwinDeleteManyArgs>(args?: SelectSubset<T, BrandTwinDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BrandTwins.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BrandTwinUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BrandTwins
     * const brandTwin = await prisma.brandTwin.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BrandTwinUpdateManyArgs>(args: SelectSubset<T, BrandTwinUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BrandTwins and returns the data updated in the database.
     * @param {BrandTwinUpdateManyAndReturnArgs} args - Arguments to update many BrandTwins.
     * @example
     * // Update many BrandTwins
     * const brandTwin = await prisma.brandTwin.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more BrandTwins and only return the `brandId`
     * const brandTwinWithBrandIdOnly = await prisma.brandTwin.updateManyAndReturn({
     *   select: { brandId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BrandTwinUpdateManyAndReturnArgs>(args: SelectSubset<T, BrandTwinUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one BrandTwin.
     * @param {BrandTwinUpsertArgs} args - Arguments to update or create a BrandTwin.
     * @example
     * // Update or create a BrandTwin
     * const brandTwin = await prisma.brandTwin.upsert({
     *   create: {
     *     // ... data to create a BrandTwin
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BrandTwin we want to update
     *   }
     * })
     */
    upsert<T extends BrandTwinUpsertArgs>(args: SelectSubset<T, BrandTwinUpsertArgs<ExtArgs>>): Prisma__BrandTwinClient<$Result.GetResult<Prisma.$BrandTwinPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of BrandTwins.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BrandTwinCountArgs} args - Arguments to filter BrandTwins to count.
     * @example
     * // Count the number of BrandTwins
     * const count = await prisma.brandTwin.count({
     *   where: {
     *     // ... the filter for the BrandTwins we want to count
     *   }
     * })
    **/
    count<T extends BrandTwinCountArgs>(
      args?: Subset<T, BrandTwinCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BrandTwinCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BrandTwin.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BrandTwinAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BrandTwinAggregateArgs>(args: Subset<T, BrandTwinAggregateArgs>): Prisma.PrismaPromise<GetBrandTwinAggregateType<T>>

    /**
     * Group by BrandTwin.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BrandTwinGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BrandTwinGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BrandTwinGroupByArgs['orderBy'] }
        : { orderBy?: BrandTwinGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BrandTwinGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBrandTwinGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BrandTwin model
   */
  readonly fields: BrandTwinFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BrandTwin.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BrandTwinClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    workspace<T extends WorkspaceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WorkspaceDefaultArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the BrandTwin model
   */
  interface BrandTwinFieldRefs {
    readonly brandId: FieldRef<"BrandTwin", 'String'>
    readonly workspaceId: FieldRef<"BrandTwin", 'String'>
    readonly snapshotAt: FieldRef<"BrandTwin", 'DateTime'>
    readonly brandData: FieldRef<"BrandTwin", 'Json'>
    readonly qualityScore: FieldRef<"BrandTwin", 'Decimal'>
    readonly createdAt: FieldRef<"BrandTwin", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * BrandTwin findUnique
   */
  export type BrandTwinFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
    /**
     * Filter, which BrandTwin to fetch.
     */
    where: BrandTwinWhereUniqueInput
  }

  /**
   * BrandTwin findUniqueOrThrow
   */
  export type BrandTwinFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
    /**
     * Filter, which BrandTwin to fetch.
     */
    where: BrandTwinWhereUniqueInput
  }

  /**
   * BrandTwin findFirst
   */
  export type BrandTwinFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
    /**
     * Filter, which BrandTwin to fetch.
     */
    where?: BrandTwinWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BrandTwins to fetch.
     */
    orderBy?: BrandTwinOrderByWithRelationInput | BrandTwinOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BrandTwins.
     */
    cursor?: BrandTwinWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BrandTwins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BrandTwins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BrandTwins.
     */
    distinct?: BrandTwinScalarFieldEnum | BrandTwinScalarFieldEnum[]
  }

  /**
   * BrandTwin findFirstOrThrow
   */
  export type BrandTwinFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
    /**
     * Filter, which BrandTwin to fetch.
     */
    where?: BrandTwinWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BrandTwins to fetch.
     */
    orderBy?: BrandTwinOrderByWithRelationInput | BrandTwinOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BrandTwins.
     */
    cursor?: BrandTwinWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BrandTwins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BrandTwins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BrandTwins.
     */
    distinct?: BrandTwinScalarFieldEnum | BrandTwinScalarFieldEnum[]
  }

  /**
   * BrandTwin findMany
   */
  export type BrandTwinFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
    /**
     * Filter, which BrandTwins to fetch.
     */
    where?: BrandTwinWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BrandTwins to fetch.
     */
    orderBy?: BrandTwinOrderByWithRelationInput | BrandTwinOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BrandTwins.
     */
    cursor?: BrandTwinWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BrandTwins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BrandTwins.
     */
    skip?: number
    distinct?: BrandTwinScalarFieldEnum | BrandTwinScalarFieldEnum[]
  }

  /**
   * BrandTwin create
   */
  export type BrandTwinCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
    /**
     * The data needed to create a BrandTwin.
     */
    data: XOR<BrandTwinCreateInput, BrandTwinUncheckedCreateInput>
  }

  /**
   * BrandTwin createMany
   */
  export type BrandTwinCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many BrandTwins.
     */
    data: BrandTwinCreateManyInput | BrandTwinCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BrandTwin createManyAndReturn
   */
  export type BrandTwinCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * The data used to create many BrandTwins.
     */
    data: BrandTwinCreateManyInput | BrandTwinCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * BrandTwin update
   */
  export type BrandTwinUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
    /**
     * The data needed to update a BrandTwin.
     */
    data: XOR<BrandTwinUpdateInput, BrandTwinUncheckedUpdateInput>
    /**
     * Choose, which BrandTwin to update.
     */
    where: BrandTwinWhereUniqueInput
  }

  /**
   * BrandTwin updateMany
   */
  export type BrandTwinUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BrandTwins.
     */
    data: XOR<BrandTwinUpdateManyMutationInput, BrandTwinUncheckedUpdateManyInput>
    /**
     * Filter which BrandTwins to update
     */
    where?: BrandTwinWhereInput
    /**
     * Limit how many BrandTwins to update.
     */
    limit?: number
  }

  /**
   * BrandTwin updateManyAndReturn
   */
  export type BrandTwinUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * The data used to update BrandTwins.
     */
    data: XOR<BrandTwinUpdateManyMutationInput, BrandTwinUncheckedUpdateManyInput>
    /**
     * Filter which BrandTwins to update
     */
    where?: BrandTwinWhereInput
    /**
     * Limit how many BrandTwins to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * BrandTwin upsert
   */
  export type BrandTwinUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
    /**
     * The filter to search for the BrandTwin to update in case it exists.
     */
    where: BrandTwinWhereUniqueInput
    /**
     * In case the BrandTwin found by the `where` argument doesn't exist, create a new BrandTwin with this data.
     */
    create: XOR<BrandTwinCreateInput, BrandTwinUncheckedCreateInput>
    /**
     * In case the BrandTwin was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BrandTwinUpdateInput, BrandTwinUncheckedUpdateInput>
  }

  /**
   * BrandTwin delete
   */
  export type BrandTwinDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
    /**
     * Filter which BrandTwin to delete.
     */
    where: BrandTwinWhereUniqueInput
  }

  /**
   * BrandTwin deleteMany
   */
  export type BrandTwinDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BrandTwins to delete
     */
    where?: BrandTwinWhereInput
    /**
     * Limit how many BrandTwins to delete.
     */
    limit?: number
  }

  /**
   * BrandTwin without action
   */
  export type BrandTwinDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BrandTwin
     */
    select?: BrandTwinSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BrandTwin
     */
    omit?: BrandTwinOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BrandTwinInclude<ExtArgs> | null
  }


  /**
   * Model DecisionCard
   */

  export type AggregateDecisionCard = {
    _count: DecisionCardCountAggregateOutputType | null
    _avg: DecisionCardAvgAggregateOutputType | null
    _sum: DecisionCardSumAggregateOutputType | null
    _min: DecisionCardMinAggregateOutputType | null
    _max: DecisionCardMaxAggregateOutputType | null
  }

  export type DecisionCardAvgAggregateOutputType = {
    readinessScore: Decimal | null
  }

  export type DecisionCardSumAggregateOutputType = {
    readinessScore: Decimal | null
  }

  export type DecisionCardMinAggregateOutputType = {
    actionId: string | null
    workspaceId: string | null
    title: string | null
    oneLine: string | null
    readinessScore: Decimal | null
    expiresAt: Date | null
    status: string | null
    approvedBy: string | null
    approvedAt: Date | null
    createdAt: Date | null
  }

  export type DecisionCardMaxAggregateOutputType = {
    actionId: string | null
    workspaceId: string | null
    title: string | null
    oneLine: string | null
    readinessScore: Decimal | null
    expiresAt: Date | null
    status: string | null
    approvedBy: string | null
    approvedAt: Date | null
    createdAt: Date | null
  }

  export type DecisionCardCountAggregateOutputType = {
    actionId: number
    workspaceId: number
    title: number
    oneLine: number
    readinessScore: number
    expiresAt: number
    status: number
    approvedBy: number
    approvedAt: number
    cardData: number
    createdAt: number
    _all: number
  }


  export type DecisionCardAvgAggregateInputType = {
    readinessScore?: true
  }

  export type DecisionCardSumAggregateInputType = {
    readinessScore?: true
  }

  export type DecisionCardMinAggregateInputType = {
    actionId?: true
    workspaceId?: true
    title?: true
    oneLine?: true
    readinessScore?: true
    expiresAt?: true
    status?: true
    approvedBy?: true
    approvedAt?: true
    createdAt?: true
  }

  export type DecisionCardMaxAggregateInputType = {
    actionId?: true
    workspaceId?: true
    title?: true
    oneLine?: true
    readinessScore?: true
    expiresAt?: true
    status?: true
    approvedBy?: true
    approvedAt?: true
    createdAt?: true
  }

  export type DecisionCardCountAggregateInputType = {
    actionId?: true
    workspaceId?: true
    title?: true
    oneLine?: true
    readinessScore?: true
    expiresAt?: true
    status?: true
    approvedBy?: true
    approvedAt?: true
    cardData?: true
    createdAt?: true
    _all?: true
  }

  export type DecisionCardAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DecisionCard to aggregate.
     */
    where?: DecisionCardWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DecisionCards to fetch.
     */
    orderBy?: DecisionCardOrderByWithRelationInput | DecisionCardOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DecisionCardWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DecisionCards from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DecisionCards.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DecisionCards
    **/
    _count?: true | DecisionCardCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DecisionCardAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DecisionCardSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DecisionCardMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DecisionCardMaxAggregateInputType
  }

  export type GetDecisionCardAggregateType<T extends DecisionCardAggregateArgs> = {
        [P in keyof T & keyof AggregateDecisionCard]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDecisionCard[P]>
      : GetScalarType<T[P], AggregateDecisionCard[P]>
  }




  export type DecisionCardGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DecisionCardWhereInput
    orderBy?: DecisionCardOrderByWithAggregationInput | DecisionCardOrderByWithAggregationInput[]
    by: DecisionCardScalarFieldEnum[] | DecisionCardScalarFieldEnum
    having?: DecisionCardScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DecisionCardCountAggregateInputType | true
    _avg?: DecisionCardAvgAggregateInputType
    _sum?: DecisionCardSumAggregateInputType
    _min?: DecisionCardMinAggregateInputType
    _max?: DecisionCardMaxAggregateInputType
  }

  export type DecisionCardGroupByOutputType = {
    actionId: string
    workspaceId: string
    title: string
    oneLine: string
    readinessScore: Decimal
    expiresAt: Date
    status: string
    approvedBy: string | null
    approvedAt: Date | null
    cardData: JsonValue
    createdAt: Date
    _count: DecisionCardCountAggregateOutputType | null
    _avg: DecisionCardAvgAggregateOutputType | null
    _sum: DecisionCardSumAggregateOutputType | null
    _min: DecisionCardMinAggregateOutputType | null
    _max: DecisionCardMaxAggregateOutputType | null
  }

  type GetDecisionCardGroupByPayload<T extends DecisionCardGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DecisionCardGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DecisionCardGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DecisionCardGroupByOutputType[P]>
            : GetScalarType<T[P], DecisionCardGroupByOutputType[P]>
        }
      >
    >


  export type DecisionCardSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    actionId?: boolean
    workspaceId?: boolean
    title?: boolean
    oneLine?: boolean
    readinessScore?: boolean
    expiresAt?: boolean
    status?: boolean
    approvedBy?: boolean
    approvedAt?: boolean
    cardData?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["decisionCard"]>

  export type DecisionCardSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    actionId?: boolean
    workspaceId?: boolean
    title?: boolean
    oneLine?: boolean
    readinessScore?: boolean
    expiresAt?: boolean
    status?: boolean
    approvedBy?: boolean
    approvedAt?: boolean
    cardData?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["decisionCard"]>

  export type DecisionCardSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    actionId?: boolean
    workspaceId?: boolean
    title?: boolean
    oneLine?: boolean
    readinessScore?: boolean
    expiresAt?: boolean
    status?: boolean
    approvedBy?: boolean
    approvedAt?: boolean
    cardData?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["decisionCard"]>

  export type DecisionCardSelectScalar = {
    actionId?: boolean
    workspaceId?: boolean
    title?: boolean
    oneLine?: boolean
    readinessScore?: boolean
    expiresAt?: boolean
    status?: boolean
    approvedBy?: boolean
    approvedAt?: boolean
    cardData?: boolean
    createdAt?: boolean
  }

  export type DecisionCardOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"actionId" | "workspaceId" | "title" | "oneLine" | "readinessScore" | "expiresAt" | "status" | "approvedBy" | "approvedAt" | "cardData" | "createdAt", ExtArgs["result"]["decisionCard"]>
  export type DecisionCardInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type DecisionCardIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type DecisionCardIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }

  export type $DecisionCardPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DecisionCard"
    objects: {
      workspace: Prisma.$WorkspacePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      actionId: string
      workspaceId: string
      title: string
      oneLine: string
      readinessScore: Prisma.Decimal
      expiresAt: Date
      status: string
      approvedBy: string | null
      approvedAt: Date | null
      cardData: Prisma.JsonValue
      createdAt: Date
    }, ExtArgs["result"]["decisionCard"]>
    composites: {}
  }

  type DecisionCardGetPayload<S extends boolean | null | undefined | DecisionCardDefaultArgs> = $Result.GetResult<Prisma.$DecisionCardPayload, S>

  type DecisionCardCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DecisionCardFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DecisionCardCountAggregateInputType | true
    }

  export interface DecisionCardDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DecisionCard'], meta: { name: 'DecisionCard' } }
    /**
     * Find zero or one DecisionCard that matches the filter.
     * @param {DecisionCardFindUniqueArgs} args - Arguments to find a DecisionCard
     * @example
     * // Get one DecisionCard
     * const decisionCard = await prisma.decisionCard.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DecisionCardFindUniqueArgs>(args: SelectSubset<T, DecisionCardFindUniqueArgs<ExtArgs>>): Prisma__DecisionCardClient<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one DecisionCard that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DecisionCardFindUniqueOrThrowArgs} args - Arguments to find a DecisionCard
     * @example
     * // Get one DecisionCard
     * const decisionCard = await prisma.decisionCard.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DecisionCardFindUniqueOrThrowArgs>(args: SelectSubset<T, DecisionCardFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DecisionCardClient<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DecisionCard that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionCardFindFirstArgs} args - Arguments to find a DecisionCard
     * @example
     * // Get one DecisionCard
     * const decisionCard = await prisma.decisionCard.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DecisionCardFindFirstArgs>(args?: SelectSubset<T, DecisionCardFindFirstArgs<ExtArgs>>): Prisma__DecisionCardClient<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DecisionCard that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionCardFindFirstOrThrowArgs} args - Arguments to find a DecisionCard
     * @example
     * // Get one DecisionCard
     * const decisionCard = await prisma.decisionCard.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DecisionCardFindFirstOrThrowArgs>(args?: SelectSubset<T, DecisionCardFindFirstOrThrowArgs<ExtArgs>>): Prisma__DecisionCardClient<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more DecisionCards that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionCardFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DecisionCards
     * const decisionCards = await prisma.decisionCard.findMany()
     * 
     * // Get first 10 DecisionCards
     * const decisionCards = await prisma.decisionCard.findMany({ take: 10 })
     * 
     * // Only select the `actionId`
     * const decisionCardWithActionIdOnly = await prisma.decisionCard.findMany({ select: { actionId: true } })
     * 
     */
    findMany<T extends DecisionCardFindManyArgs>(args?: SelectSubset<T, DecisionCardFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a DecisionCard.
     * @param {DecisionCardCreateArgs} args - Arguments to create a DecisionCard.
     * @example
     * // Create one DecisionCard
     * const DecisionCard = await prisma.decisionCard.create({
     *   data: {
     *     // ... data to create a DecisionCard
     *   }
     * })
     * 
     */
    create<T extends DecisionCardCreateArgs>(args: SelectSubset<T, DecisionCardCreateArgs<ExtArgs>>): Prisma__DecisionCardClient<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many DecisionCards.
     * @param {DecisionCardCreateManyArgs} args - Arguments to create many DecisionCards.
     * @example
     * // Create many DecisionCards
     * const decisionCard = await prisma.decisionCard.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DecisionCardCreateManyArgs>(args?: SelectSubset<T, DecisionCardCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many DecisionCards and returns the data saved in the database.
     * @param {DecisionCardCreateManyAndReturnArgs} args - Arguments to create many DecisionCards.
     * @example
     * // Create many DecisionCards
     * const decisionCard = await prisma.decisionCard.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many DecisionCards and only return the `actionId`
     * const decisionCardWithActionIdOnly = await prisma.decisionCard.createManyAndReturn({
     *   select: { actionId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DecisionCardCreateManyAndReturnArgs>(args?: SelectSubset<T, DecisionCardCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a DecisionCard.
     * @param {DecisionCardDeleteArgs} args - Arguments to delete one DecisionCard.
     * @example
     * // Delete one DecisionCard
     * const DecisionCard = await prisma.decisionCard.delete({
     *   where: {
     *     // ... filter to delete one DecisionCard
     *   }
     * })
     * 
     */
    delete<T extends DecisionCardDeleteArgs>(args: SelectSubset<T, DecisionCardDeleteArgs<ExtArgs>>): Prisma__DecisionCardClient<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one DecisionCard.
     * @param {DecisionCardUpdateArgs} args - Arguments to update one DecisionCard.
     * @example
     * // Update one DecisionCard
     * const decisionCard = await prisma.decisionCard.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DecisionCardUpdateArgs>(args: SelectSubset<T, DecisionCardUpdateArgs<ExtArgs>>): Prisma__DecisionCardClient<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more DecisionCards.
     * @param {DecisionCardDeleteManyArgs} args - Arguments to filter DecisionCards to delete.
     * @example
     * // Delete a few DecisionCards
     * const { count } = await prisma.decisionCard.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DecisionCardDeleteManyArgs>(args?: SelectSubset<T, DecisionCardDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DecisionCards.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionCardUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DecisionCards
     * const decisionCard = await prisma.decisionCard.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DecisionCardUpdateManyArgs>(args: SelectSubset<T, DecisionCardUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DecisionCards and returns the data updated in the database.
     * @param {DecisionCardUpdateManyAndReturnArgs} args - Arguments to update many DecisionCards.
     * @example
     * // Update many DecisionCards
     * const decisionCard = await prisma.decisionCard.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more DecisionCards and only return the `actionId`
     * const decisionCardWithActionIdOnly = await prisma.decisionCard.updateManyAndReturn({
     *   select: { actionId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DecisionCardUpdateManyAndReturnArgs>(args: SelectSubset<T, DecisionCardUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one DecisionCard.
     * @param {DecisionCardUpsertArgs} args - Arguments to update or create a DecisionCard.
     * @example
     * // Update or create a DecisionCard
     * const decisionCard = await prisma.decisionCard.upsert({
     *   create: {
     *     // ... data to create a DecisionCard
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DecisionCard we want to update
     *   }
     * })
     */
    upsert<T extends DecisionCardUpsertArgs>(args: SelectSubset<T, DecisionCardUpsertArgs<ExtArgs>>): Prisma__DecisionCardClient<$Result.GetResult<Prisma.$DecisionCardPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of DecisionCards.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionCardCountArgs} args - Arguments to filter DecisionCards to count.
     * @example
     * // Count the number of DecisionCards
     * const count = await prisma.decisionCard.count({
     *   where: {
     *     // ... the filter for the DecisionCards we want to count
     *   }
     * })
    **/
    count<T extends DecisionCardCountArgs>(
      args?: Subset<T, DecisionCardCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DecisionCardCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DecisionCard.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionCardAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DecisionCardAggregateArgs>(args: Subset<T, DecisionCardAggregateArgs>): Prisma.PrismaPromise<GetDecisionCardAggregateType<T>>

    /**
     * Group by DecisionCard.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionCardGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DecisionCardGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DecisionCardGroupByArgs['orderBy'] }
        : { orderBy?: DecisionCardGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DecisionCardGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDecisionCardGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DecisionCard model
   */
  readonly fields: DecisionCardFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DecisionCard.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DecisionCardClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    workspace<T extends WorkspaceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WorkspaceDefaultArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the DecisionCard model
   */
  interface DecisionCardFieldRefs {
    readonly actionId: FieldRef<"DecisionCard", 'String'>
    readonly workspaceId: FieldRef<"DecisionCard", 'String'>
    readonly title: FieldRef<"DecisionCard", 'String'>
    readonly oneLine: FieldRef<"DecisionCard", 'String'>
    readonly readinessScore: FieldRef<"DecisionCard", 'Decimal'>
    readonly expiresAt: FieldRef<"DecisionCard", 'DateTime'>
    readonly status: FieldRef<"DecisionCard", 'String'>
    readonly approvedBy: FieldRef<"DecisionCard", 'String'>
    readonly approvedAt: FieldRef<"DecisionCard", 'DateTime'>
    readonly cardData: FieldRef<"DecisionCard", 'Json'>
    readonly createdAt: FieldRef<"DecisionCard", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * DecisionCard findUnique
   */
  export type DecisionCardFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
    /**
     * Filter, which DecisionCard to fetch.
     */
    where: DecisionCardWhereUniqueInput
  }

  /**
   * DecisionCard findUniqueOrThrow
   */
  export type DecisionCardFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
    /**
     * Filter, which DecisionCard to fetch.
     */
    where: DecisionCardWhereUniqueInput
  }

  /**
   * DecisionCard findFirst
   */
  export type DecisionCardFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
    /**
     * Filter, which DecisionCard to fetch.
     */
    where?: DecisionCardWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DecisionCards to fetch.
     */
    orderBy?: DecisionCardOrderByWithRelationInput | DecisionCardOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DecisionCards.
     */
    cursor?: DecisionCardWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DecisionCards from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DecisionCards.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DecisionCards.
     */
    distinct?: DecisionCardScalarFieldEnum | DecisionCardScalarFieldEnum[]
  }

  /**
   * DecisionCard findFirstOrThrow
   */
  export type DecisionCardFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
    /**
     * Filter, which DecisionCard to fetch.
     */
    where?: DecisionCardWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DecisionCards to fetch.
     */
    orderBy?: DecisionCardOrderByWithRelationInput | DecisionCardOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DecisionCards.
     */
    cursor?: DecisionCardWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DecisionCards from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DecisionCards.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DecisionCards.
     */
    distinct?: DecisionCardScalarFieldEnum | DecisionCardScalarFieldEnum[]
  }

  /**
   * DecisionCard findMany
   */
  export type DecisionCardFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
    /**
     * Filter, which DecisionCards to fetch.
     */
    where?: DecisionCardWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DecisionCards to fetch.
     */
    orderBy?: DecisionCardOrderByWithRelationInput | DecisionCardOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DecisionCards.
     */
    cursor?: DecisionCardWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DecisionCards from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DecisionCards.
     */
    skip?: number
    distinct?: DecisionCardScalarFieldEnum | DecisionCardScalarFieldEnum[]
  }

  /**
   * DecisionCard create
   */
  export type DecisionCardCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
    /**
     * The data needed to create a DecisionCard.
     */
    data: XOR<DecisionCardCreateInput, DecisionCardUncheckedCreateInput>
  }

  /**
   * DecisionCard createMany
   */
  export type DecisionCardCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DecisionCards.
     */
    data: DecisionCardCreateManyInput | DecisionCardCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DecisionCard createManyAndReturn
   */
  export type DecisionCardCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * The data used to create many DecisionCards.
     */
    data: DecisionCardCreateManyInput | DecisionCardCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * DecisionCard update
   */
  export type DecisionCardUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
    /**
     * The data needed to update a DecisionCard.
     */
    data: XOR<DecisionCardUpdateInput, DecisionCardUncheckedUpdateInput>
    /**
     * Choose, which DecisionCard to update.
     */
    where: DecisionCardWhereUniqueInput
  }

  /**
   * DecisionCard updateMany
   */
  export type DecisionCardUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DecisionCards.
     */
    data: XOR<DecisionCardUpdateManyMutationInput, DecisionCardUncheckedUpdateManyInput>
    /**
     * Filter which DecisionCards to update
     */
    where?: DecisionCardWhereInput
    /**
     * Limit how many DecisionCards to update.
     */
    limit?: number
  }

  /**
   * DecisionCard updateManyAndReturn
   */
  export type DecisionCardUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * The data used to update DecisionCards.
     */
    data: XOR<DecisionCardUpdateManyMutationInput, DecisionCardUncheckedUpdateManyInput>
    /**
     * Filter which DecisionCards to update
     */
    where?: DecisionCardWhereInput
    /**
     * Limit how many DecisionCards to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * DecisionCard upsert
   */
  export type DecisionCardUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
    /**
     * The filter to search for the DecisionCard to update in case it exists.
     */
    where: DecisionCardWhereUniqueInput
    /**
     * In case the DecisionCard found by the `where` argument doesn't exist, create a new DecisionCard with this data.
     */
    create: XOR<DecisionCardCreateInput, DecisionCardUncheckedCreateInput>
    /**
     * In case the DecisionCard was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DecisionCardUpdateInput, DecisionCardUncheckedUpdateInput>
  }

  /**
   * DecisionCard delete
   */
  export type DecisionCardDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
    /**
     * Filter which DecisionCard to delete.
     */
    where: DecisionCardWhereUniqueInput
  }

  /**
   * DecisionCard deleteMany
   */
  export type DecisionCardDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DecisionCards to delete
     */
    where?: DecisionCardWhereInput
    /**
     * Limit how many DecisionCards to delete.
     */
    limit?: number
  }

  /**
   * DecisionCard without action
   */
  export type DecisionCardDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DecisionCard
     */
    select?: DecisionCardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DecisionCard
     */
    omit?: DecisionCardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionCardInclude<ExtArgs> | null
  }


  /**
   * Model SimulationResult
   */

  export type AggregateSimulationResult = {
    _count: SimulationResultCountAggregateOutputType | null
    _avg: SimulationResultAvgAggregateOutputType | null
    _sum: SimulationResultSumAggregateOutputType | null
    _min: SimulationResultMinAggregateOutputType | null
    _max: SimulationResultMaxAggregateOutputType | null
  }

  export type SimulationResultAvgAggregateOutputType = {
    readinessScore: Decimal | null
    policyPassPct: Decimal | null
    citationCoverage: Decimal | null
    duplicationRisk: Decimal | null
    costEstimateUsd: Decimal | null
  }

  export type SimulationResultSumAggregateOutputType = {
    readinessScore: Decimal | null
    policyPassPct: Decimal | null
    citationCoverage: Decimal | null
    duplicationRisk: Decimal | null
    costEstimateUsd: Decimal | null
  }

  export type SimulationResultMinAggregateOutputType = {
    simulationId: string | null
    workspaceId: string | null
    readinessScore: Decimal | null
    policyPassPct: Decimal | null
    citationCoverage: Decimal | null
    duplicationRisk: Decimal | null
    costEstimateUsd: Decimal | null
    createdAt: Date | null
  }

  export type SimulationResultMaxAggregateOutputType = {
    simulationId: string | null
    workspaceId: string | null
    readinessScore: Decimal | null
    policyPassPct: Decimal | null
    citationCoverage: Decimal | null
    duplicationRisk: Decimal | null
    costEstimateUsd: Decimal | null
    createdAt: Date | null
  }

  export type SimulationResultCountAggregateOutputType = {
    simulationId: number
    workspaceId: number
    readinessScore: number
    policyPassPct: number
    citationCoverage: number
    duplicationRisk: number
    costEstimateUsd: number
    traces: number
    simulationData: number
    createdAt: number
    _all: number
  }


  export type SimulationResultAvgAggregateInputType = {
    readinessScore?: true
    policyPassPct?: true
    citationCoverage?: true
    duplicationRisk?: true
    costEstimateUsd?: true
  }

  export type SimulationResultSumAggregateInputType = {
    readinessScore?: true
    policyPassPct?: true
    citationCoverage?: true
    duplicationRisk?: true
    costEstimateUsd?: true
  }

  export type SimulationResultMinAggregateInputType = {
    simulationId?: true
    workspaceId?: true
    readinessScore?: true
    policyPassPct?: true
    citationCoverage?: true
    duplicationRisk?: true
    costEstimateUsd?: true
    createdAt?: true
  }

  export type SimulationResultMaxAggregateInputType = {
    simulationId?: true
    workspaceId?: true
    readinessScore?: true
    policyPassPct?: true
    citationCoverage?: true
    duplicationRisk?: true
    costEstimateUsd?: true
    createdAt?: true
  }

  export type SimulationResultCountAggregateInputType = {
    simulationId?: true
    workspaceId?: true
    readinessScore?: true
    policyPassPct?: true
    citationCoverage?: true
    duplicationRisk?: true
    costEstimateUsd?: true
    traces?: true
    simulationData?: true
    createdAt?: true
    _all?: true
  }

  export type SimulationResultAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SimulationResult to aggregate.
     */
    where?: SimulationResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SimulationResults to fetch.
     */
    orderBy?: SimulationResultOrderByWithRelationInput | SimulationResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SimulationResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SimulationResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SimulationResults.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SimulationResults
    **/
    _count?: true | SimulationResultCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SimulationResultAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SimulationResultSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SimulationResultMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SimulationResultMaxAggregateInputType
  }

  export type GetSimulationResultAggregateType<T extends SimulationResultAggregateArgs> = {
        [P in keyof T & keyof AggregateSimulationResult]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSimulationResult[P]>
      : GetScalarType<T[P], AggregateSimulationResult[P]>
  }




  export type SimulationResultGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SimulationResultWhereInput
    orderBy?: SimulationResultOrderByWithAggregationInput | SimulationResultOrderByWithAggregationInput[]
    by: SimulationResultScalarFieldEnum[] | SimulationResultScalarFieldEnum
    having?: SimulationResultScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SimulationResultCountAggregateInputType | true
    _avg?: SimulationResultAvgAggregateInputType
    _sum?: SimulationResultSumAggregateInputType
    _min?: SimulationResultMinAggregateInputType
    _max?: SimulationResultMaxAggregateInputType
  }

  export type SimulationResultGroupByOutputType = {
    simulationId: string
    workspaceId: string
    readinessScore: Decimal
    policyPassPct: Decimal
    citationCoverage: Decimal
    duplicationRisk: Decimal
    costEstimateUsd: Decimal
    traces: JsonValue | null
    simulationData: JsonValue
    createdAt: Date
    _count: SimulationResultCountAggregateOutputType | null
    _avg: SimulationResultAvgAggregateOutputType | null
    _sum: SimulationResultSumAggregateOutputType | null
    _min: SimulationResultMinAggregateOutputType | null
    _max: SimulationResultMaxAggregateOutputType | null
  }

  type GetSimulationResultGroupByPayload<T extends SimulationResultGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SimulationResultGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SimulationResultGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SimulationResultGroupByOutputType[P]>
            : GetScalarType<T[P], SimulationResultGroupByOutputType[P]>
        }
      >
    >


  export type SimulationResultSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    simulationId?: boolean
    workspaceId?: boolean
    readinessScore?: boolean
    policyPassPct?: boolean
    citationCoverage?: boolean
    duplicationRisk?: boolean
    costEstimateUsd?: boolean
    traces?: boolean
    simulationData?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["simulationResult"]>

  export type SimulationResultSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    simulationId?: boolean
    workspaceId?: boolean
    readinessScore?: boolean
    policyPassPct?: boolean
    citationCoverage?: boolean
    duplicationRisk?: boolean
    costEstimateUsd?: boolean
    traces?: boolean
    simulationData?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["simulationResult"]>

  export type SimulationResultSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    simulationId?: boolean
    workspaceId?: boolean
    readinessScore?: boolean
    policyPassPct?: boolean
    citationCoverage?: boolean
    duplicationRisk?: boolean
    costEstimateUsd?: boolean
    traces?: boolean
    simulationData?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["simulationResult"]>

  export type SimulationResultSelectScalar = {
    simulationId?: boolean
    workspaceId?: boolean
    readinessScore?: boolean
    policyPassPct?: boolean
    citationCoverage?: boolean
    duplicationRisk?: boolean
    costEstimateUsd?: boolean
    traces?: boolean
    simulationData?: boolean
    createdAt?: boolean
  }

  export type SimulationResultOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"simulationId" | "workspaceId" | "readinessScore" | "policyPassPct" | "citationCoverage" | "duplicationRisk" | "costEstimateUsd" | "traces" | "simulationData" | "createdAt", ExtArgs["result"]["simulationResult"]>
  export type SimulationResultInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type SimulationResultIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type SimulationResultIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }

  export type $SimulationResultPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SimulationResult"
    objects: {
      workspace: Prisma.$WorkspacePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      simulationId: string
      workspaceId: string
      readinessScore: Prisma.Decimal
      policyPassPct: Prisma.Decimal
      citationCoverage: Prisma.Decimal
      duplicationRisk: Prisma.Decimal
      costEstimateUsd: Prisma.Decimal
      traces: Prisma.JsonValue | null
      simulationData: Prisma.JsonValue
      createdAt: Date
    }, ExtArgs["result"]["simulationResult"]>
    composites: {}
  }

  type SimulationResultGetPayload<S extends boolean | null | undefined | SimulationResultDefaultArgs> = $Result.GetResult<Prisma.$SimulationResultPayload, S>

  type SimulationResultCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SimulationResultFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SimulationResultCountAggregateInputType | true
    }

  export interface SimulationResultDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SimulationResult'], meta: { name: 'SimulationResult' } }
    /**
     * Find zero or one SimulationResult that matches the filter.
     * @param {SimulationResultFindUniqueArgs} args - Arguments to find a SimulationResult
     * @example
     * // Get one SimulationResult
     * const simulationResult = await prisma.simulationResult.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SimulationResultFindUniqueArgs>(args: SelectSubset<T, SimulationResultFindUniqueArgs<ExtArgs>>): Prisma__SimulationResultClient<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SimulationResult that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SimulationResultFindUniqueOrThrowArgs} args - Arguments to find a SimulationResult
     * @example
     * // Get one SimulationResult
     * const simulationResult = await prisma.simulationResult.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SimulationResultFindUniqueOrThrowArgs>(args: SelectSubset<T, SimulationResultFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SimulationResultClient<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SimulationResult that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationResultFindFirstArgs} args - Arguments to find a SimulationResult
     * @example
     * // Get one SimulationResult
     * const simulationResult = await prisma.simulationResult.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SimulationResultFindFirstArgs>(args?: SelectSubset<T, SimulationResultFindFirstArgs<ExtArgs>>): Prisma__SimulationResultClient<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SimulationResult that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationResultFindFirstOrThrowArgs} args - Arguments to find a SimulationResult
     * @example
     * // Get one SimulationResult
     * const simulationResult = await prisma.simulationResult.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SimulationResultFindFirstOrThrowArgs>(args?: SelectSubset<T, SimulationResultFindFirstOrThrowArgs<ExtArgs>>): Prisma__SimulationResultClient<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SimulationResults that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationResultFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SimulationResults
     * const simulationResults = await prisma.simulationResult.findMany()
     * 
     * // Get first 10 SimulationResults
     * const simulationResults = await prisma.simulationResult.findMany({ take: 10 })
     * 
     * // Only select the `simulationId`
     * const simulationResultWithSimulationIdOnly = await prisma.simulationResult.findMany({ select: { simulationId: true } })
     * 
     */
    findMany<T extends SimulationResultFindManyArgs>(args?: SelectSubset<T, SimulationResultFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SimulationResult.
     * @param {SimulationResultCreateArgs} args - Arguments to create a SimulationResult.
     * @example
     * // Create one SimulationResult
     * const SimulationResult = await prisma.simulationResult.create({
     *   data: {
     *     // ... data to create a SimulationResult
     *   }
     * })
     * 
     */
    create<T extends SimulationResultCreateArgs>(args: SelectSubset<T, SimulationResultCreateArgs<ExtArgs>>): Prisma__SimulationResultClient<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SimulationResults.
     * @param {SimulationResultCreateManyArgs} args - Arguments to create many SimulationResults.
     * @example
     * // Create many SimulationResults
     * const simulationResult = await prisma.simulationResult.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SimulationResultCreateManyArgs>(args?: SelectSubset<T, SimulationResultCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SimulationResults and returns the data saved in the database.
     * @param {SimulationResultCreateManyAndReturnArgs} args - Arguments to create many SimulationResults.
     * @example
     * // Create many SimulationResults
     * const simulationResult = await prisma.simulationResult.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SimulationResults and only return the `simulationId`
     * const simulationResultWithSimulationIdOnly = await prisma.simulationResult.createManyAndReturn({
     *   select: { simulationId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SimulationResultCreateManyAndReturnArgs>(args?: SelectSubset<T, SimulationResultCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SimulationResult.
     * @param {SimulationResultDeleteArgs} args - Arguments to delete one SimulationResult.
     * @example
     * // Delete one SimulationResult
     * const SimulationResult = await prisma.simulationResult.delete({
     *   where: {
     *     // ... filter to delete one SimulationResult
     *   }
     * })
     * 
     */
    delete<T extends SimulationResultDeleteArgs>(args: SelectSubset<T, SimulationResultDeleteArgs<ExtArgs>>): Prisma__SimulationResultClient<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SimulationResult.
     * @param {SimulationResultUpdateArgs} args - Arguments to update one SimulationResult.
     * @example
     * // Update one SimulationResult
     * const simulationResult = await prisma.simulationResult.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SimulationResultUpdateArgs>(args: SelectSubset<T, SimulationResultUpdateArgs<ExtArgs>>): Prisma__SimulationResultClient<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SimulationResults.
     * @param {SimulationResultDeleteManyArgs} args - Arguments to filter SimulationResults to delete.
     * @example
     * // Delete a few SimulationResults
     * const { count } = await prisma.simulationResult.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SimulationResultDeleteManyArgs>(args?: SelectSubset<T, SimulationResultDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SimulationResults.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationResultUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SimulationResults
     * const simulationResult = await prisma.simulationResult.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SimulationResultUpdateManyArgs>(args: SelectSubset<T, SimulationResultUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SimulationResults and returns the data updated in the database.
     * @param {SimulationResultUpdateManyAndReturnArgs} args - Arguments to update many SimulationResults.
     * @example
     * // Update many SimulationResults
     * const simulationResult = await prisma.simulationResult.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SimulationResults and only return the `simulationId`
     * const simulationResultWithSimulationIdOnly = await prisma.simulationResult.updateManyAndReturn({
     *   select: { simulationId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SimulationResultUpdateManyAndReturnArgs>(args: SelectSubset<T, SimulationResultUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SimulationResult.
     * @param {SimulationResultUpsertArgs} args - Arguments to update or create a SimulationResult.
     * @example
     * // Update or create a SimulationResult
     * const simulationResult = await prisma.simulationResult.upsert({
     *   create: {
     *     // ... data to create a SimulationResult
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SimulationResult we want to update
     *   }
     * })
     */
    upsert<T extends SimulationResultUpsertArgs>(args: SelectSubset<T, SimulationResultUpsertArgs<ExtArgs>>): Prisma__SimulationResultClient<$Result.GetResult<Prisma.$SimulationResultPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SimulationResults.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationResultCountArgs} args - Arguments to filter SimulationResults to count.
     * @example
     * // Count the number of SimulationResults
     * const count = await prisma.simulationResult.count({
     *   where: {
     *     // ... the filter for the SimulationResults we want to count
     *   }
     * })
    **/
    count<T extends SimulationResultCountArgs>(
      args?: Subset<T, SimulationResultCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SimulationResultCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SimulationResult.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationResultAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SimulationResultAggregateArgs>(args: Subset<T, SimulationResultAggregateArgs>): Prisma.PrismaPromise<GetSimulationResultAggregateType<T>>

    /**
     * Group by SimulationResult.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationResultGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SimulationResultGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SimulationResultGroupByArgs['orderBy'] }
        : { orderBy?: SimulationResultGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SimulationResultGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSimulationResultGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SimulationResult model
   */
  readonly fields: SimulationResultFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SimulationResult.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SimulationResultClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    workspace<T extends WorkspaceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WorkspaceDefaultArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SimulationResult model
   */
  interface SimulationResultFieldRefs {
    readonly simulationId: FieldRef<"SimulationResult", 'String'>
    readonly workspaceId: FieldRef<"SimulationResult", 'String'>
    readonly readinessScore: FieldRef<"SimulationResult", 'Decimal'>
    readonly policyPassPct: FieldRef<"SimulationResult", 'Decimal'>
    readonly citationCoverage: FieldRef<"SimulationResult", 'Decimal'>
    readonly duplicationRisk: FieldRef<"SimulationResult", 'Decimal'>
    readonly costEstimateUsd: FieldRef<"SimulationResult", 'Decimal'>
    readonly traces: FieldRef<"SimulationResult", 'Json'>
    readonly simulationData: FieldRef<"SimulationResult", 'Json'>
    readonly createdAt: FieldRef<"SimulationResult", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SimulationResult findUnique
   */
  export type SimulationResultFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
    /**
     * Filter, which SimulationResult to fetch.
     */
    where: SimulationResultWhereUniqueInput
  }

  /**
   * SimulationResult findUniqueOrThrow
   */
  export type SimulationResultFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
    /**
     * Filter, which SimulationResult to fetch.
     */
    where: SimulationResultWhereUniqueInput
  }

  /**
   * SimulationResult findFirst
   */
  export type SimulationResultFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
    /**
     * Filter, which SimulationResult to fetch.
     */
    where?: SimulationResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SimulationResults to fetch.
     */
    orderBy?: SimulationResultOrderByWithRelationInput | SimulationResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SimulationResults.
     */
    cursor?: SimulationResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SimulationResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SimulationResults.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SimulationResults.
     */
    distinct?: SimulationResultScalarFieldEnum | SimulationResultScalarFieldEnum[]
  }

  /**
   * SimulationResult findFirstOrThrow
   */
  export type SimulationResultFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
    /**
     * Filter, which SimulationResult to fetch.
     */
    where?: SimulationResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SimulationResults to fetch.
     */
    orderBy?: SimulationResultOrderByWithRelationInput | SimulationResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SimulationResults.
     */
    cursor?: SimulationResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SimulationResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SimulationResults.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SimulationResults.
     */
    distinct?: SimulationResultScalarFieldEnum | SimulationResultScalarFieldEnum[]
  }

  /**
   * SimulationResult findMany
   */
  export type SimulationResultFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
    /**
     * Filter, which SimulationResults to fetch.
     */
    where?: SimulationResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SimulationResults to fetch.
     */
    orderBy?: SimulationResultOrderByWithRelationInput | SimulationResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SimulationResults.
     */
    cursor?: SimulationResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SimulationResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SimulationResults.
     */
    skip?: number
    distinct?: SimulationResultScalarFieldEnum | SimulationResultScalarFieldEnum[]
  }

  /**
   * SimulationResult create
   */
  export type SimulationResultCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
    /**
     * The data needed to create a SimulationResult.
     */
    data: XOR<SimulationResultCreateInput, SimulationResultUncheckedCreateInput>
  }

  /**
   * SimulationResult createMany
   */
  export type SimulationResultCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SimulationResults.
     */
    data: SimulationResultCreateManyInput | SimulationResultCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SimulationResult createManyAndReturn
   */
  export type SimulationResultCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * The data used to create many SimulationResults.
     */
    data: SimulationResultCreateManyInput | SimulationResultCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * SimulationResult update
   */
  export type SimulationResultUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
    /**
     * The data needed to update a SimulationResult.
     */
    data: XOR<SimulationResultUpdateInput, SimulationResultUncheckedUpdateInput>
    /**
     * Choose, which SimulationResult to update.
     */
    where: SimulationResultWhereUniqueInput
  }

  /**
   * SimulationResult updateMany
   */
  export type SimulationResultUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SimulationResults.
     */
    data: XOR<SimulationResultUpdateManyMutationInput, SimulationResultUncheckedUpdateManyInput>
    /**
     * Filter which SimulationResults to update
     */
    where?: SimulationResultWhereInput
    /**
     * Limit how many SimulationResults to update.
     */
    limit?: number
  }

  /**
   * SimulationResult updateManyAndReturn
   */
  export type SimulationResultUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * The data used to update SimulationResults.
     */
    data: XOR<SimulationResultUpdateManyMutationInput, SimulationResultUncheckedUpdateManyInput>
    /**
     * Filter which SimulationResults to update
     */
    where?: SimulationResultWhereInput
    /**
     * Limit how many SimulationResults to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * SimulationResult upsert
   */
  export type SimulationResultUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
    /**
     * The filter to search for the SimulationResult to update in case it exists.
     */
    where: SimulationResultWhereUniqueInput
    /**
     * In case the SimulationResult found by the `where` argument doesn't exist, create a new SimulationResult with this data.
     */
    create: XOR<SimulationResultCreateInput, SimulationResultUncheckedCreateInput>
    /**
     * In case the SimulationResult was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SimulationResultUpdateInput, SimulationResultUncheckedUpdateInput>
  }

  /**
   * SimulationResult delete
   */
  export type SimulationResultDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
    /**
     * Filter which SimulationResult to delete.
     */
    where: SimulationResultWhereUniqueInput
  }

  /**
   * SimulationResult deleteMany
   */
  export type SimulationResultDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SimulationResults to delete
     */
    where?: SimulationResultWhereInput
    /**
     * Limit how many SimulationResults to delete.
     */
    limit?: number
  }

  /**
   * SimulationResult without action
   */
  export type SimulationResultDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationResult
     */
    select?: SimulationResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SimulationResult
     */
    omit?: SimulationResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SimulationResultInclude<ExtArgs> | null
  }


  /**
   * Model AssetFingerprint
   */

  export type AggregateAssetFingerprint = {
    _count: AssetFingerprintCountAggregateOutputType | null
    _min: AssetFingerprintMinAggregateOutputType | null
    _max: AssetFingerprintMaxAggregateOutputType | null
  }

  export type AssetFingerprintMinAggregateOutputType = {
    assetId: string | null
    workspaceId: string | null
    assetType: string | null
    fingerprint: string | null
    license: string | null
    url: string | null
    createdAt: Date | null
  }

  export type AssetFingerprintMaxAggregateOutputType = {
    assetId: string | null
    workspaceId: string | null
    assetType: string | null
    fingerprint: string | null
    license: string | null
    url: string | null
    createdAt: Date | null
  }

  export type AssetFingerprintCountAggregateOutputType = {
    assetId: number
    workspaceId: number
    assetType: number
    fingerprint: number
    license: number
    url: number
    metadata: number
    createdAt: number
    _all: number
  }


  export type AssetFingerprintMinAggregateInputType = {
    assetId?: true
    workspaceId?: true
    assetType?: true
    fingerprint?: true
    license?: true
    url?: true
    createdAt?: true
  }

  export type AssetFingerprintMaxAggregateInputType = {
    assetId?: true
    workspaceId?: true
    assetType?: true
    fingerprint?: true
    license?: true
    url?: true
    createdAt?: true
  }

  export type AssetFingerprintCountAggregateInputType = {
    assetId?: true
    workspaceId?: true
    assetType?: true
    fingerprint?: true
    license?: true
    url?: true
    metadata?: true
    createdAt?: true
    _all?: true
  }

  export type AssetFingerprintAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AssetFingerprint to aggregate.
     */
    where?: AssetFingerprintWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AssetFingerprints to fetch.
     */
    orderBy?: AssetFingerprintOrderByWithRelationInput | AssetFingerprintOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AssetFingerprintWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AssetFingerprints from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AssetFingerprints.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AssetFingerprints
    **/
    _count?: true | AssetFingerprintCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AssetFingerprintMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AssetFingerprintMaxAggregateInputType
  }

  export type GetAssetFingerprintAggregateType<T extends AssetFingerprintAggregateArgs> = {
        [P in keyof T & keyof AggregateAssetFingerprint]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAssetFingerprint[P]>
      : GetScalarType<T[P], AggregateAssetFingerprint[P]>
  }




  export type AssetFingerprintGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AssetFingerprintWhereInput
    orderBy?: AssetFingerprintOrderByWithAggregationInput | AssetFingerprintOrderByWithAggregationInput[]
    by: AssetFingerprintScalarFieldEnum[] | AssetFingerprintScalarFieldEnum
    having?: AssetFingerprintScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AssetFingerprintCountAggregateInputType | true
    _min?: AssetFingerprintMinAggregateInputType
    _max?: AssetFingerprintMaxAggregateInputType
  }

  export type AssetFingerprintGroupByOutputType = {
    assetId: string
    workspaceId: string
    assetType: string
    fingerprint: string
    license: string
    url: string | null
    metadata: JsonValue | null
    createdAt: Date
    _count: AssetFingerprintCountAggregateOutputType | null
    _min: AssetFingerprintMinAggregateOutputType | null
    _max: AssetFingerprintMaxAggregateOutputType | null
  }

  type GetAssetFingerprintGroupByPayload<T extends AssetFingerprintGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AssetFingerprintGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AssetFingerprintGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AssetFingerprintGroupByOutputType[P]>
            : GetScalarType<T[P], AssetFingerprintGroupByOutputType[P]>
        }
      >
    >


  export type AssetFingerprintSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    assetId?: boolean
    workspaceId?: boolean
    assetType?: boolean
    fingerprint?: boolean
    license?: boolean
    url?: boolean
    metadata?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["assetFingerprint"]>

  export type AssetFingerprintSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    assetId?: boolean
    workspaceId?: boolean
    assetType?: boolean
    fingerprint?: boolean
    license?: boolean
    url?: boolean
    metadata?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["assetFingerprint"]>

  export type AssetFingerprintSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    assetId?: boolean
    workspaceId?: boolean
    assetType?: boolean
    fingerprint?: boolean
    license?: boolean
    url?: boolean
    metadata?: boolean
    createdAt?: boolean
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["assetFingerprint"]>

  export type AssetFingerprintSelectScalar = {
    assetId?: boolean
    workspaceId?: boolean
    assetType?: boolean
    fingerprint?: boolean
    license?: boolean
    url?: boolean
    metadata?: boolean
    createdAt?: boolean
  }

  export type AssetFingerprintOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"assetId" | "workspaceId" | "assetType" | "fingerprint" | "license" | "url" | "metadata" | "createdAt", ExtArgs["result"]["assetFingerprint"]>
  export type AssetFingerprintInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type AssetFingerprintIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }
  export type AssetFingerprintIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    workspace?: boolean | WorkspaceDefaultArgs<ExtArgs>
  }

  export type $AssetFingerprintPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AssetFingerprint"
    objects: {
      workspace: Prisma.$WorkspacePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      assetId: string
      workspaceId: string
      assetType: string
      fingerprint: string
      license: string
      url: string | null
      metadata: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["assetFingerprint"]>
    composites: {}
  }

  type AssetFingerprintGetPayload<S extends boolean | null | undefined | AssetFingerprintDefaultArgs> = $Result.GetResult<Prisma.$AssetFingerprintPayload, S>

  type AssetFingerprintCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AssetFingerprintFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AssetFingerprintCountAggregateInputType | true
    }

  export interface AssetFingerprintDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AssetFingerprint'], meta: { name: 'AssetFingerprint' } }
    /**
     * Find zero or one AssetFingerprint that matches the filter.
     * @param {AssetFingerprintFindUniqueArgs} args - Arguments to find a AssetFingerprint
     * @example
     * // Get one AssetFingerprint
     * const assetFingerprint = await prisma.assetFingerprint.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AssetFingerprintFindUniqueArgs>(args: SelectSubset<T, AssetFingerprintFindUniqueArgs<ExtArgs>>): Prisma__AssetFingerprintClient<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AssetFingerprint that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AssetFingerprintFindUniqueOrThrowArgs} args - Arguments to find a AssetFingerprint
     * @example
     * // Get one AssetFingerprint
     * const assetFingerprint = await prisma.assetFingerprint.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AssetFingerprintFindUniqueOrThrowArgs>(args: SelectSubset<T, AssetFingerprintFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AssetFingerprintClient<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AssetFingerprint that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssetFingerprintFindFirstArgs} args - Arguments to find a AssetFingerprint
     * @example
     * // Get one AssetFingerprint
     * const assetFingerprint = await prisma.assetFingerprint.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AssetFingerprintFindFirstArgs>(args?: SelectSubset<T, AssetFingerprintFindFirstArgs<ExtArgs>>): Prisma__AssetFingerprintClient<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AssetFingerprint that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssetFingerprintFindFirstOrThrowArgs} args - Arguments to find a AssetFingerprint
     * @example
     * // Get one AssetFingerprint
     * const assetFingerprint = await prisma.assetFingerprint.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AssetFingerprintFindFirstOrThrowArgs>(args?: SelectSubset<T, AssetFingerprintFindFirstOrThrowArgs<ExtArgs>>): Prisma__AssetFingerprintClient<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AssetFingerprints that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssetFingerprintFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AssetFingerprints
     * const assetFingerprints = await prisma.assetFingerprint.findMany()
     * 
     * // Get first 10 AssetFingerprints
     * const assetFingerprints = await prisma.assetFingerprint.findMany({ take: 10 })
     * 
     * // Only select the `assetId`
     * const assetFingerprintWithAssetIdOnly = await prisma.assetFingerprint.findMany({ select: { assetId: true } })
     * 
     */
    findMany<T extends AssetFingerprintFindManyArgs>(args?: SelectSubset<T, AssetFingerprintFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AssetFingerprint.
     * @param {AssetFingerprintCreateArgs} args - Arguments to create a AssetFingerprint.
     * @example
     * // Create one AssetFingerprint
     * const AssetFingerprint = await prisma.assetFingerprint.create({
     *   data: {
     *     // ... data to create a AssetFingerprint
     *   }
     * })
     * 
     */
    create<T extends AssetFingerprintCreateArgs>(args: SelectSubset<T, AssetFingerprintCreateArgs<ExtArgs>>): Prisma__AssetFingerprintClient<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AssetFingerprints.
     * @param {AssetFingerprintCreateManyArgs} args - Arguments to create many AssetFingerprints.
     * @example
     * // Create many AssetFingerprints
     * const assetFingerprint = await prisma.assetFingerprint.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AssetFingerprintCreateManyArgs>(args?: SelectSubset<T, AssetFingerprintCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AssetFingerprints and returns the data saved in the database.
     * @param {AssetFingerprintCreateManyAndReturnArgs} args - Arguments to create many AssetFingerprints.
     * @example
     * // Create many AssetFingerprints
     * const assetFingerprint = await prisma.assetFingerprint.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AssetFingerprints and only return the `assetId`
     * const assetFingerprintWithAssetIdOnly = await prisma.assetFingerprint.createManyAndReturn({
     *   select: { assetId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AssetFingerprintCreateManyAndReturnArgs>(args?: SelectSubset<T, AssetFingerprintCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AssetFingerprint.
     * @param {AssetFingerprintDeleteArgs} args - Arguments to delete one AssetFingerprint.
     * @example
     * // Delete one AssetFingerprint
     * const AssetFingerprint = await prisma.assetFingerprint.delete({
     *   where: {
     *     // ... filter to delete one AssetFingerprint
     *   }
     * })
     * 
     */
    delete<T extends AssetFingerprintDeleteArgs>(args: SelectSubset<T, AssetFingerprintDeleteArgs<ExtArgs>>): Prisma__AssetFingerprintClient<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AssetFingerprint.
     * @param {AssetFingerprintUpdateArgs} args - Arguments to update one AssetFingerprint.
     * @example
     * // Update one AssetFingerprint
     * const assetFingerprint = await prisma.assetFingerprint.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AssetFingerprintUpdateArgs>(args: SelectSubset<T, AssetFingerprintUpdateArgs<ExtArgs>>): Prisma__AssetFingerprintClient<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AssetFingerprints.
     * @param {AssetFingerprintDeleteManyArgs} args - Arguments to filter AssetFingerprints to delete.
     * @example
     * // Delete a few AssetFingerprints
     * const { count } = await prisma.assetFingerprint.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AssetFingerprintDeleteManyArgs>(args?: SelectSubset<T, AssetFingerprintDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AssetFingerprints.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssetFingerprintUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AssetFingerprints
     * const assetFingerprint = await prisma.assetFingerprint.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AssetFingerprintUpdateManyArgs>(args: SelectSubset<T, AssetFingerprintUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AssetFingerprints and returns the data updated in the database.
     * @param {AssetFingerprintUpdateManyAndReturnArgs} args - Arguments to update many AssetFingerprints.
     * @example
     * // Update many AssetFingerprints
     * const assetFingerprint = await prisma.assetFingerprint.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AssetFingerprints and only return the `assetId`
     * const assetFingerprintWithAssetIdOnly = await prisma.assetFingerprint.updateManyAndReturn({
     *   select: { assetId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AssetFingerprintUpdateManyAndReturnArgs>(args: SelectSubset<T, AssetFingerprintUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AssetFingerprint.
     * @param {AssetFingerprintUpsertArgs} args - Arguments to update or create a AssetFingerprint.
     * @example
     * // Update or create a AssetFingerprint
     * const assetFingerprint = await prisma.assetFingerprint.upsert({
     *   create: {
     *     // ... data to create a AssetFingerprint
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AssetFingerprint we want to update
     *   }
     * })
     */
    upsert<T extends AssetFingerprintUpsertArgs>(args: SelectSubset<T, AssetFingerprintUpsertArgs<ExtArgs>>): Prisma__AssetFingerprintClient<$Result.GetResult<Prisma.$AssetFingerprintPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AssetFingerprints.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssetFingerprintCountArgs} args - Arguments to filter AssetFingerprints to count.
     * @example
     * // Count the number of AssetFingerprints
     * const count = await prisma.assetFingerprint.count({
     *   where: {
     *     // ... the filter for the AssetFingerprints we want to count
     *   }
     * })
    **/
    count<T extends AssetFingerprintCountArgs>(
      args?: Subset<T, AssetFingerprintCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AssetFingerprintCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AssetFingerprint.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssetFingerprintAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AssetFingerprintAggregateArgs>(args: Subset<T, AssetFingerprintAggregateArgs>): Prisma.PrismaPromise<GetAssetFingerprintAggregateType<T>>

    /**
     * Group by AssetFingerprint.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssetFingerprintGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AssetFingerprintGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AssetFingerprintGroupByArgs['orderBy'] }
        : { orderBy?: AssetFingerprintGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AssetFingerprintGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAssetFingerprintGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AssetFingerprint model
   */
  readonly fields: AssetFingerprintFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AssetFingerprint.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AssetFingerprintClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    workspace<T extends WorkspaceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WorkspaceDefaultArgs<ExtArgs>>): Prisma__WorkspaceClient<$Result.GetResult<Prisma.$WorkspacePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AssetFingerprint model
   */
  interface AssetFingerprintFieldRefs {
    readonly assetId: FieldRef<"AssetFingerprint", 'String'>
    readonly workspaceId: FieldRef<"AssetFingerprint", 'String'>
    readonly assetType: FieldRef<"AssetFingerprint", 'String'>
    readonly fingerprint: FieldRef<"AssetFingerprint", 'String'>
    readonly license: FieldRef<"AssetFingerprint", 'String'>
    readonly url: FieldRef<"AssetFingerprint", 'String'>
    readonly metadata: FieldRef<"AssetFingerprint", 'Json'>
    readonly createdAt: FieldRef<"AssetFingerprint", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AssetFingerprint findUnique
   */
  export type AssetFingerprintFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
    /**
     * Filter, which AssetFingerprint to fetch.
     */
    where: AssetFingerprintWhereUniqueInput
  }

  /**
   * AssetFingerprint findUniqueOrThrow
   */
  export type AssetFingerprintFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
    /**
     * Filter, which AssetFingerprint to fetch.
     */
    where: AssetFingerprintWhereUniqueInput
  }

  /**
   * AssetFingerprint findFirst
   */
  export type AssetFingerprintFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
    /**
     * Filter, which AssetFingerprint to fetch.
     */
    where?: AssetFingerprintWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AssetFingerprints to fetch.
     */
    orderBy?: AssetFingerprintOrderByWithRelationInput | AssetFingerprintOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AssetFingerprints.
     */
    cursor?: AssetFingerprintWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AssetFingerprints from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AssetFingerprints.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AssetFingerprints.
     */
    distinct?: AssetFingerprintScalarFieldEnum | AssetFingerprintScalarFieldEnum[]
  }

  /**
   * AssetFingerprint findFirstOrThrow
   */
  export type AssetFingerprintFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
    /**
     * Filter, which AssetFingerprint to fetch.
     */
    where?: AssetFingerprintWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AssetFingerprints to fetch.
     */
    orderBy?: AssetFingerprintOrderByWithRelationInput | AssetFingerprintOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AssetFingerprints.
     */
    cursor?: AssetFingerprintWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AssetFingerprints from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AssetFingerprints.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AssetFingerprints.
     */
    distinct?: AssetFingerprintScalarFieldEnum | AssetFingerprintScalarFieldEnum[]
  }

  /**
   * AssetFingerprint findMany
   */
  export type AssetFingerprintFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
    /**
     * Filter, which AssetFingerprints to fetch.
     */
    where?: AssetFingerprintWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AssetFingerprints to fetch.
     */
    orderBy?: AssetFingerprintOrderByWithRelationInput | AssetFingerprintOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AssetFingerprints.
     */
    cursor?: AssetFingerprintWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AssetFingerprints from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AssetFingerprints.
     */
    skip?: number
    distinct?: AssetFingerprintScalarFieldEnum | AssetFingerprintScalarFieldEnum[]
  }

  /**
   * AssetFingerprint create
   */
  export type AssetFingerprintCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
    /**
     * The data needed to create a AssetFingerprint.
     */
    data: XOR<AssetFingerprintCreateInput, AssetFingerprintUncheckedCreateInput>
  }

  /**
   * AssetFingerprint createMany
   */
  export type AssetFingerprintCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AssetFingerprints.
     */
    data: AssetFingerprintCreateManyInput | AssetFingerprintCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AssetFingerprint createManyAndReturn
   */
  export type AssetFingerprintCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * The data used to create many AssetFingerprints.
     */
    data: AssetFingerprintCreateManyInput | AssetFingerprintCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AssetFingerprint update
   */
  export type AssetFingerprintUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
    /**
     * The data needed to update a AssetFingerprint.
     */
    data: XOR<AssetFingerprintUpdateInput, AssetFingerprintUncheckedUpdateInput>
    /**
     * Choose, which AssetFingerprint to update.
     */
    where: AssetFingerprintWhereUniqueInput
  }

  /**
   * AssetFingerprint updateMany
   */
  export type AssetFingerprintUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AssetFingerprints.
     */
    data: XOR<AssetFingerprintUpdateManyMutationInput, AssetFingerprintUncheckedUpdateManyInput>
    /**
     * Filter which AssetFingerprints to update
     */
    where?: AssetFingerprintWhereInput
    /**
     * Limit how many AssetFingerprints to update.
     */
    limit?: number
  }

  /**
   * AssetFingerprint updateManyAndReturn
   */
  export type AssetFingerprintUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * The data used to update AssetFingerprints.
     */
    data: XOR<AssetFingerprintUpdateManyMutationInput, AssetFingerprintUncheckedUpdateManyInput>
    /**
     * Filter which AssetFingerprints to update
     */
    where?: AssetFingerprintWhereInput
    /**
     * Limit how many AssetFingerprints to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AssetFingerprint upsert
   */
  export type AssetFingerprintUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
    /**
     * The filter to search for the AssetFingerprint to update in case it exists.
     */
    where: AssetFingerprintWhereUniqueInput
    /**
     * In case the AssetFingerprint found by the `where` argument doesn't exist, create a new AssetFingerprint with this data.
     */
    create: XOR<AssetFingerprintCreateInput, AssetFingerprintUncheckedCreateInput>
    /**
     * In case the AssetFingerprint was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AssetFingerprintUpdateInput, AssetFingerprintUncheckedUpdateInput>
  }

  /**
   * AssetFingerprint delete
   */
  export type AssetFingerprintDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
    /**
     * Filter which AssetFingerprint to delete.
     */
    where: AssetFingerprintWhereUniqueInput
  }

  /**
   * AssetFingerprint deleteMany
   */
  export type AssetFingerprintDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AssetFingerprints to delete
     */
    where?: AssetFingerprintWhereInput
    /**
     * Limit how many AssetFingerprints to delete.
     */
    limit?: number
  }

  /**
   * AssetFingerprint without action
   */
  export type AssetFingerprintDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssetFingerprint
     */
    select?: AssetFingerprintSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssetFingerprint
     */
    omit?: AssetFingerprintOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssetFingerprintInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const WorkspaceScalarFieldEnum: {
    workspaceId: 'workspaceId',
    tenantId: 'tenantId',
    createdBy: 'createdBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    lifecycle: 'lifecycle',
    contractVersion: 'contractVersion',
    goals: 'goals',
    primaryChannels: 'primaryChannels',
    budget: 'budget',
    approvalPolicy: 'approvalPolicy',
    riskProfile: 'riskProfile',
    dataRetention: 'dataRetention',
    ttlHours: 'ttlHours',
    policyBundleRef: 'policyBundleRef',
    policyBundleChecksum: 'policyBundleChecksum',
    contractData: 'contractData'
  };

  export type WorkspaceScalarFieldEnum = (typeof WorkspaceScalarFieldEnum)[keyof typeof WorkspaceScalarFieldEnum]


  export const WorkspaceRunScalarFieldEnum: {
    runId: 'runId',
    workspaceId: 'workspaceId',
    status: 'status',
    startedAt: 'startedAt',
    finishedAt: 'finishedAt',
    costUsd: 'costUsd',
    readinessScore: 'readinessScore',
    results: 'results',
    createdAt: 'createdAt'
  };

  export type WorkspaceRunScalarFieldEnum = (typeof WorkspaceRunScalarFieldEnum)[keyof typeof WorkspaceRunScalarFieldEnum]


  export const AuditBundleScalarFieldEnum: {
    bundleId: 'bundleId',
    workspaceId: 'workspaceId',
    bundleData: 'bundleData',
    signatureKeyId: 'signatureKeyId',
    signature: 'signature',
    signedAt: 'signedAt',
    createdAt: 'createdAt'
  };

  export type AuditBundleScalarFieldEnum = (typeof AuditBundleScalarFieldEnum)[keyof typeof AuditBundleScalarFieldEnum]


  export const ConnectorScalarFieldEnum: {
    connectorId: 'connectorId',
    workspaceId: 'workspaceId',
    platform: 'platform',
    accountId: 'accountId',
    displayName: 'displayName',
    status: 'status',
    scopes: 'scopes',
    lastConnectedAt: 'lastConnectedAt',
    ownerContact: 'ownerContact',
    credentialsRef: 'credentialsRef',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ConnectorScalarFieldEnum = (typeof ConnectorScalarFieldEnum)[keyof typeof ConnectorScalarFieldEnum]


  export const ConsentRecordScalarFieldEnum: {
    consentId: 'consentId',
    workspaceId: 'workspaceId',
    consentType: 'consentType',
    grantedBy: 'grantedBy',
    grantedAt: 'grantedAt',
    expiresAt: 'expiresAt',
    documentRef: 'documentRef',
    verifierSignature: 'verifierSignature',
    createdAt: 'createdAt'
  };

  export type ConsentRecordScalarFieldEnum = (typeof ConsentRecordScalarFieldEnum)[keyof typeof ConsentRecordScalarFieldEnum]


  export const BrandTwinScalarFieldEnum: {
    brandId: 'brandId',
    workspaceId: 'workspaceId',
    snapshotAt: 'snapshotAt',
    brandData: 'brandData',
    qualityScore: 'qualityScore',
    createdAt: 'createdAt'
  };

  export type BrandTwinScalarFieldEnum = (typeof BrandTwinScalarFieldEnum)[keyof typeof BrandTwinScalarFieldEnum]


  export const DecisionCardScalarFieldEnum: {
    actionId: 'actionId',
    workspaceId: 'workspaceId',
    title: 'title',
    oneLine: 'oneLine',
    readinessScore: 'readinessScore',
    expiresAt: 'expiresAt',
    status: 'status',
    approvedBy: 'approvedBy',
    approvedAt: 'approvedAt',
    cardData: 'cardData',
    createdAt: 'createdAt'
  };

  export type DecisionCardScalarFieldEnum = (typeof DecisionCardScalarFieldEnum)[keyof typeof DecisionCardScalarFieldEnum]


  export const SimulationResultScalarFieldEnum: {
    simulationId: 'simulationId',
    workspaceId: 'workspaceId',
    readinessScore: 'readinessScore',
    policyPassPct: 'policyPassPct',
    citationCoverage: 'citationCoverage',
    duplicationRisk: 'duplicationRisk',
    costEstimateUsd: 'costEstimateUsd',
    traces: 'traces',
    simulationData: 'simulationData',
    createdAt: 'createdAt'
  };

  export type SimulationResultScalarFieldEnum = (typeof SimulationResultScalarFieldEnum)[keyof typeof SimulationResultScalarFieldEnum]


  export const AssetFingerprintScalarFieldEnum: {
    assetId: 'assetId',
    workspaceId: 'workspaceId',
    assetType: 'assetType',
    fingerprint: 'fingerprint',
    license: 'license',
    url: 'url',
    metadata: 'metadata',
    createdAt: 'createdAt'
  };

  export type AssetFingerprintScalarFieldEnum = (typeof AssetFingerprintScalarFieldEnum)[keyof typeof AssetFingerprintScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type WorkspaceWhereInput = {
    AND?: WorkspaceWhereInput | WorkspaceWhereInput[]
    OR?: WorkspaceWhereInput[]
    NOT?: WorkspaceWhereInput | WorkspaceWhereInput[]
    workspaceId?: StringFilter<"Workspace"> | string
    tenantId?: StringFilter<"Workspace"> | string
    createdBy?: StringFilter<"Workspace"> | string
    createdAt?: DateTimeFilter<"Workspace"> | Date | string
    updatedAt?: DateTimeFilter<"Workspace"> | Date | string
    lifecycle?: StringFilter<"Workspace"> | string
    contractVersion?: StringFilter<"Workspace"> | string
    goals?: JsonFilter<"Workspace">
    primaryChannels?: JsonFilter<"Workspace">
    budget?: JsonFilter<"Workspace">
    approvalPolicy?: JsonFilter<"Workspace">
    riskProfile?: StringFilter<"Workspace"> | string
    dataRetention?: JsonFilter<"Workspace">
    ttlHours?: IntFilter<"Workspace"> | number
    policyBundleRef?: StringFilter<"Workspace"> | string
    policyBundleChecksum?: StringFilter<"Workspace"> | string
    contractData?: JsonFilter<"Workspace">
    workspaceRuns?: WorkspaceRunListRelationFilter
    auditBundles?: AuditBundleListRelationFilter
    connectors?: ConnectorListRelationFilter
    consentRecords?: ConsentRecordListRelationFilter
    brandTwins?: BrandTwinListRelationFilter
    decisionCards?: DecisionCardListRelationFilter
    simulationResults?: SimulationResultListRelationFilter
    assetFingerprints?: AssetFingerprintListRelationFilter
  }

  export type WorkspaceOrderByWithRelationInput = {
    workspaceId?: SortOrder
    tenantId?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lifecycle?: SortOrder
    contractVersion?: SortOrder
    goals?: SortOrder
    primaryChannels?: SortOrder
    budget?: SortOrder
    approvalPolicy?: SortOrder
    riskProfile?: SortOrder
    dataRetention?: SortOrder
    ttlHours?: SortOrder
    policyBundleRef?: SortOrder
    policyBundleChecksum?: SortOrder
    contractData?: SortOrder
    workspaceRuns?: WorkspaceRunOrderByRelationAggregateInput
    auditBundles?: AuditBundleOrderByRelationAggregateInput
    connectors?: ConnectorOrderByRelationAggregateInput
    consentRecords?: ConsentRecordOrderByRelationAggregateInput
    brandTwins?: BrandTwinOrderByRelationAggregateInput
    decisionCards?: DecisionCardOrderByRelationAggregateInput
    simulationResults?: SimulationResultOrderByRelationAggregateInput
    assetFingerprints?: AssetFingerprintOrderByRelationAggregateInput
  }

  export type WorkspaceWhereUniqueInput = Prisma.AtLeast<{
    workspaceId?: string
    AND?: WorkspaceWhereInput | WorkspaceWhereInput[]
    OR?: WorkspaceWhereInput[]
    NOT?: WorkspaceWhereInput | WorkspaceWhereInput[]
    tenantId?: StringFilter<"Workspace"> | string
    createdBy?: StringFilter<"Workspace"> | string
    createdAt?: DateTimeFilter<"Workspace"> | Date | string
    updatedAt?: DateTimeFilter<"Workspace"> | Date | string
    lifecycle?: StringFilter<"Workspace"> | string
    contractVersion?: StringFilter<"Workspace"> | string
    goals?: JsonFilter<"Workspace">
    primaryChannels?: JsonFilter<"Workspace">
    budget?: JsonFilter<"Workspace">
    approvalPolicy?: JsonFilter<"Workspace">
    riskProfile?: StringFilter<"Workspace"> | string
    dataRetention?: JsonFilter<"Workspace">
    ttlHours?: IntFilter<"Workspace"> | number
    policyBundleRef?: StringFilter<"Workspace"> | string
    policyBundleChecksum?: StringFilter<"Workspace"> | string
    contractData?: JsonFilter<"Workspace">
    workspaceRuns?: WorkspaceRunListRelationFilter
    auditBundles?: AuditBundleListRelationFilter
    connectors?: ConnectorListRelationFilter
    consentRecords?: ConsentRecordListRelationFilter
    brandTwins?: BrandTwinListRelationFilter
    decisionCards?: DecisionCardListRelationFilter
    simulationResults?: SimulationResultListRelationFilter
    assetFingerprints?: AssetFingerprintListRelationFilter
  }, "workspaceId">

  export type WorkspaceOrderByWithAggregationInput = {
    workspaceId?: SortOrder
    tenantId?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lifecycle?: SortOrder
    contractVersion?: SortOrder
    goals?: SortOrder
    primaryChannels?: SortOrder
    budget?: SortOrder
    approvalPolicy?: SortOrder
    riskProfile?: SortOrder
    dataRetention?: SortOrder
    ttlHours?: SortOrder
    policyBundleRef?: SortOrder
    policyBundleChecksum?: SortOrder
    contractData?: SortOrder
    _count?: WorkspaceCountOrderByAggregateInput
    _avg?: WorkspaceAvgOrderByAggregateInput
    _max?: WorkspaceMaxOrderByAggregateInput
    _min?: WorkspaceMinOrderByAggregateInput
    _sum?: WorkspaceSumOrderByAggregateInput
  }

  export type WorkspaceScalarWhereWithAggregatesInput = {
    AND?: WorkspaceScalarWhereWithAggregatesInput | WorkspaceScalarWhereWithAggregatesInput[]
    OR?: WorkspaceScalarWhereWithAggregatesInput[]
    NOT?: WorkspaceScalarWhereWithAggregatesInput | WorkspaceScalarWhereWithAggregatesInput[]
    workspaceId?: StringWithAggregatesFilter<"Workspace"> | string
    tenantId?: StringWithAggregatesFilter<"Workspace"> | string
    createdBy?: StringWithAggregatesFilter<"Workspace"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Workspace"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Workspace"> | Date | string
    lifecycle?: StringWithAggregatesFilter<"Workspace"> | string
    contractVersion?: StringWithAggregatesFilter<"Workspace"> | string
    goals?: JsonWithAggregatesFilter<"Workspace">
    primaryChannels?: JsonWithAggregatesFilter<"Workspace">
    budget?: JsonWithAggregatesFilter<"Workspace">
    approvalPolicy?: JsonWithAggregatesFilter<"Workspace">
    riskProfile?: StringWithAggregatesFilter<"Workspace"> | string
    dataRetention?: JsonWithAggregatesFilter<"Workspace">
    ttlHours?: IntWithAggregatesFilter<"Workspace"> | number
    policyBundleRef?: StringWithAggregatesFilter<"Workspace"> | string
    policyBundleChecksum?: StringWithAggregatesFilter<"Workspace"> | string
    contractData?: JsonWithAggregatesFilter<"Workspace">
  }

  export type WorkspaceRunWhereInput = {
    AND?: WorkspaceRunWhereInput | WorkspaceRunWhereInput[]
    OR?: WorkspaceRunWhereInput[]
    NOT?: WorkspaceRunWhereInput | WorkspaceRunWhereInput[]
    runId?: StringFilter<"WorkspaceRun"> | string
    workspaceId?: StringFilter<"WorkspaceRun"> | string
    status?: StringFilter<"WorkspaceRun"> | string
    startedAt?: DateTimeFilter<"WorkspaceRun"> | Date | string
    finishedAt?: DateTimeNullableFilter<"WorkspaceRun"> | Date | string | null
    costUsd?: DecimalNullableFilter<"WorkspaceRun"> | Decimal | DecimalJsLike | number | string | null
    readinessScore?: DecimalNullableFilter<"WorkspaceRun"> | Decimal | DecimalJsLike | number | string | null
    results?: JsonNullableFilter<"WorkspaceRun">
    createdAt?: DateTimeFilter<"WorkspaceRun"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }

  export type WorkspaceRunOrderByWithRelationInput = {
    runId?: SortOrder
    workspaceId?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrderInput | SortOrder
    costUsd?: SortOrderInput | SortOrder
    readinessScore?: SortOrderInput | SortOrder
    results?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    workspace?: WorkspaceOrderByWithRelationInput
  }

  export type WorkspaceRunWhereUniqueInput = Prisma.AtLeast<{
    runId?: string
    AND?: WorkspaceRunWhereInput | WorkspaceRunWhereInput[]
    OR?: WorkspaceRunWhereInput[]
    NOT?: WorkspaceRunWhereInput | WorkspaceRunWhereInput[]
    workspaceId?: StringFilter<"WorkspaceRun"> | string
    status?: StringFilter<"WorkspaceRun"> | string
    startedAt?: DateTimeFilter<"WorkspaceRun"> | Date | string
    finishedAt?: DateTimeNullableFilter<"WorkspaceRun"> | Date | string | null
    costUsd?: DecimalNullableFilter<"WorkspaceRun"> | Decimal | DecimalJsLike | number | string | null
    readinessScore?: DecimalNullableFilter<"WorkspaceRun"> | Decimal | DecimalJsLike | number | string | null
    results?: JsonNullableFilter<"WorkspaceRun">
    createdAt?: DateTimeFilter<"WorkspaceRun"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }, "runId">

  export type WorkspaceRunOrderByWithAggregationInput = {
    runId?: SortOrder
    workspaceId?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrderInput | SortOrder
    costUsd?: SortOrderInput | SortOrder
    readinessScore?: SortOrderInput | SortOrder
    results?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: WorkspaceRunCountOrderByAggregateInput
    _avg?: WorkspaceRunAvgOrderByAggregateInput
    _max?: WorkspaceRunMaxOrderByAggregateInput
    _min?: WorkspaceRunMinOrderByAggregateInput
    _sum?: WorkspaceRunSumOrderByAggregateInput
  }

  export type WorkspaceRunScalarWhereWithAggregatesInput = {
    AND?: WorkspaceRunScalarWhereWithAggregatesInput | WorkspaceRunScalarWhereWithAggregatesInput[]
    OR?: WorkspaceRunScalarWhereWithAggregatesInput[]
    NOT?: WorkspaceRunScalarWhereWithAggregatesInput | WorkspaceRunScalarWhereWithAggregatesInput[]
    runId?: StringWithAggregatesFilter<"WorkspaceRun"> | string
    workspaceId?: StringWithAggregatesFilter<"WorkspaceRun"> | string
    status?: StringWithAggregatesFilter<"WorkspaceRun"> | string
    startedAt?: DateTimeWithAggregatesFilter<"WorkspaceRun"> | Date | string
    finishedAt?: DateTimeNullableWithAggregatesFilter<"WorkspaceRun"> | Date | string | null
    costUsd?: DecimalNullableWithAggregatesFilter<"WorkspaceRun"> | Decimal | DecimalJsLike | number | string | null
    readinessScore?: DecimalNullableWithAggregatesFilter<"WorkspaceRun"> | Decimal | DecimalJsLike | number | string | null
    results?: JsonNullableWithAggregatesFilter<"WorkspaceRun">
    createdAt?: DateTimeWithAggregatesFilter<"WorkspaceRun"> | Date | string
  }

  export type AuditBundleWhereInput = {
    AND?: AuditBundleWhereInput | AuditBundleWhereInput[]
    OR?: AuditBundleWhereInput[]
    NOT?: AuditBundleWhereInput | AuditBundleWhereInput[]
    bundleId?: StringFilter<"AuditBundle"> | string
    workspaceId?: StringFilter<"AuditBundle"> | string
    bundleData?: JsonFilter<"AuditBundle">
    signatureKeyId?: StringFilter<"AuditBundle"> | string
    signature?: StringFilter<"AuditBundle"> | string
    signedAt?: DateTimeFilter<"AuditBundle"> | Date | string
    createdAt?: DateTimeFilter<"AuditBundle"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }

  export type AuditBundleOrderByWithRelationInput = {
    bundleId?: SortOrder
    workspaceId?: SortOrder
    bundleData?: SortOrder
    signatureKeyId?: SortOrder
    signature?: SortOrder
    signedAt?: SortOrder
    createdAt?: SortOrder
    workspace?: WorkspaceOrderByWithRelationInput
  }

  export type AuditBundleWhereUniqueInput = Prisma.AtLeast<{
    bundleId?: string
    AND?: AuditBundleWhereInput | AuditBundleWhereInput[]
    OR?: AuditBundleWhereInput[]
    NOT?: AuditBundleWhereInput | AuditBundleWhereInput[]
    workspaceId?: StringFilter<"AuditBundle"> | string
    bundleData?: JsonFilter<"AuditBundle">
    signatureKeyId?: StringFilter<"AuditBundle"> | string
    signature?: StringFilter<"AuditBundle"> | string
    signedAt?: DateTimeFilter<"AuditBundle"> | Date | string
    createdAt?: DateTimeFilter<"AuditBundle"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }, "bundleId">

  export type AuditBundleOrderByWithAggregationInput = {
    bundleId?: SortOrder
    workspaceId?: SortOrder
    bundleData?: SortOrder
    signatureKeyId?: SortOrder
    signature?: SortOrder
    signedAt?: SortOrder
    createdAt?: SortOrder
    _count?: AuditBundleCountOrderByAggregateInput
    _max?: AuditBundleMaxOrderByAggregateInput
    _min?: AuditBundleMinOrderByAggregateInput
  }

  export type AuditBundleScalarWhereWithAggregatesInput = {
    AND?: AuditBundleScalarWhereWithAggregatesInput | AuditBundleScalarWhereWithAggregatesInput[]
    OR?: AuditBundleScalarWhereWithAggregatesInput[]
    NOT?: AuditBundleScalarWhereWithAggregatesInput | AuditBundleScalarWhereWithAggregatesInput[]
    bundleId?: StringWithAggregatesFilter<"AuditBundle"> | string
    workspaceId?: StringWithAggregatesFilter<"AuditBundle"> | string
    bundleData?: JsonWithAggregatesFilter<"AuditBundle">
    signatureKeyId?: StringWithAggregatesFilter<"AuditBundle"> | string
    signature?: StringWithAggregatesFilter<"AuditBundle"> | string
    signedAt?: DateTimeWithAggregatesFilter<"AuditBundle"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"AuditBundle"> | Date | string
  }

  export type ConnectorWhereInput = {
    AND?: ConnectorWhereInput | ConnectorWhereInput[]
    OR?: ConnectorWhereInput[]
    NOT?: ConnectorWhereInput | ConnectorWhereInput[]
    connectorId?: StringFilter<"Connector"> | string
    workspaceId?: StringFilter<"Connector"> | string
    platform?: StringFilter<"Connector"> | string
    accountId?: StringFilter<"Connector"> | string
    displayName?: StringFilter<"Connector"> | string
    status?: StringFilter<"Connector"> | string
    scopes?: JsonNullableFilter<"Connector">
    lastConnectedAt?: DateTimeNullableFilter<"Connector"> | Date | string | null
    ownerContact?: StringNullableFilter<"Connector"> | string | null
    credentialsRef?: StringNullableFilter<"Connector"> | string | null
    createdAt?: DateTimeFilter<"Connector"> | Date | string
    updatedAt?: DateTimeFilter<"Connector"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }

  export type ConnectorOrderByWithRelationInput = {
    connectorId?: SortOrder
    workspaceId?: SortOrder
    platform?: SortOrder
    accountId?: SortOrder
    displayName?: SortOrder
    status?: SortOrder
    scopes?: SortOrderInput | SortOrder
    lastConnectedAt?: SortOrderInput | SortOrder
    ownerContact?: SortOrderInput | SortOrder
    credentialsRef?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    workspace?: WorkspaceOrderByWithRelationInput
  }

  export type ConnectorWhereUniqueInput = Prisma.AtLeast<{
    connectorId?: string
    idx_workspace_platform?: ConnectorIdx_workspace_platformCompoundUniqueInput
    AND?: ConnectorWhereInput | ConnectorWhereInput[]
    OR?: ConnectorWhereInput[]
    NOT?: ConnectorWhereInput | ConnectorWhereInput[]
    workspaceId?: StringFilter<"Connector"> | string
    platform?: StringFilter<"Connector"> | string
    accountId?: StringFilter<"Connector"> | string
    displayName?: StringFilter<"Connector"> | string
    status?: StringFilter<"Connector"> | string
    scopes?: JsonNullableFilter<"Connector">
    lastConnectedAt?: DateTimeNullableFilter<"Connector"> | Date | string | null
    ownerContact?: StringNullableFilter<"Connector"> | string | null
    credentialsRef?: StringNullableFilter<"Connector"> | string | null
    createdAt?: DateTimeFilter<"Connector"> | Date | string
    updatedAt?: DateTimeFilter<"Connector"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }, "connectorId" | "idx_workspace_platform">

  export type ConnectorOrderByWithAggregationInput = {
    connectorId?: SortOrder
    workspaceId?: SortOrder
    platform?: SortOrder
    accountId?: SortOrder
    displayName?: SortOrder
    status?: SortOrder
    scopes?: SortOrderInput | SortOrder
    lastConnectedAt?: SortOrderInput | SortOrder
    ownerContact?: SortOrderInput | SortOrder
    credentialsRef?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ConnectorCountOrderByAggregateInput
    _max?: ConnectorMaxOrderByAggregateInput
    _min?: ConnectorMinOrderByAggregateInput
  }

  export type ConnectorScalarWhereWithAggregatesInput = {
    AND?: ConnectorScalarWhereWithAggregatesInput | ConnectorScalarWhereWithAggregatesInput[]
    OR?: ConnectorScalarWhereWithAggregatesInput[]
    NOT?: ConnectorScalarWhereWithAggregatesInput | ConnectorScalarWhereWithAggregatesInput[]
    connectorId?: StringWithAggregatesFilter<"Connector"> | string
    workspaceId?: StringWithAggregatesFilter<"Connector"> | string
    platform?: StringWithAggregatesFilter<"Connector"> | string
    accountId?: StringWithAggregatesFilter<"Connector"> | string
    displayName?: StringWithAggregatesFilter<"Connector"> | string
    status?: StringWithAggregatesFilter<"Connector"> | string
    scopes?: JsonNullableWithAggregatesFilter<"Connector">
    lastConnectedAt?: DateTimeNullableWithAggregatesFilter<"Connector"> | Date | string | null
    ownerContact?: StringNullableWithAggregatesFilter<"Connector"> | string | null
    credentialsRef?: StringNullableWithAggregatesFilter<"Connector"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Connector"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Connector"> | Date | string
  }

  export type ConsentRecordWhereInput = {
    AND?: ConsentRecordWhereInput | ConsentRecordWhereInput[]
    OR?: ConsentRecordWhereInput[]
    NOT?: ConsentRecordWhereInput | ConsentRecordWhereInput[]
    consentId?: StringFilter<"ConsentRecord"> | string
    workspaceId?: StringFilter<"ConsentRecord"> | string
    consentType?: StringFilter<"ConsentRecord"> | string
    grantedBy?: StringFilter<"ConsentRecord"> | string
    grantedAt?: DateTimeFilter<"ConsentRecord"> | Date | string
    expiresAt?: DateTimeFilter<"ConsentRecord"> | Date | string
    documentRef?: StringNullableFilter<"ConsentRecord"> | string | null
    verifierSignature?: StringNullableFilter<"ConsentRecord"> | string | null
    createdAt?: DateTimeFilter<"ConsentRecord"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }

  export type ConsentRecordOrderByWithRelationInput = {
    consentId?: SortOrder
    workspaceId?: SortOrder
    consentType?: SortOrder
    grantedBy?: SortOrder
    grantedAt?: SortOrder
    expiresAt?: SortOrder
    documentRef?: SortOrderInput | SortOrder
    verifierSignature?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    workspace?: WorkspaceOrderByWithRelationInput
  }

  export type ConsentRecordWhereUniqueInput = Prisma.AtLeast<{
    consentId?: string
    AND?: ConsentRecordWhereInput | ConsentRecordWhereInput[]
    OR?: ConsentRecordWhereInput[]
    NOT?: ConsentRecordWhereInput | ConsentRecordWhereInput[]
    workspaceId?: StringFilter<"ConsentRecord"> | string
    consentType?: StringFilter<"ConsentRecord"> | string
    grantedBy?: StringFilter<"ConsentRecord"> | string
    grantedAt?: DateTimeFilter<"ConsentRecord"> | Date | string
    expiresAt?: DateTimeFilter<"ConsentRecord"> | Date | string
    documentRef?: StringNullableFilter<"ConsentRecord"> | string | null
    verifierSignature?: StringNullableFilter<"ConsentRecord"> | string | null
    createdAt?: DateTimeFilter<"ConsentRecord"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }, "consentId">

  export type ConsentRecordOrderByWithAggregationInput = {
    consentId?: SortOrder
    workspaceId?: SortOrder
    consentType?: SortOrder
    grantedBy?: SortOrder
    grantedAt?: SortOrder
    expiresAt?: SortOrder
    documentRef?: SortOrderInput | SortOrder
    verifierSignature?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: ConsentRecordCountOrderByAggregateInput
    _max?: ConsentRecordMaxOrderByAggregateInput
    _min?: ConsentRecordMinOrderByAggregateInput
  }

  export type ConsentRecordScalarWhereWithAggregatesInput = {
    AND?: ConsentRecordScalarWhereWithAggregatesInput | ConsentRecordScalarWhereWithAggregatesInput[]
    OR?: ConsentRecordScalarWhereWithAggregatesInput[]
    NOT?: ConsentRecordScalarWhereWithAggregatesInput | ConsentRecordScalarWhereWithAggregatesInput[]
    consentId?: StringWithAggregatesFilter<"ConsentRecord"> | string
    workspaceId?: StringWithAggregatesFilter<"ConsentRecord"> | string
    consentType?: StringWithAggregatesFilter<"ConsentRecord"> | string
    grantedBy?: StringWithAggregatesFilter<"ConsentRecord"> | string
    grantedAt?: DateTimeWithAggregatesFilter<"ConsentRecord"> | Date | string
    expiresAt?: DateTimeWithAggregatesFilter<"ConsentRecord"> | Date | string
    documentRef?: StringNullableWithAggregatesFilter<"ConsentRecord"> | string | null
    verifierSignature?: StringNullableWithAggregatesFilter<"ConsentRecord"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ConsentRecord"> | Date | string
  }

  export type BrandTwinWhereInput = {
    AND?: BrandTwinWhereInput | BrandTwinWhereInput[]
    OR?: BrandTwinWhereInput[]
    NOT?: BrandTwinWhereInput | BrandTwinWhereInput[]
    brandId?: StringFilter<"BrandTwin"> | string
    workspaceId?: StringFilter<"BrandTwin"> | string
    snapshotAt?: DateTimeFilter<"BrandTwin"> | Date | string
    brandData?: JsonFilter<"BrandTwin">
    qualityScore?: DecimalNullableFilter<"BrandTwin"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFilter<"BrandTwin"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }

  export type BrandTwinOrderByWithRelationInput = {
    brandId?: SortOrder
    workspaceId?: SortOrder
    snapshotAt?: SortOrder
    brandData?: SortOrder
    qualityScore?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    workspace?: WorkspaceOrderByWithRelationInput
  }

  export type BrandTwinWhereUniqueInput = Prisma.AtLeast<{
    brandId_snapshotAt?: BrandTwinBrandIdSnapshotAtCompoundUniqueInput
    AND?: BrandTwinWhereInput | BrandTwinWhereInput[]
    OR?: BrandTwinWhereInput[]
    NOT?: BrandTwinWhereInput | BrandTwinWhereInput[]
    brandId?: StringFilter<"BrandTwin"> | string
    workspaceId?: StringFilter<"BrandTwin"> | string
    snapshotAt?: DateTimeFilter<"BrandTwin"> | Date | string
    brandData?: JsonFilter<"BrandTwin">
    qualityScore?: DecimalNullableFilter<"BrandTwin"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFilter<"BrandTwin"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }, "brandId_snapshotAt">

  export type BrandTwinOrderByWithAggregationInput = {
    brandId?: SortOrder
    workspaceId?: SortOrder
    snapshotAt?: SortOrder
    brandData?: SortOrder
    qualityScore?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: BrandTwinCountOrderByAggregateInput
    _avg?: BrandTwinAvgOrderByAggregateInput
    _max?: BrandTwinMaxOrderByAggregateInput
    _min?: BrandTwinMinOrderByAggregateInput
    _sum?: BrandTwinSumOrderByAggregateInput
  }

  export type BrandTwinScalarWhereWithAggregatesInput = {
    AND?: BrandTwinScalarWhereWithAggregatesInput | BrandTwinScalarWhereWithAggregatesInput[]
    OR?: BrandTwinScalarWhereWithAggregatesInput[]
    NOT?: BrandTwinScalarWhereWithAggregatesInput | BrandTwinScalarWhereWithAggregatesInput[]
    brandId?: StringWithAggregatesFilter<"BrandTwin"> | string
    workspaceId?: StringWithAggregatesFilter<"BrandTwin"> | string
    snapshotAt?: DateTimeWithAggregatesFilter<"BrandTwin"> | Date | string
    brandData?: JsonWithAggregatesFilter<"BrandTwin">
    qualityScore?: DecimalNullableWithAggregatesFilter<"BrandTwin"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeWithAggregatesFilter<"BrandTwin"> | Date | string
  }

  export type DecisionCardWhereInput = {
    AND?: DecisionCardWhereInput | DecisionCardWhereInput[]
    OR?: DecisionCardWhereInput[]
    NOT?: DecisionCardWhereInput | DecisionCardWhereInput[]
    actionId?: StringFilter<"DecisionCard"> | string
    workspaceId?: StringFilter<"DecisionCard"> | string
    title?: StringFilter<"DecisionCard"> | string
    oneLine?: StringFilter<"DecisionCard"> | string
    readinessScore?: DecimalFilter<"DecisionCard"> | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeFilter<"DecisionCard"> | Date | string
    status?: StringFilter<"DecisionCard"> | string
    approvedBy?: StringNullableFilter<"DecisionCard"> | string | null
    approvedAt?: DateTimeNullableFilter<"DecisionCard"> | Date | string | null
    cardData?: JsonFilter<"DecisionCard">
    createdAt?: DateTimeFilter<"DecisionCard"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }

  export type DecisionCardOrderByWithRelationInput = {
    actionId?: SortOrder
    workspaceId?: SortOrder
    title?: SortOrder
    oneLine?: SortOrder
    readinessScore?: SortOrder
    expiresAt?: SortOrder
    status?: SortOrder
    approvedBy?: SortOrderInput | SortOrder
    approvedAt?: SortOrderInput | SortOrder
    cardData?: SortOrder
    createdAt?: SortOrder
    workspace?: WorkspaceOrderByWithRelationInput
  }

  export type DecisionCardWhereUniqueInput = Prisma.AtLeast<{
    actionId?: string
    AND?: DecisionCardWhereInput | DecisionCardWhereInput[]
    OR?: DecisionCardWhereInput[]
    NOT?: DecisionCardWhereInput | DecisionCardWhereInput[]
    workspaceId?: StringFilter<"DecisionCard"> | string
    title?: StringFilter<"DecisionCard"> | string
    oneLine?: StringFilter<"DecisionCard"> | string
    readinessScore?: DecimalFilter<"DecisionCard"> | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeFilter<"DecisionCard"> | Date | string
    status?: StringFilter<"DecisionCard"> | string
    approvedBy?: StringNullableFilter<"DecisionCard"> | string | null
    approvedAt?: DateTimeNullableFilter<"DecisionCard"> | Date | string | null
    cardData?: JsonFilter<"DecisionCard">
    createdAt?: DateTimeFilter<"DecisionCard"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }, "actionId">

  export type DecisionCardOrderByWithAggregationInput = {
    actionId?: SortOrder
    workspaceId?: SortOrder
    title?: SortOrder
    oneLine?: SortOrder
    readinessScore?: SortOrder
    expiresAt?: SortOrder
    status?: SortOrder
    approvedBy?: SortOrderInput | SortOrder
    approvedAt?: SortOrderInput | SortOrder
    cardData?: SortOrder
    createdAt?: SortOrder
    _count?: DecisionCardCountOrderByAggregateInput
    _avg?: DecisionCardAvgOrderByAggregateInput
    _max?: DecisionCardMaxOrderByAggregateInput
    _min?: DecisionCardMinOrderByAggregateInput
    _sum?: DecisionCardSumOrderByAggregateInput
  }

  export type DecisionCardScalarWhereWithAggregatesInput = {
    AND?: DecisionCardScalarWhereWithAggregatesInput | DecisionCardScalarWhereWithAggregatesInput[]
    OR?: DecisionCardScalarWhereWithAggregatesInput[]
    NOT?: DecisionCardScalarWhereWithAggregatesInput | DecisionCardScalarWhereWithAggregatesInput[]
    actionId?: StringWithAggregatesFilter<"DecisionCard"> | string
    workspaceId?: StringWithAggregatesFilter<"DecisionCard"> | string
    title?: StringWithAggregatesFilter<"DecisionCard"> | string
    oneLine?: StringWithAggregatesFilter<"DecisionCard"> | string
    readinessScore?: DecimalWithAggregatesFilter<"DecisionCard"> | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeWithAggregatesFilter<"DecisionCard"> | Date | string
    status?: StringWithAggregatesFilter<"DecisionCard"> | string
    approvedBy?: StringNullableWithAggregatesFilter<"DecisionCard"> | string | null
    approvedAt?: DateTimeNullableWithAggregatesFilter<"DecisionCard"> | Date | string | null
    cardData?: JsonWithAggregatesFilter<"DecisionCard">
    createdAt?: DateTimeWithAggregatesFilter<"DecisionCard"> | Date | string
  }

  export type SimulationResultWhereInput = {
    AND?: SimulationResultWhereInput | SimulationResultWhereInput[]
    OR?: SimulationResultWhereInput[]
    NOT?: SimulationResultWhereInput | SimulationResultWhereInput[]
    simulationId?: StringFilter<"SimulationResult"> | string
    workspaceId?: StringFilter<"SimulationResult"> | string
    readinessScore?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    traces?: JsonNullableFilter<"SimulationResult">
    simulationData?: JsonFilter<"SimulationResult">
    createdAt?: DateTimeFilter<"SimulationResult"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }

  export type SimulationResultOrderByWithRelationInput = {
    simulationId?: SortOrder
    workspaceId?: SortOrder
    readinessScore?: SortOrder
    policyPassPct?: SortOrder
    citationCoverage?: SortOrder
    duplicationRisk?: SortOrder
    costEstimateUsd?: SortOrder
    traces?: SortOrderInput | SortOrder
    simulationData?: SortOrder
    createdAt?: SortOrder
    workspace?: WorkspaceOrderByWithRelationInput
  }

  export type SimulationResultWhereUniqueInput = Prisma.AtLeast<{
    simulationId?: string
    AND?: SimulationResultWhereInput | SimulationResultWhereInput[]
    OR?: SimulationResultWhereInput[]
    NOT?: SimulationResultWhereInput | SimulationResultWhereInput[]
    workspaceId?: StringFilter<"SimulationResult"> | string
    readinessScore?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    traces?: JsonNullableFilter<"SimulationResult">
    simulationData?: JsonFilter<"SimulationResult">
    createdAt?: DateTimeFilter<"SimulationResult"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }, "simulationId">

  export type SimulationResultOrderByWithAggregationInput = {
    simulationId?: SortOrder
    workspaceId?: SortOrder
    readinessScore?: SortOrder
    policyPassPct?: SortOrder
    citationCoverage?: SortOrder
    duplicationRisk?: SortOrder
    costEstimateUsd?: SortOrder
    traces?: SortOrderInput | SortOrder
    simulationData?: SortOrder
    createdAt?: SortOrder
    _count?: SimulationResultCountOrderByAggregateInput
    _avg?: SimulationResultAvgOrderByAggregateInput
    _max?: SimulationResultMaxOrderByAggregateInput
    _min?: SimulationResultMinOrderByAggregateInput
    _sum?: SimulationResultSumOrderByAggregateInput
  }

  export type SimulationResultScalarWhereWithAggregatesInput = {
    AND?: SimulationResultScalarWhereWithAggregatesInput | SimulationResultScalarWhereWithAggregatesInput[]
    OR?: SimulationResultScalarWhereWithAggregatesInput[]
    NOT?: SimulationResultScalarWhereWithAggregatesInput | SimulationResultScalarWhereWithAggregatesInput[]
    simulationId?: StringWithAggregatesFilter<"SimulationResult"> | string
    workspaceId?: StringWithAggregatesFilter<"SimulationResult"> | string
    readinessScore?: DecimalWithAggregatesFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalWithAggregatesFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalWithAggregatesFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalWithAggregatesFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalWithAggregatesFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    traces?: JsonNullableWithAggregatesFilter<"SimulationResult">
    simulationData?: JsonWithAggregatesFilter<"SimulationResult">
    createdAt?: DateTimeWithAggregatesFilter<"SimulationResult"> | Date | string
  }

  export type AssetFingerprintWhereInput = {
    AND?: AssetFingerprintWhereInput | AssetFingerprintWhereInput[]
    OR?: AssetFingerprintWhereInput[]
    NOT?: AssetFingerprintWhereInput | AssetFingerprintWhereInput[]
    assetId?: StringFilter<"AssetFingerprint"> | string
    workspaceId?: StringFilter<"AssetFingerprint"> | string
    assetType?: StringFilter<"AssetFingerprint"> | string
    fingerprint?: StringFilter<"AssetFingerprint"> | string
    license?: StringFilter<"AssetFingerprint"> | string
    url?: StringNullableFilter<"AssetFingerprint"> | string | null
    metadata?: JsonNullableFilter<"AssetFingerprint">
    createdAt?: DateTimeFilter<"AssetFingerprint"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }

  export type AssetFingerprintOrderByWithRelationInput = {
    assetId?: SortOrder
    workspaceId?: SortOrder
    assetType?: SortOrder
    fingerprint?: SortOrder
    license?: SortOrder
    url?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    workspace?: WorkspaceOrderByWithRelationInput
  }

  export type AssetFingerprintWhereUniqueInput = Prisma.AtLeast<{
    assetId?: string
    AND?: AssetFingerprintWhereInput | AssetFingerprintWhereInput[]
    OR?: AssetFingerprintWhereInput[]
    NOT?: AssetFingerprintWhereInput | AssetFingerprintWhereInput[]
    workspaceId?: StringFilter<"AssetFingerprint"> | string
    assetType?: StringFilter<"AssetFingerprint"> | string
    fingerprint?: StringFilter<"AssetFingerprint"> | string
    license?: StringFilter<"AssetFingerprint"> | string
    url?: StringNullableFilter<"AssetFingerprint"> | string | null
    metadata?: JsonNullableFilter<"AssetFingerprint">
    createdAt?: DateTimeFilter<"AssetFingerprint"> | Date | string
    workspace?: XOR<WorkspaceScalarRelationFilter, WorkspaceWhereInput>
  }, "assetId">

  export type AssetFingerprintOrderByWithAggregationInput = {
    assetId?: SortOrder
    workspaceId?: SortOrder
    assetType?: SortOrder
    fingerprint?: SortOrder
    license?: SortOrder
    url?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AssetFingerprintCountOrderByAggregateInput
    _max?: AssetFingerprintMaxOrderByAggregateInput
    _min?: AssetFingerprintMinOrderByAggregateInput
  }

  export type AssetFingerprintScalarWhereWithAggregatesInput = {
    AND?: AssetFingerprintScalarWhereWithAggregatesInput | AssetFingerprintScalarWhereWithAggregatesInput[]
    OR?: AssetFingerprintScalarWhereWithAggregatesInput[]
    NOT?: AssetFingerprintScalarWhereWithAggregatesInput | AssetFingerprintScalarWhereWithAggregatesInput[]
    assetId?: StringWithAggregatesFilter<"AssetFingerprint"> | string
    workspaceId?: StringWithAggregatesFilter<"AssetFingerprint"> | string
    assetType?: StringWithAggregatesFilter<"AssetFingerprint"> | string
    fingerprint?: StringWithAggregatesFilter<"AssetFingerprint"> | string
    license?: StringWithAggregatesFilter<"AssetFingerprint"> | string
    url?: StringNullableWithAggregatesFilter<"AssetFingerprint"> | string | null
    metadata?: JsonNullableWithAggregatesFilter<"AssetFingerprint">
    createdAt?: DateTimeWithAggregatesFilter<"AssetFingerprint"> | Date | string
  }

  export type WorkspaceCreateInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceUncheckedCreateInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleUncheckedCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorUncheckedCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordUncheckedCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinUncheckedCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardUncheckedCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultUncheckedCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintUncheckedCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceUpdateInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceUncheckedUpdateInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUncheckedUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUncheckedUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUncheckedUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUncheckedUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUncheckedUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUncheckedUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUncheckedUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceCreateManyInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
  }

  export type WorkspaceUpdateManyMutationInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
  }

  export type WorkspaceUncheckedUpdateManyInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
  }

  export type WorkspaceRunCreateInput = {
    runId: string
    status: string
    startedAt: Date | string
    finishedAt?: Date | string | null
    costUsd?: Decimal | DecimalJsLike | number | string | null
    readinessScore?: Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    workspace: WorkspaceCreateNestedOneWithoutWorkspaceRunsInput
  }

  export type WorkspaceRunUncheckedCreateInput = {
    runId: string
    workspaceId: string
    status: string
    startedAt: Date | string
    finishedAt?: Date | string | null
    costUsd?: Decimal | DecimalJsLike | number | string | null
    readinessScore?: Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type WorkspaceRunUpdateInput = {
    runId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    costUsd?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    readinessScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    workspace?: WorkspaceUpdateOneRequiredWithoutWorkspaceRunsNestedInput
  }

  export type WorkspaceRunUncheckedUpdateInput = {
    runId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    costUsd?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    readinessScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkspaceRunCreateManyInput = {
    runId: string
    workspaceId: string
    status: string
    startedAt: Date | string
    finishedAt?: Date | string | null
    costUsd?: Decimal | DecimalJsLike | number | string | null
    readinessScore?: Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type WorkspaceRunUpdateManyMutationInput = {
    runId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    costUsd?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    readinessScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkspaceRunUncheckedUpdateManyInput = {
    runId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    costUsd?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    readinessScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditBundleCreateInput = {
    bundleId: string
    bundleData: JsonNullValueInput | InputJsonValue
    signatureKeyId: string
    signature: string
    signedAt: Date | string
    createdAt?: Date | string
    workspace: WorkspaceCreateNestedOneWithoutAuditBundlesInput
  }

  export type AuditBundleUncheckedCreateInput = {
    bundleId: string
    workspaceId: string
    bundleData: JsonNullValueInput | InputJsonValue
    signatureKeyId: string
    signature: string
    signedAt: Date | string
    createdAt?: Date | string
  }

  export type AuditBundleUpdateInput = {
    bundleId?: StringFieldUpdateOperationsInput | string
    bundleData?: JsonNullValueInput | InputJsonValue
    signatureKeyId?: StringFieldUpdateOperationsInput | string
    signature?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    workspace?: WorkspaceUpdateOneRequiredWithoutAuditBundlesNestedInput
  }

  export type AuditBundleUncheckedUpdateInput = {
    bundleId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    bundleData?: JsonNullValueInput | InputJsonValue
    signatureKeyId?: StringFieldUpdateOperationsInput | string
    signature?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditBundleCreateManyInput = {
    bundleId: string
    workspaceId: string
    bundleData: JsonNullValueInput | InputJsonValue
    signatureKeyId: string
    signature: string
    signedAt: Date | string
    createdAt?: Date | string
  }

  export type AuditBundleUpdateManyMutationInput = {
    bundleId?: StringFieldUpdateOperationsInput | string
    bundleData?: JsonNullValueInput | InputJsonValue
    signatureKeyId?: StringFieldUpdateOperationsInput | string
    signature?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditBundleUncheckedUpdateManyInput = {
    bundleId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    bundleData?: JsonNullValueInput | InputJsonValue
    signatureKeyId?: StringFieldUpdateOperationsInput | string
    signature?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorCreateInput = {
    connectorId: string
    platform: string
    accountId: string
    displayName: string
    status?: string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: Date | string | null
    ownerContact?: string | null
    credentialsRef?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    workspace: WorkspaceCreateNestedOneWithoutConnectorsInput
  }

  export type ConnectorUncheckedCreateInput = {
    connectorId: string
    workspaceId: string
    platform: string
    accountId: string
    displayName: string
    status?: string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: Date | string | null
    ownerContact?: string | null
    credentialsRef?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ConnectorUpdateInput = {
    connectorId?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    ownerContact?: NullableStringFieldUpdateOperationsInput | string | null
    credentialsRef?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    workspace?: WorkspaceUpdateOneRequiredWithoutConnectorsNestedInput
  }

  export type ConnectorUncheckedUpdateInput = {
    connectorId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    ownerContact?: NullableStringFieldUpdateOperationsInput | string | null
    credentialsRef?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorCreateManyInput = {
    connectorId: string
    workspaceId: string
    platform: string
    accountId: string
    displayName: string
    status?: string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: Date | string | null
    ownerContact?: string | null
    credentialsRef?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ConnectorUpdateManyMutationInput = {
    connectorId?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    ownerContact?: NullableStringFieldUpdateOperationsInput | string | null
    credentialsRef?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorUncheckedUpdateManyInput = {
    connectorId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    ownerContact?: NullableStringFieldUpdateOperationsInput | string | null
    credentialsRef?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConsentRecordCreateInput = {
    consentId: string
    consentType: string
    grantedBy: string
    grantedAt: Date | string
    expiresAt: Date | string
    documentRef?: string | null
    verifierSignature?: string | null
    createdAt?: Date | string
    workspace: WorkspaceCreateNestedOneWithoutConsentRecordsInput
  }

  export type ConsentRecordUncheckedCreateInput = {
    consentId: string
    workspaceId: string
    consentType: string
    grantedBy: string
    grantedAt: Date | string
    expiresAt: Date | string
    documentRef?: string | null
    verifierSignature?: string | null
    createdAt?: Date | string
  }

  export type ConsentRecordUpdateInput = {
    consentId?: StringFieldUpdateOperationsInput | string
    consentType?: StringFieldUpdateOperationsInput | string
    grantedBy?: StringFieldUpdateOperationsInput | string
    grantedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    documentRef?: NullableStringFieldUpdateOperationsInput | string | null
    verifierSignature?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    workspace?: WorkspaceUpdateOneRequiredWithoutConsentRecordsNestedInput
  }

  export type ConsentRecordUncheckedUpdateInput = {
    consentId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    consentType?: StringFieldUpdateOperationsInput | string
    grantedBy?: StringFieldUpdateOperationsInput | string
    grantedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    documentRef?: NullableStringFieldUpdateOperationsInput | string | null
    verifierSignature?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConsentRecordCreateManyInput = {
    consentId: string
    workspaceId: string
    consentType: string
    grantedBy: string
    grantedAt: Date | string
    expiresAt: Date | string
    documentRef?: string | null
    verifierSignature?: string | null
    createdAt?: Date | string
  }

  export type ConsentRecordUpdateManyMutationInput = {
    consentId?: StringFieldUpdateOperationsInput | string
    consentType?: StringFieldUpdateOperationsInput | string
    grantedBy?: StringFieldUpdateOperationsInput | string
    grantedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    documentRef?: NullableStringFieldUpdateOperationsInput | string | null
    verifierSignature?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConsentRecordUncheckedUpdateManyInput = {
    consentId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    consentType?: StringFieldUpdateOperationsInput | string
    grantedBy?: StringFieldUpdateOperationsInput | string
    grantedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    documentRef?: NullableStringFieldUpdateOperationsInput | string | null
    verifierSignature?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BrandTwinCreateInput = {
    brandId: string
    snapshotAt: Date | string
    brandData: JsonNullValueInput | InputJsonValue
    qualityScore?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
    workspace: WorkspaceCreateNestedOneWithoutBrandTwinsInput
  }

  export type BrandTwinUncheckedCreateInput = {
    brandId: string
    workspaceId: string
    snapshotAt: Date | string
    brandData: JsonNullValueInput | InputJsonValue
    qualityScore?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
  }

  export type BrandTwinUpdateInput = {
    brandId?: StringFieldUpdateOperationsInput | string
    snapshotAt?: DateTimeFieldUpdateOperationsInput | Date | string
    brandData?: JsonNullValueInput | InputJsonValue
    qualityScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    workspace?: WorkspaceUpdateOneRequiredWithoutBrandTwinsNestedInput
  }

  export type BrandTwinUncheckedUpdateInput = {
    brandId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    snapshotAt?: DateTimeFieldUpdateOperationsInput | Date | string
    brandData?: JsonNullValueInput | InputJsonValue
    qualityScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BrandTwinCreateManyInput = {
    brandId: string
    workspaceId: string
    snapshotAt: Date | string
    brandData: JsonNullValueInput | InputJsonValue
    qualityScore?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
  }

  export type BrandTwinUpdateManyMutationInput = {
    brandId?: StringFieldUpdateOperationsInput | string
    snapshotAt?: DateTimeFieldUpdateOperationsInput | Date | string
    brandData?: JsonNullValueInput | InputJsonValue
    qualityScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BrandTwinUncheckedUpdateManyInput = {
    brandId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    snapshotAt?: DateTimeFieldUpdateOperationsInput | Date | string
    brandData?: JsonNullValueInput | InputJsonValue
    qualityScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionCardCreateInput = {
    actionId: string
    title: string
    oneLine: string
    readinessScore: Decimal | DecimalJsLike | number | string
    expiresAt: Date | string
    status?: string
    approvedBy?: string | null
    approvedAt?: Date | string | null
    cardData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    workspace: WorkspaceCreateNestedOneWithoutDecisionCardsInput
  }

  export type DecisionCardUncheckedCreateInput = {
    actionId: string
    workspaceId: string
    title: string
    oneLine: string
    readinessScore: Decimal | DecimalJsLike | number | string
    expiresAt: Date | string
    status?: string
    approvedBy?: string | null
    approvedAt?: Date | string | null
    cardData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type DecisionCardUpdateInput = {
    actionId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    oneLine?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    approvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cardData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    workspace?: WorkspaceUpdateOneRequiredWithoutDecisionCardsNestedInput
  }

  export type DecisionCardUncheckedUpdateInput = {
    actionId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    oneLine?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    approvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cardData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionCardCreateManyInput = {
    actionId: string
    workspaceId: string
    title: string
    oneLine: string
    readinessScore: Decimal | DecimalJsLike | number | string
    expiresAt: Date | string
    status?: string
    approvedBy?: string | null
    approvedAt?: Date | string | null
    cardData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type DecisionCardUpdateManyMutationInput = {
    actionId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    oneLine?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    approvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cardData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionCardUncheckedUpdateManyInput = {
    actionId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    oneLine?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    approvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cardData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SimulationResultCreateInput = {
    simulationId: string
    readinessScore: Decimal | DecimalJsLike | number | string
    policyPassPct: Decimal | DecimalJsLike | number | string
    citationCoverage: Decimal | DecimalJsLike | number | string
    duplicationRisk: Decimal | DecimalJsLike | number | string
    costEstimateUsd: Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    workspace: WorkspaceCreateNestedOneWithoutSimulationResultsInput
  }

  export type SimulationResultUncheckedCreateInput = {
    simulationId: string
    workspaceId: string
    readinessScore: Decimal | DecimalJsLike | number | string
    policyPassPct: Decimal | DecimalJsLike | number | string
    citationCoverage: Decimal | DecimalJsLike | number | string
    duplicationRisk: Decimal | DecimalJsLike | number | string
    costEstimateUsd: Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type SimulationResultUpdateInput = {
    simulationId?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    workspace?: WorkspaceUpdateOneRequiredWithoutSimulationResultsNestedInput
  }

  export type SimulationResultUncheckedUpdateInput = {
    simulationId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SimulationResultCreateManyInput = {
    simulationId: string
    workspaceId: string
    readinessScore: Decimal | DecimalJsLike | number | string
    policyPassPct: Decimal | DecimalJsLike | number | string
    citationCoverage: Decimal | DecimalJsLike | number | string
    duplicationRisk: Decimal | DecimalJsLike | number | string
    costEstimateUsd: Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type SimulationResultUpdateManyMutationInput = {
    simulationId?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SimulationResultUncheckedUpdateManyInput = {
    simulationId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AssetFingerprintCreateInput = {
    assetId: string
    assetType: string
    fingerprint: string
    license: string
    url?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    workspace: WorkspaceCreateNestedOneWithoutAssetFingerprintsInput
  }

  export type AssetFingerprintUncheckedCreateInput = {
    assetId: string
    workspaceId: string
    assetType: string
    fingerprint: string
    license: string
    url?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AssetFingerprintUpdateInput = {
    assetId?: StringFieldUpdateOperationsInput | string
    assetType?: StringFieldUpdateOperationsInput | string
    fingerprint?: StringFieldUpdateOperationsInput | string
    license?: StringFieldUpdateOperationsInput | string
    url?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    workspace?: WorkspaceUpdateOneRequiredWithoutAssetFingerprintsNestedInput
  }

  export type AssetFingerprintUncheckedUpdateInput = {
    assetId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    assetType?: StringFieldUpdateOperationsInput | string
    fingerprint?: StringFieldUpdateOperationsInput | string
    license?: StringFieldUpdateOperationsInput | string
    url?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AssetFingerprintCreateManyInput = {
    assetId: string
    workspaceId: string
    assetType: string
    fingerprint: string
    license: string
    url?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AssetFingerprintUpdateManyMutationInput = {
    assetId?: StringFieldUpdateOperationsInput | string
    assetType?: StringFieldUpdateOperationsInput | string
    fingerprint?: StringFieldUpdateOperationsInput | string
    license?: StringFieldUpdateOperationsInput | string
    url?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AssetFingerprintUncheckedUpdateManyInput = {
    assetId?: StringFieldUpdateOperationsInput | string
    workspaceId?: StringFieldUpdateOperationsInput | string
    assetType?: StringFieldUpdateOperationsInput | string
    fingerprint?: StringFieldUpdateOperationsInput | string
    license?: StringFieldUpdateOperationsInput | string
    url?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type WorkspaceRunListRelationFilter = {
    every?: WorkspaceRunWhereInput
    some?: WorkspaceRunWhereInput
    none?: WorkspaceRunWhereInput
  }

  export type AuditBundleListRelationFilter = {
    every?: AuditBundleWhereInput
    some?: AuditBundleWhereInput
    none?: AuditBundleWhereInput
  }

  export type ConnectorListRelationFilter = {
    every?: ConnectorWhereInput
    some?: ConnectorWhereInput
    none?: ConnectorWhereInput
  }

  export type ConsentRecordListRelationFilter = {
    every?: ConsentRecordWhereInput
    some?: ConsentRecordWhereInput
    none?: ConsentRecordWhereInput
  }

  export type BrandTwinListRelationFilter = {
    every?: BrandTwinWhereInput
    some?: BrandTwinWhereInput
    none?: BrandTwinWhereInput
  }

  export type DecisionCardListRelationFilter = {
    every?: DecisionCardWhereInput
    some?: DecisionCardWhereInput
    none?: DecisionCardWhereInput
  }

  export type SimulationResultListRelationFilter = {
    every?: SimulationResultWhereInput
    some?: SimulationResultWhereInput
    none?: SimulationResultWhereInput
  }

  export type AssetFingerprintListRelationFilter = {
    every?: AssetFingerprintWhereInput
    some?: AssetFingerprintWhereInput
    none?: AssetFingerprintWhereInput
  }

  export type WorkspaceRunOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuditBundleOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ConnectorOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ConsentRecordOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type BrandTwinOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type DecisionCardOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SimulationResultOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AssetFingerprintOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type WorkspaceCountOrderByAggregateInput = {
    workspaceId?: SortOrder
    tenantId?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lifecycle?: SortOrder
    contractVersion?: SortOrder
    goals?: SortOrder
    primaryChannels?: SortOrder
    budget?: SortOrder
    approvalPolicy?: SortOrder
    riskProfile?: SortOrder
    dataRetention?: SortOrder
    ttlHours?: SortOrder
    policyBundleRef?: SortOrder
    policyBundleChecksum?: SortOrder
    contractData?: SortOrder
  }

  export type WorkspaceAvgOrderByAggregateInput = {
    ttlHours?: SortOrder
  }

  export type WorkspaceMaxOrderByAggregateInput = {
    workspaceId?: SortOrder
    tenantId?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lifecycle?: SortOrder
    contractVersion?: SortOrder
    riskProfile?: SortOrder
    ttlHours?: SortOrder
    policyBundleRef?: SortOrder
    policyBundleChecksum?: SortOrder
  }

  export type WorkspaceMinOrderByAggregateInput = {
    workspaceId?: SortOrder
    tenantId?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lifecycle?: SortOrder
    contractVersion?: SortOrder
    riskProfile?: SortOrder
    ttlHours?: SortOrder
    policyBundleRef?: SortOrder
    policyBundleChecksum?: SortOrder
  }

  export type WorkspaceSumOrderByAggregateInput = {
    ttlHours?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type WorkspaceScalarRelationFilter = {
    is?: WorkspaceWhereInput
    isNot?: WorkspaceWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type WorkspaceRunCountOrderByAggregateInput = {
    runId?: SortOrder
    workspaceId?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrder
    costUsd?: SortOrder
    readinessScore?: SortOrder
    results?: SortOrder
    createdAt?: SortOrder
  }

  export type WorkspaceRunAvgOrderByAggregateInput = {
    costUsd?: SortOrder
    readinessScore?: SortOrder
  }

  export type WorkspaceRunMaxOrderByAggregateInput = {
    runId?: SortOrder
    workspaceId?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrder
    costUsd?: SortOrder
    readinessScore?: SortOrder
    createdAt?: SortOrder
  }

  export type WorkspaceRunMinOrderByAggregateInput = {
    runId?: SortOrder
    workspaceId?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrder
    costUsd?: SortOrder
    readinessScore?: SortOrder
    createdAt?: SortOrder
  }

  export type WorkspaceRunSumOrderByAggregateInput = {
    costUsd?: SortOrder
    readinessScore?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type AuditBundleCountOrderByAggregateInput = {
    bundleId?: SortOrder
    workspaceId?: SortOrder
    bundleData?: SortOrder
    signatureKeyId?: SortOrder
    signature?: SortOrder
    signedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditBundleMaxOrderByAggregateInput = {
    bundleId?: SortOrder
    workspaceId?: SortOrder
    signatureKeyId?: SortOrder
    signature?: SortOrder
    signedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditBundleMinOrderByAggregateInput = {
    bundleId?: SortOrder
    workspaceId?: SortOrder
    signatureKeyId?: SortOrder
    signature?: SortOrder
    signedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type ConnectorIdx_workspace_platformCompoundUniqueInput = {
    workspaceId: string
    platform: string
    accountId: string
  }

  export type ConnectorCountOrderByAggregateInput = {
    connectorId?: SortOrder
    workspaceId?: SortOrder
    platform?: SortOrder
    accountId?: SortOrder
    displayName?: SortOrder
    status?: SortOrder
    scopes?: SortOrder
    lastConnectedAt?: SortOrder
    ownerContact?: SortOrder
    credentialsRef?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ConnectorMaxOrderByAggregateInput = {
    connectorId?: SortOrder
    workspaceId?: SortOrder
    platform?: SortOrder
    accountId?: SortOrder
    displayName?: SortOrder
    status?: SortOrder
    lastConnectedAt?: SortOrder
    ownerContact?: SortOrder
    credentialsRef?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ConnectorMinOrderByAggregateInput = {
    connectorId?: SortOrder
    workspaceId?: SortOrder
    platform?: SortOrder
    accountId?: SortOrder
    displayName?: SortOrder
    status?: SortOrder
    lastConnectedAt?: SortOrder
    ownerContact?: SortOrder
    credentialsRef?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type ConsentRecordCountOrderByAggregateInput = {
    consentId?: SortOrder
    workspaceId?: SortOrder
    consentType?: SortOrder
    grantedBy?: SortOrder
    grantedAt?: SortOrder
    expiresAt?: SortOrder
    documentRef?: SortOrder
    verifierSignature?: SortOrder
    createdAt?: SortOrder
  }

  export type ConsentRecordMaxOrderByAggregateInput = {
    consentId?: SortOrder
    workspaceId?: SortOrder
    consentType?: SortOrder
    grantedBy?: SortOrder
    grantedAt?: SortOrder
    expiresAt?: SortOrder
    documentRef?: SortOrder
    verifierSignature?: SortOrder
    createdAt?: SortOrder
  }

  export type ConsentRecordMinOrderByAggregateInput = {
    consentId?: SortOrder
    workspaceId?: SortOrder
    consentType?: SortOrder
    grantedBy?: SortOrder
    grantedAt?: SortOrder
    expiresAt?: SortOrder
    documentRef?: SortOrder
    verifierSignature?: SortOrder
    createdAt?: SortOrder
  }

  export type BrandTwinBrandIdSnapshotAtCompoundUniqueInput = {
    brandId: string
    snapshotAt: Date | string
  }

  export type BrandTwinCountOrderByAggregateInput = {
    brandId?: SortOrder
    workspaceId?: SortOrder
    snapshotAt?: SortOrder
    brandData?: SortOrder
    qualityScore?: SortOrder
    createdAt?: SortOrder
  }

  export type BrandTwinAvgOrderByAggregateInput = {
    qualityScore?: SortOrder
  }

  export type BrandTwinMaxOrderByAggregateInput = {
    brandId?: SortOrder
    workspaceId?: SortOrder
    snapshotAt?: SortOrder
    qualityScore?: SortOrder
    createdAt?: SortOrder
  }

  export type BrandTwinMinOrderByAggregateInput = {
    brandId?: SortOrder
    workspaceId?: SortOrder
    snapshotAt?: SortOrder
    qualityScore?: SortOrder
    createdAt?: SortOrder
  }

  export type BrandTwinSumOrderByAggregateInput = {
    qualityScore?: SortOrder
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type DecisionCardCountOrderByAggregateInput = {
    actionId?: SortOrder
    workspaceId?: SortOrder
    title?: SortOrder
    oneLine?: SortOrder
    readinessScore?: SortOrder
    expiresAt?: SortOrder
    status?: SortOrder
    approvedBy?: SortOrder
    approvedAt?: SortOrder
    cardData?: SortOrder
    createdAt?: SortOrder
  }

  export type DecisionCardAvgOrderByAggregateInput = {
    readinessScore?: SortOrder
  }

  export type DecisionCardMaxOrderByAggregateInput = {
    actionId?: SortOrder
    workspaceId?: SortOrder
    title?: SortOrder
    oneLine?: SortOrder
    readinessScore?: SortOrder
    expiresAt?: SortOrder
    status?: SortOrder
    approvedBy?: SortOrder
    approvedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type DecisionCardMinOrderByAggregateInput = {
    actionId?: SortOrder
    workspaceId?: SortOrder
    title?: SortOrder
    oneLine?: SortOrder
    readinessScore?: SortOrder
    expiresAt?: SortOrder
    status?: SortOrder
    approvedBy?: SortOrder
    approvedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type DecisionCardSumOrderByAggregateInput = {
    readinessScore?: SortOrder
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type SimulationResultCountOrderByAggregateInput = {
    simulationId?: SortOrder
    workspaceId?: SortOrder
    readinessScore?: SortOrder
    policyPassPct?: SortOrder
    citationCoverage?: SortOrder
    duplicationRisk?: SortOrder
    costEstimateUsd?: SortOrder
    traces?: SortOrder
    simulationData?: SortOrder
    createdAt?: SortOrder
  }

  export type SimulationResultAvgOrderByAggregateInput = {
    readinessScore?: SortOrder
    policyPassPct?: SortOrder
    citationCoverage?: SortOrder
    duplicationRisk?: SortOrder
    costEstimateUsd?: SortOrder
  }

  export type SimulationResultMaxOrderByAggregateInput = {
    simulationId?: SortOrder
    workspaceId?: SortOrder
    readinessScore?: SortOrder
    policyPassPct?: SortOrder
    citationCoverage?: SortOrder
    duplicationRisk?: SortOrder
    costEstimateUsd?: SortOrder
    createdAt?: SortOrder
  }

  export type SimulationResultMinOrderByAggregateInput = {
    simulationId?: SortOrder
    workspaceId?: SortOrder
    readinessScore?: SortOrder
    policyPassPct?: SortOrder
    citationCoverage?: SortOrder
    duplicationRisk?: SortOrder
    costEstimateUsd?: SortOrder
    createdAt?: SortOrder
  }

  export type SimulationResultSumOrderByAggregateInput = {
    readinessScore?: SortOrder
    policyPassPct?: SortOrder
    citationCoverage?: SortOrder
    duplicationRisk?: SortOrder
    costEstimateUsd?: SortOrder
  }

  export type AssetFingerprintCountOrderByAggregateInput = {
    assetId?: SortOrder
    workspaceId?: SortOrder
    assetType?: SortOrder
    fingerprint?: SortOrder
    license?: SortOrder
    url?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
  }

  export type AssetFingerprintMaxOrderByAggregateInput = {
    assetId?: SortOrder
    workspaceId?: SortOrder
    assetType?: SortOrder
    fingerprint?: SortOrder
    license?: SortOrder
    url?: SortOrder
    createdAt?: SortOrder
  }

  export type AssetFingerprintMinOrderByAggregateInput = {
    assetId?: SortOrder
    workspaceId?: SortOrder
    assetType?: SortOrder
    fingerprint?: SortOrder
    license?: SortOrder
    url?: SortOrder
    createdAt?: SortOrder
  }

  export type WorkspaceRunCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<WorkspaceRunCreateWithoutWorkspaceInput, WorkspaceRunUncheckedCreateWithoutWorkspaceInput> | WorkspaceRunCreateWithoutWorkspaceInput[] | WorkspaceRunUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: WorkspaceRunCreateOrConnectWithoutWorkspaceInput | WorkspaceRunCreateOrConnectWithoutWorkspaceInput[]
    createMany?: WorkspaceRunCreateManyWorkspaceInputEnvelope
    connect?: WorkspaceRunWhereUniqueInput | WorkspaceRunWhereUniqueInput[]
  }

  export type AuditBundleCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<AuditBundleCreateWithoutWorkspaceInput, AuditBundleUncheckedCreateWithoutWorkspaceInput> | AuditBundleCreateWithoutWorkspaceInput[] | AuditBundleUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: AuditBundleCreateOrConnectWithoutWorkspaceInput | AuditBundleCreateOrConnectWithoutWorkspaceInput[]
    createMany?: AuditBundleCreateManyWorkspaceInputEnvelope
    connect?: AuditBundleWhereUniqueInput | AuditBundleWhereUniqueInput[]
  }

  export type ConnectorCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<ConnectorCreateWithoutWorkspaceInput, ConnectorUncheckedCreateWithoutWorkspaceInput> | ConnectorCreateWithoutWorkspaceInput[] | ConnectorUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: ConnectorCreateOrConnectWithoutWorkspaceInput | ConnectorCreateOrConnectWithoutWorkspaceInput[]
    createMany?: ConnectorCreateManyWorkspaceInputEnvelope
    connect?: ConnectorWhereUniqueInput | ConnectorWhereUniqueInput[]
  }

  export type ConsentRecordCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<ConsentRecordCreateWithoutWorkspaceInput, ConsentRecordUncheckedCreateWithoutWorkspaceInput> | ConsentRecordCreateWithoutWorkspaceInput[] | ConsentRecordUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: ConsentRecordCreateOrConnectWithoutWorkspaceInput | ConsentRecordCreateOrConnectWithoutWorkspaceInput[]
    createMany?: ConsentRecordCreateManyWorkspaceInputEnvelope
    connect?: ConsentRecordWhereUniqueInput | ConsentRecordWhereUniqueInput[]
  }

  export type BrandTwinCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<BrandTwinCreateWithoutWorkspaceInput, BrandTwinUncheckedCreateWithoutWorkspaceInput> | BrandTwinCreateWithoutWorkspaceInput[] | BrandTwinUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: BrandTwinCreateOrConnectWithoutWorkspaceInput | BrandTwinCreateOrConnectWithoutWorkspaceInput[]
    createMany?: BrandTwinCreateManyWorkspaceInputEnvelope
    connect?: BrandTwinWhereUniqueInput | BrandTwinWhereUniqueInput[]
  }

  export type DecisionCardCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<DecisionCardCreateWithoutWorkspaceInput, DecisionCardUncheckedCreateWithoutWorkspaceInput> | DecisionCardCreateWithoutWorkspaceInput[] | DecisionCardUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: DecisionCardCreateOrConnectWithoutWorkspaceInput | DecisionCardCreateOrConnectWithoutWorkspaceInput[]
    createMany?: DecisionCardCreateManyWorkspaceInputEnvelope
    connect?: DecisionCardWhereUniqueInput | DecisionCardWhereUniqueInput[]
  }

  export type SimulationResultCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<SimulationResultCreateWithoutWorkspaceInput, SimulationResultUncheckedCreateWithoutWorkspaceInput> | SimulationResultCreateWithoutWorkspaceInput[] | SimulationResultUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: SimulationResultCreateOrConnectWithoutWorkspaceInput | SimulationResultCreateOrConnectWithoutWorkspaceInput[]
    createMany?: SimulationResultCreateManyWorkspaceInputEnvelope
    connect?: SimulationResultWhereUniqueInput | SimulationResultWhereUniqueInput[]
  }

  export type AssetFingerprintCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<AssetFingerprintCreateWithoutWorkspaceInput, AssetFingerprintUncheckedCreateWithoutWorkspaceInput> | AssetFingerprintCreateWithoutWorkspaceInput[] | AssetFingerprintUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: AssetFingerprintCreateOrConnectWithoutWorkspaceInput | AssetFingerprintCreateOrConnectWithoutWorkspaceInput[]
    createMany?: AssetFingerprintCreateManyWorkspaceInputEnvelope
    connect?: AssetFingerprintWhereUniqueInput | AssetFingerprintWhereUniqueInput[]
  }

  export type WorkspaceRunUncheckedCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<WorkspaceRunCreateWithoutWorkspaceInput, WorkspaceRunUncheckedCreateWithoutWorkspaceInput> | WorkspaceRunCreateWithoutWorkspaceInput[] | WorkspaceRunUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: WorkspaceRunCreateOrConnectWithoutWorkspaceInput | WorkspaceRunCreateOrConnectWithoutWorkspaceInput[]
    createMany?: WorkspaceRunCreateManyWorkspaceInputEnvelope
    connect?: WorkspaceRunWhereUniqueInput | WorkspaceRunWhereUniqueInput[]
  }

  export type AuditBundleUncheckedCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<AuditBundleCreateWithoutWorkspaceInput, AuditBundleUncheckedCreateWithoutWorkspaceInput> | AuditBundleCreateWithoutWorkspaceInput[] | AuditBundleUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: AuditBundleCreateOrConnectWithoutWorkspaceInput | AuditBundleCreateOrConnectWithoutWorkspaceInput[]
    createMany?: AuditBundleCreateManyWorkspaceInputEnvelope
    connect?: AuditBundleWhereUniqueInput | AuditBundleWhereUniqueInput[]
  }

  export type ConnectorUncheckedCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<ConnectorCreateWithoutWorkspaceInput, ConnectorUncheckedCreateWithoutWorkspaceInput> | ConnectorCreateWithoutWorkspaceInput[] | ConnectorUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: ConnectorCreateOrConnectWithoutWorkspaceInput | ConnectorCreateOrConnectWithoutWorkspaceInput[]
    createMany?: ConnectorCreateManyWorkspaceInputEnvelope
    connect?: ConnectorWhereUniqueInput | ConnectorWhereUniqueInput[]
  }

  export type ConsentRecordUncheckedCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<ConsentRecordCreateWithoutWorkspaceInput, ConsentRecordUncheckedCreateWithoutWorkspaceInput> | ConsentRecordCreateWithoutWorkspaceInput[] | ConsentRecordUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: ConsentRecordCreateOrConnectWithoutWorkspaceInput | ConsentRecordCreateOrConnectWithoutWorkspaceInput[]
    createMany?: ConsentRecordCreateManyWorkspaceInputEnvelope
    connect?: ConsentRecordWhereUniqueInput | ConsentRecordWhereUniqueInput[]
  }

  export type BrandTwinUncheckedCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<BrandTwinCreateWithoutWorkspaceInput, BrandTwinUncheckedCreateWithoutWorkspaceInput> | BrandTwinCreateWithoutWorkspaceInput[] | BrandTwinUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: BrandTwinCreateOrConnectWithoutWorkspaceInput | BrandTwinCreateOrConnectWithoutWorkspaceInput[]
    createMany?: BrandTwinCreateManyWorkspaceInputEnvelope
    connect?: BrandTwinWhereUniqueInput | BrandTwinWhereUniqueInput[]
  }

  export type DecisionCardUncheckedCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<DecisionCardCreateWithoutWorkspaceInput, DecisionCardUncheckedCreateWithoutWorkspaceInput> | DecisionCardCreateWithoutWorkspaceInput[] | DecisionCardUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: DecisionCardCreateOrConnectWithoutWorkspaceInput | DecisionCardCreateOrConnectWithoutWorkspaceInput[]
    createMany?: DecisionCardCreateManyWorkspaceInputEnvelope
    connect?: DecisionCardWhereUniqueInput | DecisionCardWhereUniqueInput[]
  }

  export type SimulationResultUncheckedCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<SimulationResultCreateWithoutWorkspaceInput, SimulationResultUncheckedCreateWithoutWorkspaceInput> | SimulationResultCreateWithoutWorkspaceInput[] | SimulationResultUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: SimulationResultCreateOrConnectWithoutWorkspaceInput | SimulationResultCreateOrConnectWithoutWorkspaceInput[]
    createMany?: SimulationResultCreateManyWorkspaceInputEnvelope
    connect?: SimulationResultWhereUniqueInput | SimulationResultWhereUniqueInput[]
  }

  export type AssetFingerprintUncheckedCreateNestedManyWithoutWorkspaceInput = {
    create?: XOR<AssetFingerprintCreateWithoutWorkspaceInput, AssetFingerprintUncheckedCreateWithoutWorkspaceInput> | AssetFingerprintCreateWithoutWorkspaceInput[] | AssetFingerprintUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: AssetFingerprintCreateOrConnectWithoutWorkspaceInput | AssetFingerprintCreateOrConnectWithoutWorkspaceInput[]
    createMany?: AssetFingerprintCreateManyWorkspaceInputEnvelope
    connect?: AssetFingerprintWhereUniqueInput | AssetFingerprintWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type WorkspaceRunUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<WorkspaceRunCreateWithoutWorkspaceInput, WorkspaceRunUncheckedCreateWithoutWorkspaceInput> | WorkspaceRunCreateWithoutWorkspaceInput[] | WorkspaceRunUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: WorkspaceRunCreateOrConnectWithoutWorkspaceInput | WorkspaceRunCreateOrConnectWithoutWorkspaceInput[]
    upsert?: WorkspaceRunUpsertWithWhereUniqueWithoutWorkspaceInput | WorkspaceRunUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: WorkspaceRunCreateManyWorkspaceInputEnvelope
    set?: WorkspaceRunWhereUniqueInput | WorkspaceRunWhereUniqueInput[]
    disconnect?: WorkspaceRunWhereUniqueInput | WorkspaceRunWhereUniqueInput[]
    delete?: WorkspaceRunWhereUniqueInput | WorkspaceRunWhereUniqueInput[]
    connect?: WorkspaceRunWhereUniqueInput | WorkspaceRunWhereUniqueInput[]
    update?: WorkspaceRunUpdateWithWhereUniqueWithoutWorkspaceInput | WorkspaceRunUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: WorkspaceRunUpdateManyWithWhereWithoutWorkspaceInput | WorkspaceRunUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: WorkspaceRunScalarWhereInput | WorkspaceRunScalarWhereInput[]
  }

  export type AuditBundleUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<AuditBundleCreateWithoutWorkspaceInput, AuditBundleUncheckedCreateWithoutWorkspaceInput> | AuditBundleCreateWithoutWorkspaceInput[] | AuditBundleUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: AuditBundleCreateOrConnectWithoutWorkspaceInput | AuditBundleCreateOrConnectWithoutWorkspaceInput[]
    upsert?: AuditBundleUpsertWithWhereUniqueWithoutWorkspaceInput | AuditBundleUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: AuditBundleCreateManyWorkspaceInputEnvelope
    set?: AuditBundleWhereUniqueInput | AuditBundleWhereUniqueInput[]
    disconnect?: AuditBundleWhereUniqueInput | AuditBundleWhereUniqueInput[]
    delete?: AuditBundleWhereUniqueInput | AuditBundleWhereUniqueInput[]
    connect?: AuditBundleWhereUniqueInput | AuditBundleWhereUniqueInput[]
    update?: AuditBundleUpdateWithWhereUniqueWithoutWorkspaceInput | AuditBundleUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: AuditBundleUpdateManyWithWhereWithoutWorkspaceInput | AuditBundleUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: AuditBundleScalarWhereInput | AuditBundleScalarWhereInput[]
  }

  export type ConnectorUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<ConnectorCreateWithoutWorkspaceInput, ConnectorUncheckedCreateWithoutWorkspaceInput> | ConnectorCreateWithoutWorkspaceInput[] | ConnectorUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: ConnectorCreateOrConnectWithoutWorkspaceInput | ConnectorCreateOrConnectWithoutWorkspaceInput[]
    upsert?: ConnectorUpsertWithWhereUniqueWithoutWorkspaceInput | ConnectorUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: ConnectorCreateManyWorkspaceInputEnvelope
    set?: ConnectorWhereUniqueInput | ConnectorWhereUniqueInput[]
    disconnect?: ConnectorWhereUniqueInput | ConnectorWhereUniqueInput[]
    delete?: ConnectorWhereUniqueInput | ConnectorWhereUniqueInput[]
    connect?: ConnectorWhereUniqueInput | ConnectorWhereUniqueInput[]
    update?: ConnectorUpdateWithWhereUniqueWithoutWorkspaceInput | ConnectorUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: ConnectorUpdateManyWithWhereWithoutWorkspaceInput | ConnectorUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: ConnectorScalarWhereInput | ConnectorScalarWhereInput[]
  }

  export type ConsentRecordUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<ConsentRecordCreateWithoutWorkspaceInput, ConsentRecordUncheckedCreateWithoutWorkspaceInput> | ConsentRecordCreateWithoutWorkspaceInput[] | ConsentRecordUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: ConsentRecordCreateOrConnectWithoutWorkspaceInput | ConsentRecordCreateOrConnectWithoutWorkspaceInput[]
    upsert?: ConsentRecordUpsertWithWhereUniqueWithoutWorkspaceInput | ConsentRecordUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: ConsentRecordCreateManyWorkspaceInputEnvelope
    set?: ConsentRecordWhereUniqueInput | ConsentRecordWhereUniqueInput[]
    disconnect?: ConsentRecordWhereUniqueInput | ConsentRecordWhereUniqueInput[]
    delete?: ConsentRecordWhereUniqueInput | ConsentRecordWhereUniqueInput[]
    connect?: ConsentRecordWhereUniqueInput | ConsentRecordWhereUniqueInput[]
    update?: ConsentRecordUpdateWithWhereUniqueWithoutWorkspaceInput | ConsentRecordUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: ConsentRecordUpdateManyWithWhereWithoutWorkspaceInput | ConsentRecordUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: ConsentRecordScalarWhereInput | ConsentRecordScalarWhereInput[]
  }

  export type BrandTwinUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<BrandTwinCreateWithoutWorkspaceInput, BrandTwinUncheckedCreateWithoutWorkspaceInput> | BrandTwinCreateWithoutWorkspaceInput[] | BrandTwinUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: BrandTwinCreateOrConnectWithoutWorkspaceInput | BrandTwinCreateOrConnectWithoutWorkspaceInput[]
    upsert?: BrandTwinUpsertWithWhereUniqueWithoutWorkspaceInput | BrandTwinUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: BrandTwinCreateManyWorkspaceInputEnvelope
    set?: BrandTwinWhereUniqueInput | BrandTwinWhereUniqueInput[]
    disconnect?: BrandTwinWhereUniqueInput | BrandTwinWhereUniqueInput[]
    delete?: BrandTwinWhereUniqueInput | BrandTwinWhereUniqueInput[]
    connect?: BrandTwinWhereUniqueInput | BrandTwinWhereUniqueInput[]
    update?: BrandTwinUpdateWithWhereUniqueWithoutWorkspaceInput | BrandTwinUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: BrandTwinUpdateManyWithWhereWithoutWorkspaceInput | BrandTwinUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: BrandTwinScalarWhereInput | BrandTwinScalarWhereInput[]
  }

  export type DecisionCardUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<DecisionCardCreateWithoutWorkspaceInput, DecisionCardUncheckedCreateWithoutWorkspaceInput> | DecisionCardCreateWithoutWorkspaceInput[] | DecisionCardUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: DecisionCardCreateOrConnectWithoutWorkspaceInput | DecisionCardCreateOrConnectWithoutWorkspaceInput[]
    upsert?: DecisionCardUpsertWithWhereUniqueWithoutWorkspaceInput | DecisionCardUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: DecisionCardCreateManyWorkspaceInputEnvelope
    set?: DecisionCardWhereUniqueInput | DecisionCardWhereUniqueInput[]
    disconnect?: DecisionCardWhereUniqueInput | DecisionCardWhereUniqueInput[]
    delete?: DecisionCardWhereUniqueInput | DecisionCardWhereUniqueInput[]
    connect?: DecisionCardWhereUniqueInput | DecisionCardWhereUniqueInput[]
    update?: DecisionCardUpdateWithWhereUniqueWithoutWorkspaceInput | DecisionCardUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: DecisionCardUpdateManyWithWhereWithoutWorkspaceInput | DecisionCardUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: DecisionCardScalarWhereInput | DecisionCardScalarWhereInput[]
  }

  export type SimulationResultUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<SimulationResultCreateWithoutWorkspaceInput, SimulationResultUncheckedCreateWithoutWorkspaceInput> | SimulationResultCreateWithoutWorkspaceInput[] | SimulationResultUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: SimulationResultCreateOrConnectWithoutWorkspaceInput | SimulationResultCreateOrConnectWithoutWorkspaceInput[]
    upsert?: SimulationResultUpsertWithWhereUniqueWithoutWorkspaceInput | SimulationResultUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: SimulationResultCreateManyWorkspaceInputEnvelope
    set?: SimulationResultWhereUniqueInput | SimulationResultWhereUniqueInput[]
    disconnect?: SimulationResultWhereUniqueInput | SimulationResultWhereUniqueInput[]
    delete?: SimulationResultWhereUniqueInput | SimulationResultWhereUniqueInput[]
    connect?: SimulationResultWhereUniqueInput | SimulationResultWhereUniqueInput[]
    update?: SimulationResultUpdateWithWhereUniqueWithoutWorkspaceInput | SimulationResultUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: SimulationResultUpdateManyWithWhereWithoutWorkspaceInput | SimulationResultUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: SimulationResultScalarWhereInput | SimulationResultScalarWhereInput[]
  }

  export type AssetFingerprintUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<AssetFingerprintCreateWithoutWorkspaceInput, AssetFingerprintUncheckedCreateWithoutWorkspaceInput> | AssetFingerprintCreateWithoutWorkspaceInput[] | AssetFingerprintUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: AssetFingerprintCreateOrConnectWithoutWorkspaceInput | AssetFingerprintCreateOrConnectWithoutWorkspaceInput[]
    upsert?: AssetFingerprintUpsertWithWhereUniqueWithoutWorkspaceInput | AssetFingerprintUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: AssetFingerprintCreateManyWorkspaceInputEnvelope
    set?: AssetFingerprintWhereUniqueInput | AssetFingerprintWhereUniqueInput[]
    disconnect?: AssetFingerprintWhereUniqueInput | AssetFingerprintWhereUniqueInput[]
    delete?: AssetFingerprintWhereUniqueInput | AssetFingerprintWhereUniqueInput[]
    connect?: AssetFingerprintWhereUniqueInput | AssetFingerprintWhereUniqueInput[]
    update?: AssetFingerprintUpdateWithWhereUniqueWithoutWorkspaceInput | AssetFingerprintUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: AssetFingerprintUpdateManyWithWhereWithoutWorkspaceInput | AssetFingerprintUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: AssetFingerprintScalarWhereInput | AssetFingerprintScalarWhereInput[]
  }

  export type WorkspaceRunUncheckedUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<WorkspaceRunCreateWithoutWorkspaceInput, WorkspaceRunUncheckedCreateWithoutWorkspaceInput> | WorkspaceRunCreateWithoutWorkspaceInput[] | WorkspaceRunUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: WorkspaceRunCreateOrConnectWithoutWorkspaceInput | WorkspaceRunCreateOrConnectWithoutWorkspaceInput[]
    upsert?: WorkspaceRunUpsertWithWhereUniqueWithoutWorkspaceInput | WorkspaceRunUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: WorkspaceRunCreateManyWorkspaceInputEnvelope
    set?: WorkspaceRunWhereUniqueInput | WorkspaceRunWhereUniqueInput[]
    disconnect?: WorkspaceRunWhereUniqueInput | WorkspaceRunWhereUniqueInput[]
    delete?: WorkspaceRunWhereUniqueInput | WorkspaceRunWhereUniqueInput[]
    connect?: WorkspaceRunWhereUniqueInput | WorkspaceRunWhereUniqueInput[]
    update?: WorkspaceRunUpdateWithWhereUniqueWithoutWorkspaceInput | WorkspaceRunUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: WorkspaceRunUpdateManyWithWhereWithoutWorkspaceInput | WorkspaceRunUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: WorkspaceRunScalarWhereInput | WorkspaceRunScalarWhereInput[]
  }

  export type AuditBundleUncheckedUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<AuditBundleCreateWithoutWorkspaceInput, AuditBundleUncheckedCreateWithoutWorkspaceInput> | AuditBundleCreateWithoutWorkspaceInput[] | AuditBundleUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: AuditBundleCreateOrConnectWithoutWorkspaceInput | AuditBundleCreateOrConnectWithoutWorkspaceInput[]
    upsert?: AuditBundleUpsertWithWhereUniqueWithoutWorkspaceInput | AuditBundleUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: AuditBundleCreateManyWorkspaceInputEnvelope
    set?: AuditBundleWhereUniqueInput | AuditBundleWhereUniqueInput[]
    disconnect?: AuditBundleWhereUniqueInput | AuditBundleWhereUniqueInput[]
    delete?: AuditBundleWhereUniqueInput | AuditBundleWhereUniqueInput[]
    connect?: AuditBundleWhereUniqueInput | AuditBundleWhereUniqueInput[]
    update?: AuditBundleUpdateWithWhereUniqueWithoutWorkspaceInput | AuditBundleUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: AuditBundleUpdateManyWithWhereWithoutWorkspaceInput | AuditBundleUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: AuditBundleScalarWhereInput | AuditBundleScalarWhereInput[]
  }

  export type ConnectorUncheckedUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<ConnectorCreateWithoutWorkspaceInput, ConnectorUncheckedCreateWithoutWorkspaceInput> | ConnectorCreateWithoutWorkspaceInput[] | ConnectorUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: ConnectorCreateOrConnectWithoutWorkspaceInput | ConnectorCreateOrConnectWithoutWorkspaceInput[]
    upsert?: ConnectorUpsertWithWhereUniqueWithoutWorkspaceInput | ConnectorUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: ConnectorCreateManyWorkspaceInputEnvelope
    set?: ConnectorWhereUniqueInput | ConnectorWhereUniqueInput[]
    disconnect?: ConnectorWhereUniqueInput | ConnectorWhereUniqueInput[]
    delete?: ConnectorWhereUniqueInput | ConnectorWhereUniqueInput[]
    connect?: ConnectorWhereUniqueInput | ConnectorWhereUniqueInput[]
    update?: ConnectorUpdateWithWhereUniqueWithoutWorkspaceInput | ConnectorUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: ConnectorUpdateManyWithWhereWithoutWorkspaceInput | ConnectorUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: ConnectorScalarWhereInput | ConnectorScalarWhereInput[]
  }

  export type ConsentRecordUncheckedUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<ConsentRecordCreateWithoutWorkspaceInput, ConsentRecordUncheckedCreateWithoutWorkspaceInput> | ConsentRecordCreateWithoutWorkspaceInput[] | ConsentRecordUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: ConsentRecordCreateOrConnectWithoutWorkspaceInput | ConsentRecordCreateOrConnectWithoutWorkspaceInput[]
    upsert?: ConsentRecordUpsertWithWhereUniqueWithoutWorkspaceInput | ConsentRecordUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: ConsentRecordCreateManyWorkspaceInputEnvelope
    set?: ConsentRecordWhereUniqueInput | ConsentRecordWhereUniqueInput[]
    disconnect?: ConsentRecordWhereUniqueInput | ConsentRecordWhereUniqueInput[]
    delete?: ConsentRecordWhereUniqueInput | ConsentRecordWhereUniqueInput[]
    connect?: ConsentRecordWhereUniqueInput | ConsentRecordWhereUniqueInput[]
    update?: ConsentRecordUpdateWithWhereUniqueWithoutWorkspaceInput | ConsentRecordUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: ConsentRecordUpdateManyWithWhereWithoutWorkspaceInput | ConsentRecordUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: ConsentRecordScalarWhereInput | ConsentRecordScalarWhereInput[]
  }

  export type BrandTwinUncheckedUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<BrandTwinCreateWithoutWorkspaceInput, BrandTwinUncheckedCreateWithoutWorkspaceInput> | BrandTwinCreateWithoutWorkspaceInput[] | BrandTwinUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: BrandTwinCreateOrConnectWithoutWorkspaceInput | BrandTwinCreateOrConnectWithoutWorkspaceInput[]
    upsert?: BrandTwinUpsertWithWhereUniqueWithoutWorkspaceInput | BrandTwinUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: BrandTwinCreateManyWorkspaceInputEnvelope
    set?: BrandTwinWhereUniqueInput | BrandTwinWhereUniqueInput[]
    disconnect?: BrandTwinWhereUniqueInput | BrandTwinWhereUniqueInput[]
    delete?: BrandTwinWhereUniqueInput | BrandTwinWhereUniqueInput[]
    connect?: BrandTwinWhereUniqueInput | BrandTwinWhereUniqueInput[]
    update?: BrandTwinUpdateWithWhereUniqueWithoutWorkspaceInput | BrandTwinUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: BrandTwinUpdateManyWithWhereWithoutWorkspaceInput | BrandTwinUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: BrandTwinScalarWhereInput | BrandTwinScalarWhereInput[]
  }

  export type DecisionCardUncheckedUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<DecisionCardCreateWithoutWorkspaceInput, DecisionCardUncheckedCreateWithoutWorkspaceInput> | DecisionCardCreateWithoutWorkspaceInput[] | DecisionCardUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: DecisionCardCreateOrConnectWithoutWorkspaceInput | DecisionCardCreateOrConnectWithoutWorkspaceInput[]
    upsert?: DecisionCardUpsertWithWhereUniqueWithoutWorkspaceInput | DecisionCardUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: DecisionCardCreateManyWorkspaceInputEnvelope
    set?: DecisionCardWhereUniqueInput | DecisionCardWhereUniqueInput[]
    disconnect?: DecisionCardWhereUniqueInput | DecisionCardWhereUniqueInput[]
    delete?: DecisionCardWhereUniqueInput | DecisionCardWhereUniqueInput[]
    connect?: DecisionCardWhereUniqueInput | DecisionCardWhereUniqueInput[]
    update?: DecisionCardUpdateWithWhereUniqueWithoutWorkspaceInput | DecisionCardUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: DecisionCardUpdateManyWithWhereWithoutWorkspaceInput | DecisionCardUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: DecisionCardScalarWhereInput | DecisionCardScalarWhereInput[]
  }

  export type SimulationResultUncheckedUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<SimulationResultCreateWithoutWorkspaceInput, SimulationResultUncheckedCreateWithoutWorkspaceInput> | SimulationResultCreateWithoutWorkspaceInput[] | SimulationResultUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: SimulationResultCreateOrConnectWithoutWorkspaceInput | SimulationResultCreateOrConnectWithoutWorkspaceInput[]
    upsert?: SimulationResultUpsertWithWhereUniqueWithoutWorkspaceInput | SimulationResultUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: SimulationResultCreateManyWorkspaceInputEnvelope
    set?: SimulationResultWhereUniqueInput | SimulationResultWhereUniqueInput[]
    disconnect?: SimulationResultWhereUniqueInput | SimulationResultWhereUniqueInput[]
    delete?: SimulationResultWhereUniqueInput | SimulationResultWhereUniqueInput[]
    connect?: SimulationResultWhereUniqueInput | SimulationResultWhereUniqueInput[]
    update?: SimulationResultUpdateWithWhereUniqueWithoutWorkspaceInput | SimulationResultUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: SimulationResultUpdateManyWithWhereWithoutWorkspaceInput | SimulationResultUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: SimulationResultScalarWhereInput | SimulationResultScalarWhereInput[]
  }

  export type AssetFingerprintUncheckedUpdateManyWithoutWorkspaceNestedInput = {
    create?: XOR<AssetFingerprintCreateWithoutWorkspaceInput, AssetFingerprintUncheckedCreateWithoutWorkspaceInput> | AssetFingerprintCreateWithoutWorkspaceInput[] | AssetFingerprintUncheckedCreateWithoutWorkspaceInput[]
    connectOrCreate?: AssetFingerprintCreateOrConnectWithoutWorkspaceInput | AssetFingerprintCreateOrConnectWithoutWorkspaceInput[]
    upsert?: AssetFingerprintUpsertWithWhereUniqueWithoutWorkspaceInput | AssetFingerprintUpsertWithWhereUniqueWithoutWorkspaceInput[]
    createMany?: AssetFingerprintCreateManyWorkspaceInputEnvelope
    set?: AssetFingerprintWhereUniqueInput | AssetFingerprintWhereUniqueInput[]
    disconnect?: AssetFingerprintWhereUniqueInput | AssetFingerprintWhereUniqueInput[]
    delete?: AssetFingerprintWhereUniqueInput | AssetFingerprintWhereUniqueInput[]
    connect?: AssetFingerprintWhereUniqueInput | AssetFingerprintWhereUniqueInput[]
    update?: AssetFingerprintUpdateWithWhereUniqueWithoutWorkspaceInput | AssetFingerprintUpdateWithWhereUniqueWithoutWorkspaceInput[]
    updateMany?: AssetFingerprintUpdateManyWithWhereWithoutWorkspaceInput | AssetFingerprintUpdateManyWithWhereWithoutWorkspaceInput[]
    deleteMany?: AssetFingerprintScalarWhereInput | AssetFingerprintScalarWhereInput[]
  }

  export type WorkspaceCreateNestedOneWithoutWorkspaceRunsInput = {
    create?: XOR<WorkspaceCreateWithoutWorkspaceRunsInput, WorkspaceUncheckedCreateWithoutWorkspaceRunsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutWorkspaceRunsInput
    connect?: WorkspaceWhereUniqueInput
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type WorkspaceUpdateOneRequiredWithoutWorkspaceRunsNestedInput = {
    create?: XOR<WorkspaceCreateWithoutWorkspaceRunsInput, WorkspaceUncheckedCreateWithoutWorkspaceRunsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutWorkspaceRunsInput
    upsert?: WorkspaceUpsertWithoutWorkspaceRunsInput
    connect?: WorkspaceWhereUniqueInput
    update?: XOR<XOR<WorkspaceUpdateToOneWithWhereWithoutWorkspaceRunsInput, WorkspaceUpdateWithoutWorkspaceRunsInput>, WorkspaceUncheckedUpdateWithoutWorkspaceRunsInput>
  }

  export type WorkspaceCreateNestedOneWithoutAuditBundlesInput = {
    create?: XOR<WorkspaceCreateWithoutAuditBundlesInput, WorkspaceUncheckedCreateWithoutAuditBundlesInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutAuditBundlesInput
    connect?: WorkspaceWhereUniqueInput
  }

  export type WorkspaceUpdateOneRequiredWithoutAuditBundlesNestedInput = {
    create?: XOR<WorkspaceCreateWithoutAuditBundlesInput, WorkspaceUncheckedCreateWithoutAuditBundlesInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutAuditBundlesInput
    upsert?: WorkspaceUpsertWithoutAuditBundlesInput
    connect?: WorkspaceWhereUniqueInput
    update?: XOR<XOR<WorkspaceUpdateToOneWithWhereWithoutAuditBundlesInput, WorkspaceUpdateWithoutAuditBundlesInput>, WorkspaceUncheckedUpdateWithoutAuditBundlesInput>
  }

  export type WorkspaceCreateNestedOneWithoutConnectorsInput = {
    create?: XOR<WorkspaceCreateWithoutConnectorsInput, WorkspaceUncheckedCreateWithoutConnectorsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutConnectorsInput
    connect?: WorkspaceWhereUniqueInput
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type WorkspaceUpdateOneRequiredWithoutConnectorsNestedInput = {
    create?: XOR<WorkspaceCreateWithoutConnectorsInput, WorkspaceUncheckedCreateWithoutConnectorsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutConnectorsInput
    upsert?: WorkspaceUpsertWithoutConnectorsInput
    connect?: WorkspaceWhereUniqueInput
    update?: XOR<XOR<WorkspaceUpdateToOneWithWhereWithoutConnectorsInput, WorkspaceUpdateWithoutConnectorsInput>, WorkspaceUncheckedUpdateWithoutConnectorsInput>
  }

  export type WorkspaceCreateNestedOneWithoutConsentRecordsInput = {
    create?: XOR<WorkspaceCreateWithoutConsentRecordsInput, WorkspaceUncheckedCreateWithoutConsentRecordsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutConsentRecordsInput
    connect?: WorkspaceWhereUniqueInput
  }

  export type WorkspaceUpdateOneRequiredWithoutConsentRecordsNestedInput = {
    create?: XOR<WorkspaceCreateWithoutConsentRecordsInput, WorkspaceUncheckedCreateWithoutConsentRecordsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutConsentRecordsInput
    upsert?: WorkspaceUpsertWithoutConsentRecordsInput
    connect?: WorkspaceWhereUniqueInput
    update?: XOR<XOR<WorkspaceUpdateToOneWithWhereWithoutConsentRecordsInput, WorkspaceUpdateWithoutConsentRecordsInput>, WorkspaceUncheckedUpdateWithoutConsentRecordsInput>
  }

  export type WorkspaceCreateNestedOneWithoutBrandTwinsInput = {
    create?: XOR<WorkspaceCreateWithoutBrandTwinsInput, WorkspaceUncheckedCreateWithoutBrandTwinsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutBrandTwinsInput
    connect?: WorkspaceWhereUniqueInput
  }

  export type WorkspaceUpdateOneRequiredWithoutBrandTwinsNestedInput = {
    create?: XOR<WorkspaceCreateWithoutBrandTwinsInput, WorkspaceUncheckedCreateWithoutBrandTwinsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutBrandTwinsInput
    upsert?: WorkspaceUpsertWithoutBrandTwinsInput
    connect?: WorkspaceWhereUniqueInput
    update?: XOR<XOR<WorkspaceUpdateToOneWithWhereWithoutBrandTwinsInput, WorkspaceUpdateWithoutBrandTwinsInput>, WorkspaceUncheckedUpdateWithoutBrandTwinsInput>
  }

  export type WorkspaceCreateNestedOneWithoutDecisionCardsInput = {
    create?: XOR<WorkspaceCreateWithoutDecisionCardsInput, WorkspaceUncheckedCreateWithoutDecisionCardsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutDecisionCardsInput
    connect?: WorkspaceWhereUniqueInput
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type WorkspaceUpdateOneRequiredWithoutDecisionCardsNestedInput = {
    create?: XOR<WorkspaceCreateWithoutDecisionCardsInput, WorkspaceUncheckedCreateWithoutDecisionCardsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutDecisionCardsInput
    upsert?: WorkspaceUpsertWithoutDecisionCardsInput
    connect?: WorkspaceWhereUniqueInput
    update?: XOR<XOR<WorkspaceUpdateToOneWithWhereWithoutDecisionCardsInput, WorkspaceUpdateWithoutDecisionCardsInput>, WorkspaceUncheckedUpdateWithoutDecisionCardsInput>
  }

  export type WorkspaceCreateNestedOneWithoutSimulationResultsInput = {
    create?: XOR<WorkspaceCreateWithoutSimulationResultsInput, WorkspaceUncheckedCreateWithoutSimulationResultsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutSimulationResultsInput
    connect?: WorkspaceWhereUniqueInput
  }

  export type WorkspaceUpdateOneRequiredWithoutSimulationResultsNestedInput = {
    create?: XOR<WorkspaceCreateWithoutSimulationResultsInput, WorkspaceUncheckedCreateWithoutSimulationResultsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutSimulationResultsInput
    upsert?: WorkspaceUpsertWithoutSimulationResultsInput
    connect?: WorkspaceWhereUniqueInput
    update?: XOR<XOR<WorkspaceUpdateToOneWithWhereWithoutSimulationResultsInput, WorkspaceUpdateWithoutSimulationResultsInput>, WorkspaceUncheckedUpdateWithoutSimulationResultsInput>
  }

  export type WorkspaceCreateNestedOneWithoutAssetFingerprintsInput = {
    create?: XOR<WorkspaceCreateWithoutAssetFingerprintsInput, WorkspaceUncheckedCreateWithoutAssetFingerprintsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutAssetFingerprintsInput
    connect?: WorkspaceWhereUniqueInput
  }

  export type WorkspaceUpdateOneRequiredWithoutAssetFingerprintsNestedInput = {
    create?: XOR<WorkspaceCreateWithoutAssetFingerprintsInput, WorkspaceUncheckedCreateWithoutAssetFingerprintsInput>
    connectOrCreate?: WorkspaceCreateOrConnectWithoutAssetFingerprintsInput
    upsert?: WorkspaceUpsertWithoutAssetFingerprintsInput
    connect?: WorkspaceWhereUniqueInput
    update?: XOR<XOR<WorkspaceUpdateToOneWithWhereWithoutAssetFingerprintsInput, WorkspaceUpdateWithoutAssetFingerprintsInput>, WorkspaceUncheckedUpdateWithoutAssetFingerprintsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type WorkspaceRunCreateWithoutWorkspaceInput = {
    runId: string
    status: string
    startedAt: Date | string
    finishedAt?: Date | string | null
    costUsd?: Decimal | DecimalJsLike | number | string | null
    readinessScore?: Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type WorkspaceRunUncheckedCreateWithoutWorkspaceInput = {
    runId: string
    status: string
    startedAt: Date | string
    finishedAt?: Date | string | null
    costUsd?: Decimal | DecimalJsLike | number | string | null
    readinessScore?: Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type WorkspaceRunCreateOrConnectWithoutWorkspaceInput = {
    where: WorkspaceRunWhereUniqueInput
    create: XOR<WorkspaceRunCreateWithoutWorkspaceInput, WorkspaceRunUncheckedCreateWithoutWorkspaceInput>
  }

  export type WorkspaceRunCreateManyWorkspaceInputEnvelope = {
    data: WorkspaceRunCreateManyWorkspaceInput | WorkspaceRunCreateManyWorkspaceInput[]
    skipDuplicates?: boolean
  }

  export type AuditBundleCreateWithoutWorkspaceInput = {
    bundleId: string
    bundleData: JsonNullValueInput | InputJsonValue
    signatureKeyId: string
    signature: string
    signedAt: Date | string
    createdAt?: Date | string
  }

  export type AuditBundleUncheckedCreateWithoutWorkspaceInput = {
    bundleId: string
    bundleData: JsonNullValueInput | InputJsonValue
    signatureKeyId: string
    signature: string
    signedAt: Date | string
    createdAt?: Date | string
  }

  export type AuditBundleCreateOrConnectWithoutWorkspaceInput = {
    where: AuditBundleWhereUniqueInput
    create: XOR<AuditBundleCreateWithoutWorkspaceInput, AuditBundleUncheckedCreateWithoutWorkspaceInput>
  }

  export type AuditBundleCreateManyWorkspaceInputEnvelope = {
    data: AuditBundleCreateManyWorkspaceInput | AuditBundleCreateManyWorkspaceInput[]
    skipDuplicates?: boolean
  }

  export type ConnectorCreateWithoutWorkspaceInput = {
    connectorId: string
    platform: string
    accountId: string
    displayName: string
    status?: string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: Date | string | null
    ownerContact?: string | null
    credentialsRef?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ConnectorUncheckedCreateWithoutWorkspaceInput = {
    connectorId: string
    platform: string
    accountId: string
    displayName: string
    status?: string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: Date | string | null
    ownerContact?: string | null
    credentialsRef?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ConnectorCreateOrConnectWithoutWorkspaceInput = {
    where: ConnectorWhereUniqueInput
    create: XOR<ConnectorCreateWithoutWorkspaceInput, ConnectorUncheckedCreateWithoutWorkspaceInput>
  }

  export type ConnectorCreateManyWorkspaceInputEnvelope = {
    data: ConnectorCreateManyWorkspaceInput | ConnectorCreateManyWorkspaceInput[]
    skipDuplicates?: boolean
  }

  export type ConsentRecordCreateWithoutWorkspaceInput = {
    consentId: string
    consentType: string
    grantedBy: string
    grantedAt: Date | string
    expiresAt: Date | string
    documentRef?: string | null
    verifierSignature?: string | null
    createdAt?: Date | string
  }

  export type ConsentRecordUncheckedCreateWithoutWorkspaceInput = {
    consentId: string
    consentType: string
    grantedBy: string
    grantedAt: Date | string
    expiresAt: Date | string
    documentRef?: string | null
    verifierSignature?: string | null
    createdAt?: Date | string
  }

  export type ConsentRecordCreateOrConnectWithoutWorkspaceInput = {
    where: ConsentRecordWhereUniqueInput
    create: XOR<ConsentRecordCreateWithoutWorkspaceInput, ConsentRecordUncheckedCreateWithoutWorkspaceInput>
  }

  export type ConsentRecordCreateManyWorkspaceInputEnvelope = {
    data: ConsentRecordCreateManyWorkspaceInput | ConsentRecordCreateManyWorkspaceInput[]
    skipDuplicates?: boolean
  }

  export type BrandTwinCreateWithoutWorkspaceInput = {
    brandId: string
    snapshotAt: Date | string
    brandData: JsonNullValueInput | InputJsonValue
    qualityScore?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
  }

  export type BrandTwinUncheckedCreateWithoutWorkspaceInput = {
    brandId: string
    snapshotAt: Date | string
    brandData: JsonNullValueInput | InputJsonValue
    qualityScore?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
  }

  export type BrandTwinCreateOrConnectWithoutWorkspaceInput = {
    where: BrandTwinWhereUniqueInput
    create: XOR<BrandTwinCreateWithoutWorkspaceInput, BrandTwinUncheckedCreateWithoutWorkspaceInput>
  }

  export type BrandTwinCreateManyWorkspaceInputEnvelope = {
    data: BrandTwinCreateManyWorkspaceInput | BrandTwinCreateManyWorkspaceInput[]
    skipDuplicates?: boolean
  }

  export type DecisionCardCreateWithoutWorkspaceInput = {
    actionId: string
    title: string
    oneLine: string
    readinessScore: Decimal | DecimalJsLike | number | string
    expiresAt: Date | string
    status?: string
    approvedBy?: string | null
    approvedAt?: Date | string | null
    cardData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type DecisionCardUncheckedCreateWithoutWorkspaceInput = {
    actionId: string
    title: string
    oneLine: string
    readinessScore: Decimal | DecimalJsLike | number | string
    expiresAt: Date | string
    status?: string
    approvedBy?: string | null
    approvedAt?: Date | string | null
    cardData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type DecisionCardCreateOrConnectWithoutWorkspaceInput = {
    where: DecisionCardWhereUniqueInput
    create: XOR<DecisionCardCreateWithoutWorkspaceInput, DecisionCardUncheckedCreateWithoutWorkspaceInput>
  }

  export type DecisionCardCreateManyWorkspaceInputEnvelope = {
    data: DecisionCardCreateManyWorkspaceInput | DecisionCardCreateManyWorkspaceInput[]
    skipDuplicates?: boolean
  }

  export type SimulationResultCreateWithoutWorkspaceInput = {
    simulationId: string
    readinessScore: Decimal | DecimalJsLike | number | string
    policyPassPct: Decimal | DecimalJsLike | number | string
    citationCoverage: Decimal | DecimalJsLike | number | string
    duplicationRisk: Decimal | DecimalJsLike | number | string
    costEstimateUsd: Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type SimulationResultUncheckedCreateWithoutWorkspaceInput = {
    simulationId: string
    readinessScore: Decimal | DecimalJsLike | number | string
    policyPassPct: Decimal | DecimalJsLike | number | string
    citationCoverage: Decimal | DecimalJsLike | number | string
    duplicationRisk: Decimal | DecimalJsLike | number | string
    costEstimateUsd: Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type SimulationResultCreateOrConnectWithoutWorkspaceInput = {
    where: SimulationResultWhereUniqueInput
    create: XOR<SimulationResultCreateWithoutWorkspaceInput, SimulationResultUncheckedCreateWithoutWorkspaceInput>
  }

  export type SimulationResultCreateManyWorkspaceInputEnvelope = {
    data: SimulationResultCreateManyWorkspaceInput | SimulationResultCreateManyWorkspaceInput[]
    skipDuplicates?: boolean
  }

  export type AssetFingerprintCreateWithoutWorkspaceInput = {
    assetId: string
    assetType: string
    fingerprint: string
    license: string
    url?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AssetFingerprintUncheckedCreateWithoutWorkspaceInput = {
    assetId: string
    assetType: string
    fingerprint: string
    license: string
    url?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AssetFingerprintCreateOrConnectWithoutWorkspaceInput = {
    where: AssetFingerprintWhereUniqueInput
    create: XOR<AssetFingerprintCreateWithoutWorkspaceInput, AssetFingerprintUncheckedCreateWithoutWorkspaceInput>
  }

  export type AssetFingerprintCreateManyWorkspaceInputEnvelope = {
    data: AssetFingerprintCreateManyWorkspaceInput | AssetFingerprintCreateManyWorkspaceInput[]
    skipDuplicates?: boolean
  }

  export type WorkspaceRunUpsertWithWhereUniqueWithoutWorkspaceInput = {
    where: WorkspaceRunWhereUniqueInput
    update: XOR<WorkspaceRunUpdateWithoutWorkspaceInput, WorkspaceRunUncheckedUpdateWithoutWorkspaceInput>
    create: XOR<WorkspaceRunCreateWithoutWorkspaceInput, WorkspaceRunUncheckedCreateWithoutWorkspaceInput>
  }

  export type WorkspaceRunUpdateWithWhereUniqueWithoutWorkspaceInput = {
    where: WorkspaceRunWhereUniqueInput
    data: XOR<WorkspaceRunUpdateWithoutWorkspaceInput, WorkspaceRunUncheckedUpdateWithoutWorkspaceInput>
  }

  export type WorkspaceRunUpdateManyWithWhereWithoutWorkspaceInput = {
    where: WorkspaceRunScalarWhereInput
    data: XOR<WorkspaceRunUpdateManyMutationInput, WorkspaceRunUncheckedUpdateManyWithoutWorkspaceInput>
  }

  export type WorkspaceRunScalarWhereInput = {
    AND?: WorkspaceRunScalarWhereInput | WorkspaceRunScalarWhereInput[]
    OR?: WorkspaceRunScalarWhereInput[]
    NOT?: WorkspaceRunScalarWhereInput | WorkspaceRunScalarWhereInput[]
    runId?: StringFilter<"WorkspaceRun"> | string
    workspaceId?: StringFilter<"WorkspaceRun"> | string
    status?: StringFilter<"WorkspaceRun"> | string
    startedAt?: DateTimeFilter<"WorkspaceRun"> | Date | string
    finishedAt?: DateTimeNullableFilter<"WorkspaceRun"> | Date | string | null
    costUsd?: DecimalNullableFilter<"WorkspaceRun"> | Decimal | DecimalJsLike | number | string | null
    readinessScore?: DecimalNullableFilter<"WorkspaceRun"> | Decimal | DecimalJsLike | number | string | null
    results?: JsonNullableFilter<"WorkspaceRun">
    createdAt?: DateTimeFilter<"WorkspaceRun"> | Date | string
  }

  export type AuditBundleUpsertWithWhereUniqueWithoutWorkspaceInput = {
    where: AuditBundleWhereUniqueInput
    update: XOR<AuditBundleUpdateWithoutWorkspaceInput, AuditBundleUncheckedUpdateWithoutWorkspaceInput>
    create: XOR<AuditBundleCreateWithoutWorkspaceInput, AuditBundleUncheckedCreateWithoutWorkspaceInput>
  }

  export type AuditBundleUpdateWithWhereUniqueWithoutWorkspaceInput = {
    where: AuditBundleWhereUniqueInput
    data: XOR<AuditBundleUpdateWithoutWorkspaceInput, AuditBundleUncheckedUpdateWithoutWorkspaceInput>
  }

  export type AuditBundleUpdateManyWithWhereWithoutWorkspaceInput = {
    where: AuditBundleScalarWhereInput
    data: XOR<AuditBundleUpdateManyMutationInput, AuditBundleUncheckedUpdateManyWithoutWorkspaceInput>
  }

  export type AuditBundleScalarWhereInput = {
    AND?: AuditBundleScalarWhereInput | AuditBundleScalarWhereInput[]
    OR?: AuditBundleScalarWhereInput[]
    NOT?: AuditBundleScalarWhereInput | AuditBundleScalarWhereInput[]
    bundleId?: StringFilter<"AuditBundle"> | string
    workspaceId?: StringFilter<"AuditBundle"> | string
    bundleData?: JsonFilter<"AuditBundle">
    signatureKeyId?: StringFilter<"AuditBundle"> | string
    signature?: StringFilter<"AuditBundle"> | string
    signedAt?: DateTimeFilter<"AuditBundle"> | Date | string
    createdAt?: DateTimeFilter<"AuditBundle"> | Date | string
  }

  export type ConnectorUpsertWithWhereUniqueWithoutWorkspaceInput = {
    where: ConnectorWhereUniqueInput
    update: XOR<ConnectorUpdateWithoutWorkspaceInput, ConnectorUncheckedUpdateWithoutWorkspaceInput>
    create: XOR<ConnectorCreateWithoutWorkspaceInput, ConnectorUncheckedCreateWithoutWorkspaceInput>
  }

  export type ConnectorUpdateWithWhereUniqueWithoutWorkspaceInput = {
    where: ConnectorWhereUniqueInput
    data: XOR<ConnectorUpdateWithoutWorkspaceInput, ConnectorUncheckedUpdateWithoutWorkspaceInput>
  }

  export type ConnectorUpdateManyWithWhereWithoutWorkspaceInput = {
    where: ConnectorScalarWhereInput
    data: XOR<ConnectorUpdateManyMutationInput, ConnectorUncheckedUpdateManyWithoutWorkspaceInput>
  }

  export type ConnectorScalarWhereInput = {
    AND?: ConnectorScalarWhereInput | ConnectorScalarWhereInput[]
    OR?: ConnectorScalarWhereInput[]
    NOT?: ConnectorScalarWhereInput | ConnectorScalarWhereInput[]
    connectorId?: StringFilter<"Connector"> | string
    workspaceId?: StringFilter<"Connector"> | string
    platform?: StringFilter<"Connector"> | string
    accountId?: StringFilter<"Connector"> | string
    displayName?: StringFilter<"Connector"> | string
    status?: StringFilter<"Connector"> | string
    scopes?: JsonNullableFilter<"Connector">
    lastConnectedAt?: DateTimeNullableFilter<"Connector"> | Date | string | null
    ownerContact?: StringNullableFilter<"Connector"> | string | null
    credentialsRef?: StringNullableFilter<"Connector"> | string | null
    createdAt?: DateTimeFilter<"Connector"> | Date | string
    updatedAt?: DateTimeFilter<"Connector"> | Date | string
  }

  export type ConsentRecordUpsertWithWhereUniqueWithoutWorkspaceInput = {
    where: ConsentRecordWhereUniqueInput
    update: XOR<ConsentRecordUpdateWithoutWorkspaceInput, ConsentRecordUncheckedUpdateWithoutWorkspaceInput>
    create: XOR<ConsentRecordCreateWithoutWorkspaceInput, ConsentRecordUncheckedCreateWithoutWorkspaceInput>
  }

  export type ConsentRecordUpdateWithWhereUniqueWithoutWorkspaceInput = {
    where: ConsentRecordWhereUniqueInput
    data: XOR<ConsentRecordUpdateWithoutWorkspaceInput, ConsentRecordUncheckedUpdateWithoutWorkspaceInput>
  }

  export type ConsentRecordUpdateManyWithWhereWithoutWorkspaceInput = {
    where: ConsentRecordScalarWhereInput
    data: XOR<ConsentRecordUpdateManyMutationInput, ConsentRecordUncheckedUpdateManyWithoutWorkspaceInput>
  }

  export type ConsentRecordScalarWhereInput = {
    AND?: ConsentRecordScalarWhereInput | ConsentRecordScalarWhereInput[]
    OR?: ConsentRecordScalarWhereInput[]
    NOT?: ConsentRecordScalarWhereInput | ConsentRecordScalarWhereInput[]
    consentId?: StringFilter<"ConsentRecord"> | string
    workspaceId?: StringFilter<"ConsentRecord"> | string
    consentType?: StringFilter<"ConsentRecord"> | string
    grantedBy?: StringFilter<"ConsentRecord"> | string
    grantedAt?: DateTimeFilter<"ConsentRecord"> | Date | string
    expiresAt?: DateTimeFilter<"ConsentRecord"> | Date | string
    documentRef?: StringNullableFilter<"ConsentRecord"> | string | null
    verifierSignature?: StringNullableFilter<"ConsentRecord"> | string | null
    createdAt?: DateTimeFilter<"ConsentRecord"> | Date | string
  }

  export type BrandTwinUpsertWithWhereUniqueWithoutWorkspaceInput = {
    where: BrandTwinWhereUniqueInput
    update: XOR<BrandTwinUpdateWithoutWorkspaceInput, BrandTwinUncheckedUpdateWithoutWorkspaceInput>
    create: XOR<BrandTwinCreateWithoutWorkspaceInput, BrandTwinUncheckedCreateWithoutWorkspaceInput>
  }

  export type BrandTwinUpdateWithWhereUniqueWithoutWorkspaceInput = {
    where: BrandTwinWhereUniqueInput
    data: XOR<BrandTwinUpdateWithoutWorkspaceInput, BrandTwinUncheckedUpdateWithoutWorkspaceInput>
  }

  export type BrandTwinUpdateManyWithWhereWithoutWorkspaceInput = {
    where: BrandTwinScalarWhereInput
    data: XOR<BrandTwinUpdateManyMutationInput, BrandTwinUncheckedUpdateManyWithoutWorkspaceInput>
  }

  export type BrandTwinScalarWhereInput = {
    AND?: BrandTwinScalarWhereInput | BrandTwinScalarWhereInput[]
    OR?: BrandTwinScalarWhereInput[]
    NOT?: BrandTwinScalarWhereInput | BrandTwinScalarWhereInput[]
    brandId?: StringFilter<"BrandTwin"> | string
    workspaceId?: StringFilter<"BrandTwin"> | string
    snapshotAt?: DateTimeFilter<"BrandTwin"> | Date | string
    brandData?: JsonFilter<"BrandTwin">
    qualityScore?: DecimalNullableFilter<"BrandTwin"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFilter<"BrandTwin"> | Date | string
  }

  export type DecisionCardUpsertWithWhereUniqueWithoutWorkspaceInput = {
    where: DecisionCardWhereUniqueInput
    update: XOR<DecisionCardUpdateWithoutWorkspaceInput, DecisionCardUncheckedUpdateWithoutWorkspaceInput>
    create: XOR<DecisionCardCreateWithoutWorkspaceInput, DecisionCardUncheckedCreateWithoutWorkspaceInput>
  }

  export type DecisionCardUpdateWithWhereUniqueWithoutWorkspaceInput = {
    where: DecisionCardWhereUniqueInput
    data: XOR<DecisionCardUpdateWithoutWorkspaceInput, DecisionCardUncheckedUpdateWithoutWorkspaceInput>
  }

  export type DecisionCardUpdateManyWithWhereWithoutWorkspaceInput = {
    where: DecisionCardScalarWhereInput
    data: XOR<DecisionCardUpdateManyMutationInput, DecisionCardUncheckedUpdateManyWithoutWorkspaceInput>
  }

  export type DecisionCardScalarWhereInput = {
    AND?: DecisionCardScalarWhereInput | DecisionCardScalarWhereInput[]
    OR?: DecisionCardScalarWhereInput[]
    NOT?: DecisionCardScalarWhereInput | DecisionCardScalarWhereInput[]
    actionId?: StringFilter<"DecisionCard"> | string
    workspaceId?: StringFilter<"DecisionCard"> | string
    title?: StringFilter<"DecisionCard"> | string
    oneLine?: StringFilter<"DecisionCard"> | string
    readinessScore?: DecimalFilter<"DecisionCard"> | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeFilter<"DecisionCard"> | Date | string
    status?: StringFilter<"DecisionCard"> | string
    approvedBy?: StringNullableFilter<"DecisionCard"> | string | null
    approvedAt?: DateTimeNullableFilter<"DecisionCard"> | Date | string | null
    cardData?: JsonFilter<"DecisionCard">
    createdAt?: DateTimeFilter<"DecisionCard"> | Date | string
  }

  export type SimulationResultUpsertWithWhereUniqueWithoutWorkspaceInput = {
    where: SimulationResultWhereUniqueInput
    update: XOR<SimulationResultUpdateWithoutWorkspaceInput, SimulationResultUncheckedUpdateWithoutWorkspaceInput>
    create: XOR<SimulationResultCreateWithoutWorkspaceInput, SimulationResultUncheckedCreateWithoutWorkspaceInput>
  }

  export type SimulationResultUpdateWithWhereUniqueWithoutWorkspaceInput = {
    where: SimulationResultWhereUniqueInput
    data: XOR<SimulationResultUpdateWithoutWorkspaceInput, SimulationResultUncheckedUpdateWithoutWorkspaceInput>
  }

  export type SimulationResultUpdateManyWithWhereWithoutWorkspaceInput = {
    where: SimulationResultScalarWhereInput
    data: XOR<SimulationResultUpdateManyMutationInput, SimulationResultUncheckedUpdateManyWithoutWorkspaceInput>
  }

  export type SimulationResultScalarWhereInput = {
    AND?: SimulationResultScalarWhereInput | SimulationResultScalarWhereInput[]
    OR?: SimulationResultScalarWhereInput[]
    NOT?: SimulationResultScalarWhereInput | SimulationResultScalarWhereInput[]
    simulationId?: StringFilter<"SimulationResult"> | string
    workspaceId?: StringFilter<"SimulationResult"> | string
    readinessScore?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalFilter<"SimulationResult"> | Decimal | DecimalJsLike | number | string
    traces?: JsonNullableFilter<"SimulationResult">
    simulationData?: JsonFilter<"SimulationResult">
    createdAt?: DateTimeFilter<"SimulationResult"> | Date | string
  }

  export type AssetFingerprintUpsertWithWhereUniqueWithoutWorkspaceInput = {
    where: AssetFingerprintWhereUniqueInput
    update: XOR<AssetFingerprintUpdateWithoutWorkspaceInput, AssetFingerprintUncheckedUpdateWithoutWorkspaceInput>
    create: XOR<AssetFingerprintCreateWithoutWorkspaceInput, AssetFingerprintUncheckedCreateWithoutWorkspaceInput>
  }

  export type AssetFingerprintUpdateWithWhereUniqueWithoutWorkspaceInput = {
    where: AssetFingerprintWhereUniqueInput
    data: XOR<AssetFingerprintUpdateWithoutWorkspaceInput, AssetFingerprintUncheckedUpdateWithoutWorkspaceInput>
  }

  export type AssetFingerprintUpdateManyWithWhereWithoutWorkspaceInput = {
    where: AssetFingerprintScalarWhereInput
    data: XOR<AssetFingerprintUpdateManyMutationInput, AssetFingerprintUncheckedUpdateManyWithoutWorkspaceInput>
  }

  export type AssetFingerprintScalarWhereInput = {
    AND?: AssetFingerprintScalarWhereInput | AssetFingerprintScalarWhereInput[]
    OR?: AssetFingerprintScalarWhereInput[]
    NOT?: AssetFingerprintScalarWhereInput | AssetFingerprintScalarWhereInput[]
    assetId?: StringFilter<"AssetFingerprint"> | string
    workspaceId?: StringFilter<"AssetFingerprint"> | string
    assetType?: StringFilter<"AssetFingerprint"> | string
    fingerprint?: StringFilter<"AssetFingerprint"> | string
    license?: StringFilter<"AssetFingerprint"> | string
    url?: StringNullableFilter<"AssetFingerprint"> | string | null
    metadata?: JsonNullableFilter<"AssetFingerprint">
    createdAt?: DateTimeFilter<"AssetFingerprint"> | Date | string
  }

  export type WorkspaceCreateWithoutWorkspaceRunsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    auditBundles?: AuditBundleCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceUncheckedCreateWithoutWorkspaceRunsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    auditBundles?: AuditBundleUncheckedCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorUncheckedCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordUncheckedCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinUncheckedCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardUncheckedCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultUncheckedCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintUncheckedCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceCreateOrConnectWithoutWorkspaceRunsInput = {
    where: WorkspaceWhereUniqueInput
    create: XOR<WorkspaceCreateWithoutWorkspaceRunsInput, WorkspaceUncheckedCreateWithoutWorkspaceRunsInput>
  }

  export type WorkspaceUpsertWithoutWorkspaceRunsInput = {
    update: XOR<WorkspaceUpdateWithoutWorkspaceRunsInput, WorkspaceUncheckedUpdateWithoutWorkspaceRunsInput>
    create: XOR<WorkspaceCreateWithoutWorkspaceRunsInput, WorkspaceUncheckedCreateWithoutWorkspaceRunsInput>
    where?: WorkspaceWhereInput
  }

  export type WorkspaceUpdateToOneWithWhereWithoutWorkspaceRunsInput = {
    where?: WorkspaceWhereInput
    data: XOR<WorkspaceUpdateWithoutWorkspaceRunsInput, WorkspaceUncheckedUpdateWithoutWorkspaceRunsInput>
  }

  export type WorkspaceUpdateWithoutWorkspaceRunsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    auditBundles?: AuditBundleUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceUncheckedUpdateWithoutWorkspaceRunsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    auditBundles?: AuditBundleUncheckedUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUncheckedUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUncheckedUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUncheckedUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUncheckedUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUncheckedUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUncheckedUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceCreateWithoutAuditBundlesInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceUncheckedCreateWithoutAuditBundlesInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorUncheckedCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordUncheckedCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinUncheckedCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardUncheckedCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultUncheckedCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintUncheckedCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceCreateOrConnectWithoutAuditBundlesInput = {
    where: WorkspaceWhereUniqueInput
    create: XOR<WorkspaceCreateWithoutAuditBundlesInput, WorkspaceUncheckedCreateWithoutAuditBundlesInput>
  }

  export type WorkspaceUpsertWithoutAuditBundlesInput = {
    update: XOR<WorkspaceUpdateWithoutAuditBundlesInput, WorkspaceUncheckedUpdateWithoutAuditBundlesInput>
    create: XOR<WorkspaceCreateWithoutAuditBundlesInput, WorkspaceUncheckedCreateWithoutAuditBundlesInput>
    where?: WorkspaceWhereInput
  }

  export type WorkspaceUpdateToOneWithWhereWithoutAuditBundlesInput = {
    where?: WorkspaceWhereInput
    data: XOR<WorkspaceUpdateWithoutAuditBundlesInput, WorkspaceUncheckedUpdateWithoutAuditBundlesInput>
  }

  export type WorkspaceUpdateWithoutAuditBundlesInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceUncheckedUpdateWithoutAuditBundlesInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUncheckedUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUncheckedUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUncheckedUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUncheckedUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUncheckedUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUncheckedUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceCreateWithoutConnectorsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceUncheckedCreateWithoutConnectorsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleUncheckedCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordUncheckedCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinUncheckedCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardUncheckedCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultUncheckedCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintUncheckedCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceCreateOrConnectWithoutConnectorsInput = {
    where: WorkspaceWhereUniqueInput
    create: XOR<WorkspaceCreateWithoutConnectorsInput, WorkspaceUncheckedCreateWithoutConnectorsInput>
  }

  export type WorkspaceUpsertWithoutConnectorsInput = {
    update: XOR<WorkspaceUpdateWithoutConnectorsInput, WorkspaceUncheckedUpdateWithoutConnectorsInput>
    create: XOR<WorkspaceCreateWithoutConnectorsInput, WorkspaceUncheckedCreateWithoutConnectorsInput>
    where?: WorkspaceWhereInput
  }

  export type WorkspaceUpdateToOneWithWhereWithoutConnectorsInput = {
    where?: WorkspaceWhereInput
    data: XOR<WorkspaceUpdateWithoutConnectorsInput, WorkspaceUncheckedUpdateWithoutConnectorsInput>
  }

  export type WorkspaceUpdateWithoutConnectorsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceUncheckedUpdateWithoutConnectorsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUncheckedUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUncheckedUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUncheckedUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUncheckedUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUncheckedUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUncheckedUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceCreateWithoutConsentRecordsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceUncheckedCreateWithoutConsentRecordsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleUncheckedCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorUncheckedCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinUncheckedCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardUncheckedCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultUncheckedCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintUncheckedCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceCreateOrConnectWithoutConsentRecordsInput = {
    where: WorkspaceWhereUniqueInput
    create: XOR<WorkspaceCreateWithoutConsentRecordsInput, WorkspaceUncheckedCreateWithoutConsentRecordsInput>
  }

  export type WorkspaceUpsertWithoutConsentRecordsInput = {
    update: XOR<WorkspaceUpdateWithoutConsentRecordsInput, WorkspaceUncheckedUpdateWithoutConsentRecordsInput>
    create: XOR<WorkspaceCreateWithoutConsentRecordsInput, WorkspaceUncheckedCreateWithoutConsentRecordsInput>
    where?: WorkspaceWhereInput
  }

  export type WorkspaceUpdateToOneWithWhereWithoutConsentRecordsInput = {
    where?: WorkspaceWhereInput
    data: XOR<WorkspaceUpdateWithoutConsentRecordsInput, WorkspaceUncheckedUpdateWithoutConsentRecordsInput>
  }

  export type WorkspaceUpdateWithoutConsentRecordsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceUncheckedUpdateWithoutConsentRecordsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUncheckedUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUncheckedUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUncheckedUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUncheckedUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUncheckedUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUncheckedUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceCreateWithoutBrandTwinsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceUncheckedCreateWithoutBrandTwinsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleUncheckedCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorUncheckedCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordUncheckedCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardUncheckedCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultUncheckedCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintUncheckedCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceCreateOrConnectWithoutBrandTwinsInput = {
    where: WorkspaceWhereUniqueInput
    create: XOR<WorkspaceCreateWithoutBrandTwinsInput, WorkspaceUncheckedCreateWithoutBrandTwinsInput>
  }

  export type WorkspaceUpsertWithoutBrandTwinsInput = {
    update: XOR<WorkspaceUpdateWithoutBrandTwinsInput, WorkspaceUncheckedUpdateWithoutBrandTwinsInput>
    create: XOR<WorkspaceCreateWithoutBrandTwinsInput, WorkspaceUncheckedCreateWithoutBrandTwinsInput>
    where?: WorkspaceWhereInput
  }

  export type WorkspaceUpdateToOneWithWhereWithoutBrandTwinsInput = {
    where?: WorkspaceWhereInput
    data: XOR<WorkspaceUpdateWithoutBrandTwinsInput, WorkspaceUncheckedUpdateWithoutBrandTwinsInput>
  }

  export type WorkspaceUpdateWithoutBrandTwinsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceUncheckedUpdateWithoutBrandTwinsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUncheckedUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUncheckedUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUncheckedUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUncheckedUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUncheckedUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUncheckedUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceCreateWithoutDecisionCardsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceUncheckedCreateWithoutDecisionCardsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleUncheckedCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorUncheckedCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordUncheckedCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinUncheckedCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultUncheckedCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintUncheckedCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceCreateOrConnectWithoutDecisionCardsInput = {
    where: WorkspaceWhereUniqueInput
    create: XOR<WorkspaceCreateWithoutDecisionCardsInput, WorkspaceUncheckedCreateWithoutDecisionCardsInput>
  }

  export type WorkspaceUpsertWithoutDecisionCardsInput = {
    update: XOR<WorkspaceUpdateWithoutDecisionCardsInput, WorkspaceUncheckedUpdateWithoutDecisionCardsInput>
    create: XOR<WorkspaceCreateWithoutDecisionCardsInput, WorkspaceUncheckedCreateWithoutDecisionCardsInput>
    where?: WorkspaceWhereInput
  }

  export type WorkspaceUpdateToOneWithWhereWithoutDecisionCardsInput = {
    where?: WorkspaceWhereInput
    data: XOR<WorkspaceUpdateWithoutDecisionCardsInput, WorkspaceUncheckedUpdateWithoutDecisionCardsInput>
  }

  export type WorkspaceUpdateWithoutDecisionCardsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceUncheckedUpdateWithoutDecisionCardsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUncheckedUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUncheckedUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUncheckedUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUncheckedUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUncheckedUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUncheckedUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceCreateWithoutSimulationResultsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceUncheckedCreateWithoutSimulationResultsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleUncheckedCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorUncheckedCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordUncheckedCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinUncheckedCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardUncheckedCreateNestedManyWithoutWorkspaceInput
    assetFingerprints?: AssetFingerprintUncheckedCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceCreateOrConnectWithoutSimulationResultsInput = {
    where: WorkspaceWhereUniqueInput
    create: XOR<WorkspaceCreateWithoutSimulationResultsInput, WorkspaceUncheckedCreateWithoutSimulationResultsInput>
  }

  export type WorkspaceUpsertWithoutSimulationResultsInput = {
    update: XOR<WorkspaceUpdateWithoutSimulationResultsInput, WorkspaceUncheckedUpdateWithoutSimulationResultsInput>
    create: XOR<WorkspaceCreateWithoutSimulationResultsInput, WorkspaceUncheckedCreateWithoutSimulationResultsInput>
    where?: WorkspaceWhereInput
  }

  export type WorkspaceUpdateToOneWithWhereWithoutSimulationResultsInput = {
    where?: WorkspaceWhereInput
    data: XOR<WorkspaceUpdateWithoutSimulationResultsInput, WorkspaceUncheckedUpdateWithoutSimulationResultsInput>
  }

  export type WorkspaceUpdateWithoutSimulationResultsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceUncheckedUpdateWithoutSimulationResultsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUncheckedUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUncheckedUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUncheckedUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUncheckedUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUncheckedUpdateManyWithoutWorkspaceNestedInput
    assetFingerprints?: AssetFingerprintUncheckedUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceCreateWithoutAssetFingerprintsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceUncheckedCreateWithoutAssetFingerprintsInput = {
    workspaceId: string
    tenantId: string
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lifecycle?: string
    contractVersion: string
    goals: JsonNullValueInput | InputJsonValue
    primaryChannels: JsonNullValueInput | InputJsonValue
    budget: JsonNullValueInput | InputJsonValue
    approvalPolicy: JsonNullValueInput | InputJsonValue
    riskProfile: string
    dataRetention: JsonNullValueInput | InputJsonValue
    ttlHours: number
    policyBundleRef: string
    policyBundleChecksum: string
    contractData: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedCreateNestedManyWithoutWorkspaceInput
    auditBundles?: AuditBundleUncheckedCreateNestedManyWithoutWorkspaceInput
    connectors?: ConnectorUncheckedCreateNestedManyWithoutWorkspaceInput
    consentRecords?: ConsentRecordUncheckedCreateNestedManyWithoutWorkspaceInput
    brandTwins?: BrandTwinUncheckedCreateNestedManyWithoutWorkspaceInput
    decisionCards?: DecisionCardUncheckedCreateNestedManyWithoutWorkspaceInput
    simulationResults?: SimulationResultUncheckedCreateNestedManyWithoutWorkspaceInput
  }

  export type WorkspaceCreateOrConnectWithoutAssetFingerprintsInput = {
    where: WorkspaceWhereUniqueInput
    create: XOR<WorkspaceCreateWithoutAssetFingerprintsInput, WorkspaceUncheckedCreateWithoutAssetFingerprintsInput>
  }

  export type WorkspaceUpsertWithoutAssetFingerprintsInput = {
    update: XOR<WorkspaceUpdateWithoutAssetFingerprintsInput, WorkspaceUncheckedUpdateWithoutAssetFingerprintsInput>
    create: XOR<WorkspaceCreateWithoutAssetFingerprintsInput, WorkspaceUncheckedCreateWithoutAssetFingerprintsInput>
    where?: WorkspaceWhereInput
  }

  export type WorkspaceUpdateToOneWithWhereWithoutAssetFingerprintsInput = {
    where?: WorkspaceWhereInput
    data: XOR<WorkspaceUpdateWithoutAssetFingerprintsInput, WorkspaceUncheckedUpdateWithoutAssetFingerprintsInput>
  }

  export type WorkspaceUpdateWithoutAssetFingerprintsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceUncheckedUpdateWithoutAssetFingerprintsInput = {
    workspaceId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lifecycle?: StringFieldUpdateOperationsInput | string
    contractVersion?: StringFieldUpdateOperationsInput | string
    goals?: JsonNullValueInput | InputJsonValue
    primaryChannels?: JsonNullValueInput | InputJsonValue
    budget?: JsonNullValueInput | InputJsonValue
    approvalPolicy?: JsonNullValueInput | InputJsonValue
    riskProfile?: StringFieldUpdateOperationsInput | string
    dataRetention?: JsonNullValueInput | InputJsonValue
    ttlHours?: IntFieldUpdateOperationsInput | number
    policyBundleRef?: StringFieldUpdateOperationsInput | string
    policyBundleChecksum?: StringFieldUpdateOperationsInput | string
    contractData?: JsonNullValueInput | InputJsonValue
    workspaceRuns?: WorkspaceRunUncheckedUpdateManyWithoutWorkspaceNestedInput
    auditBundles?: AuditBundleUncheckedUpdateManyWithoutWorkspaceNestedInput
    connectors?: ConnectorUncheckedUpdateManyWithoutWorkspaceNestedInput
    consentRecords?: ConsentRecordUncheckedUpdateManyWithoutWorkspaceNestedInput
    brandTwins?: BrandTwinUncheckedUpdateManyWithoutWorkspaceNestedInput
    decisionCards?: DecisionCardUncheckedUpdateManyWithoutWorkspaceNestedInput
    simulationResults?: SimulationResultUncheckedUpdateManyWithoutWorkspaceNestedInput
  }

  export type WorkspaceRunCreateManyWorkspaceInput = {
    runId: string
    status: string
    startedAt: Date | string
    finishedAt?: Date | string | null
    costUsd?: Decimal | DecimalJsLike | number | string | null
    readinessScore?: Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AuditBundleCreateManyWorkspaceInput = {
    bundleId: string
    bundleData: JsonNullValueInput | InputJsonValue
    signatureKeyId: string
    signature: string
    signedAt: Date | string
    createdAt?: Date | string
  }

  export type ConnectorCreateManyWorkspaceInput = {
    connectorId: string
    platform: string
    accountId: string
    displayName: string
    status?: string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: Date | string | null
    ownerContact?: string | null
    credentialsRef?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ConsentRecordCreateManyWorkspaceInput = {
    consentId: string
    consentType: string
    grantedBy: string
    grantedAt: Date | string
    expiresAt: Date | string
    documentRef?: string | null
    verifierSignature?: string | null
    createdAt?: Date | string
  }

  export type BrandTwinCreateManyWorkspaceInput = {
    brandId: string
    snapshotAt: Date | string
    brandData: JsonNullValueInput | InputJsonValue
    qualityScore?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
  }

  export type DecisionCardCreateManyWorkspaceInput = {
    actionId: string
    title: string
    oneLine: string
    readinessScore: Decimal | DecimalJsLike | number | string
    expiresAt: Date | string
    status?: string
    approvedBy?: string | null
    approvedAt?: Date | string | null
    cardData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type SimulationResultCreateManyWorkspaceInput = {
    simulationId: string
    readinessScore: Decimal | DecimalJsLike | number | string
    policyPassPct: Decimal | DecimalJsLike | number | string
    citationCoverage: Decimal | DecimalJsLike | number | string
    duplicationRisk: Decimal | DecimalJsLike | number | string
    costEstimateUsd: Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AssetFingerprintCreateManyWorkspaceInput = {
    assetId: string
    assetType: string
    fingerprint: string
    license: string
    url?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type WorkspaceRunUpdateWithoutWorkspaceInput = {
    runId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    costUsd?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    readinessScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkspaceRunUncheckedUpdateWithoutWorkspaceInput = {
    runId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    costUsd?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    readinessScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WorkspaceRunUncheckedUpdateManyWithoutWorkspaceInput = {
    runId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    costUsd?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    readinessScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    results?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditBundleUpdateWithoutWorkspaceInput = {
    bundleId?: StringFieldUpdateOperationsInput | string
    bundleData?: JsonNullValueInput | InputJsonValue
    signatureKeyId?: StringFieldUpdateOperationsInput | string
    signature?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditBundleUncheckedUpdateWithoutWorkspaceInput = {
    bundleId?: StringFieldUpdateOperationsInput | string
    bundleData?: JsonNullValueInput | InputJsonValue
    signatureKeyId?: StringFieldUpdateOperationsInput | string
    signature?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditBundleUncheckedUpdateManyWithoutWorkspaceInput = {
    bundleId?: StringFieldUpdateOperationsInput | string
    bundleData?: JsonNullValueInput | InputJsonValue
    signatureKeyId?: StringFieldUpdateOperationsInput | string
    signature?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorUpdateWithoutWorkspaceInput = {
    connectorId?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    ownerContact?: NullableStringFieldUpdateOperationsInput | string | null
    credentialsRef?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorUncheckedUpdateWithoutWorkspaceInput = {
    connectorId?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    ownerContact?: NullableStringFieldUpdateOperationsInput | string | null
    credentialsRef?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorUncheckedUpdateManyWithoutWorkspaceInput = {
    connectorId?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    scopes?: NullableJsonNullValueInput | InputJsonValue
    lastConnectedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    ownerContact?: NullableStringFieldUpdateOperationsInput | string | null
    credentialsRef?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConsentRecordUpdateWithoutWorkspaceInput = {
    consentId?: StringFieldUpdateOperationsInput | string
    consentType?: StringFieldUpdateOperationsInput | string
    grantedBy?: StringFieldUpdateOperationsInput | string
    grantedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    documentRef?: NullableStringFieldUpdateOperationsInput | string | null
    verifierSignature?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConsentRecordUncheckedUpdateWithoutWorkspaceInput = {
    consentId?: StringFieldUpdateOperationsInput | string
    consentType?: StringFieldUpdateOperationsInput | string
    grantedBy?: StringFieldUpdateOperationsInput | string
    grantedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    documentRef?: NullableStringFieldUpdateOperationsInput | string | null
    verifierSignature?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConsentRecordUncheckedUpdateManyWithoutWorkspaceInput = {
    consentId?: StringFieldUpdateOperationsInput | string
    consentType?: StringFieldUpdateOperationsInput | string
    grantedBy?: StringFieldUpdateOperationsInput | string
    grantedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    documentRef?: NullableStringFieldUpdateOperationsInput | string | null
    verifierSignature?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BrandTwinUpdateWithoutWorkspaceInput = {
    brandId?: StringFieldUpdateOperationsInput | string
    snapshotAt?: DateTimeFieldUpdateOperationsInput | Date | string
    brandData?: JsonNullValueInput | InputJsonValue
    qualityScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BrandTwinUncheckedUpdateWithoutWorkspaceInput = {
    brandId?: StringFieldUpdateOperationsInput | string
    snapshotAt?: DateTimeFieldUpdateOperationsInput | Date | string
    brandData?: JsonNullValueInput | InputJsonValue
    qualityScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BrandTwinUncheckedUpdateManyWithoutWorkspaceInput = {
    brandId?: StringFieldUpdateOperationsInput | string
    snapshotAt?: DateTimeFieldUpdateOperationsInput | Date | string
    brandData?: JsonNullValueInput | InputJsonValue
    qualityScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionCardUpdateWithoutWorkspaceInput = {
    actionId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    oneLine?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    approvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cardData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionCardUncheckedUpdateWithoutWorkspaceInput = {
    actionId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    oneLine?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    approvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cardData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionCardUncheckedUpdateManyWithoutWorkspaceInput = {
    actionId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    oneLine?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    approvedBy?: NullableStringFieldUpdateOperationsInput | string | null
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cardData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SimulationResultUpdateWithoutWorkspaceInput = {
    simulationId?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SimulationResultUncheckedUpdateWithoutWorkspaceInput = {
    simulationId?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SimulationResultUncheckedUpdateManyWithoutWorkspaceInput = {
    simulationId?: StringFieldUpdateOperationsInput | string
    readinessScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    policyPassPct?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    citationCoverage?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    duplicationRisk?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    costEstimateUsd?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    traces?: NullableJsonNullValueInput | InputJsonValue
    simulationData?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AssetFingerprintUpdateWithoutWorkspaceInput = {
    assetId?: StringFieldUpdateOperationsInput | string
    assetType?: StringFieldUpdateOperationsInput | string
    fingerprint?: StringFieldUpdateOperationsInput | string
    license?: StringFieldUpdateOperationsInput | string
    url?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AssetFingerprintUncheckedUpdateWithoutWorkspaceInput = {
    assetId?: StringFieldUpdateOperationsInput | string
    assetType?: StringFieldUpdateOperationsInput | string
    fingerprint?: StringFieldUpdateOperationsInput | string
    license?: StringFieldUpdateOperationsInput | string
    url?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AssetFingerprintUncheckedUpdateManyWithoutWorkspaceInput = {
    assetId?: StringFieldUpdateOperationsInput | string
    assetType?: StringFieldUpdateOperationsInput | string
    fingerprint?: StringFieldUpdateOperationsInput | string
    license?: StringFieldUpdateOperationsInput | string
    url?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}