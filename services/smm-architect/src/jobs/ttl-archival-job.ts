import { DatabaseClient } from '../../shared/database/client';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { gzipSync } from 'zlib';

export interface TTLArchivalConfig {
  dryRun: boolean;
  batchSize: number;
  maxConcurrency: number;
  archiveToS3: boolean;
  s3Bucket?: string;
  retentionDays: number;
}

export interface ArchivedWorkspace {
  workspace_id: string;
  tenant_id: string;
  archived_at: Date;
  data_hash: string;
  archive_location: string;
}

export class TTLArchivalJob {
  private db: DatabaseClient;
  private config: TTLArchivalConfig;

  constructor(db: DatabaseClient, config: TTLArchivalConfig) {
    this.db = db;
    this.config = config;
  }

  async execute(): Promise<void> {
    const startTime = Date.now();
    logger.info('Starting TTL archival job', { config: this.config });

    try {
      // Find expired workspaces based on ttl_hours
      const expiredWorkspaces = await this.findExpiredWorkspaces();
      logger.info(`Found ${expiredWorkspaces.length} expired workspaces`);

      if (expiredWorkspaces.length === 0) {
        logger.info('No expired workspaces found');
        return;
      }

      // Process in batches to avoid overwhelming the database
      const batches = this.chunkArray(expiredWorkspaces, this.config.batchSize);
      let totalArchived = 0;
      let totalFailed = 0;

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(workspace => this.archiveWorkspace(workspace))
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            totalArchived++;
          } else {
            totalFailed++;
            logger.error('Failed to archive workspace', { 
              error: result.reason,
              workspace: batch.find(w => w.workspace_id === result.reason?.workspace_id)
            });
          }
        }

        // Rate limiting between batches
        await this.sleep(1000);
      }

      const duration = Date.now() - startTime;
      logger.info('TTL archival job completed', {
        totalArchived,
        totalFailed,
        durationMs: duration,
        dryRun: this.config.dryRun
      });

    } catch (error) {
      logger.error('TTL archival job failed', { error });
      throw error;
    }
  }

  private async findExpiredWorkspaces(): Promise<Array<{workspace_id: string, tenant_id: string, ttl_hours: number, created_at: Date}>> {
    const query = `
      SELECT workspace_id, tenant_id, ttl_hours, created_at
      FROM workspaces 
      WHERE lifecycle NOT IN ('archived', 'deleted')
        AND created_at + INTERVAL '1 hour' * ttl_hours < NOW()
      ORDER BY created_at ASC
      LIMIT $1
    `;

    return await this.db.query(query, [this.config.batchSize * 10]);
  }

  private async archiveWorkspace(workspace: {workspace_id: string, tenant_id: string, ttl_hours: number}): Promise<ArchivedWorkspace> {
    const { workspace_id, tenant_id } = workspace;
    
    logger.info('Archiving workspace', { workspace_id, tenant_id });

    // Set tenant context for RLS
    await this.db.setTenantContext(tenant_id);

    try {
      await this.db.transaction(async (tx) => {
        // 1. Collect all related data
        const workspaceData = await this.collectWorkspaceData(tx, workspace_id);
        
        // 2. Create data hash for integrity verification
        const dataHash = this.createDataHash(workspaceData);
        
        // 3. Archive to external storage if configured
        let archiveLocation = 'database';
        if (this.config.archiveToS3) {
          archiveLocation = await this.archiveToS3(workspace_id, workspaceData);
        }
        
        if (!this.config.dryRun) {
          // 4. Update workspace lifecycle to archived
          await tx.query(`
            UPDATE workspaces 
            SET lifecycle = 'archived', 
                updated_at = NOW(),
                contract_data = jsonb_set(
                  contract_data, 
                  '{archived}', 
                  jsonb_build_object(
                    'archived_at', to_jsonb(NOW()),
                    'data_hash', to_jsonb($2),
                    'archive_location', to_jsonb($3)
                  )
                )
            WHERE workspace_id = $1
          `, [workspace_id, dataHash, archiveLocation]);

          // 5. Delete sensitive data but keep metadata
          await this.anonymizeWorkspaceData(tx, workspace_id);
        }

        return {
          workspace_id,
          tenant_id,
          archived_at: new Date(),
          data_hash: dataHash,
          archive_location: archiveLocation
        };
      });

    } catch (error) {
      logger.error('Failed to archive workspace', { workspace_id, error });
      throw error;
    }
  }

  private async collectWorkspaceData(tx: any, workspace_id: string): Promise<any> {
    const tables = [
      'workspaces',
      'workspace_runs', 
      'audit_bundles',
      'connectors',
      'consent_records',
      'brand_twins',
      'decision_cards',
      'simulation_results',
      'simulation_reports',
      'agent_runs',
      'asset_fingerprints'
    ];

    const data: any = {};
    
    for (const table of tables) {
      if (table === 'workspaces') {
        data[table] = await tx.query(
          `SELECT * FROM ${table} WHERE workspace_id = $1`,
          [workspace_id]
        );
      } else if (table === 'brand_twins') {
        data[table] = await tx.query(
          `SELECT * FROM ${table} WHERE workspace_id = $1`,
          [workspace_id]
        );
      } else {
        data[table] = await tx.query(
          `SELECT * FROM ${table} WHERE workspace_id = $1`,
          [workspace_id]
        );
      }
    }

    return data;
  }

  private createDataHash(data: any): string {
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(serialized).digest('hex');
  }

  private async archiveToS3(workspace_id: string, data: any): Promise<string> {
    if (!this.config.s3Bucket) {
      throw new Error('S3 bucket not configured for archival');
    }
    const client = new S3Client({});
    const archivePath = `archived-workspaces/${workspace_id}/${Date.now()}.json.gz`;
    const body = gzipSync(Buffer.from(JSON.stringify(data)));

    await client.send(
      new PutObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: archivePath,
        Body: body,
        ContentType: 'application/json',
        ContentEncoding: 'gzip'
      })
    );

    logger.info('Archiving to S3', { workspace_id, archivePath });

    return `s3://${this.config.s3Bucket}/${archivePath}`;
  }

  private async anonymizeWorkspaceData(tx: any, workspace_id: string): Promise<void> {
    // Remove sensitive data but keep audit trail
    const anonymizationQueries = [
      // Anonymize personally identifiable information
      `UPDATE workspaces SET 
         created_by = 'ANONYMIZED',
         contract_data = jsonb_set(contract_data, '{anonymized}', 'true'::jsonb)
       WHERE workspace_id = $1`,
       
      `UPDATE workspace_runs SET 
         results = '{"anonymized": true}'::jsonb
       WHERE workspace_id = $1`,
       
      `UPDATE connectors SET 
         account_id = 'ANONYMIZED',
         display_name = 'ANONYMIZED',
         owner_contact = 'ANONYMIZED',
         credentials_ref = NULL
       WHERE workspace_id = $1`,
       
      `UPDATE consent_records SET 
         granted_by = 'ANONYMIZED',
         document_ref = 'ANONYMIZED'
       WHERE workspace_id = $1`,
       
      `UPDATE brand_twins SET 
         brand_data = jsonb_set(brand_data, '{anonymized}', 'true'::jsonb)
       WHERE workspace_id = $1`,
       
      `UPDATE decision_cards SET 
         approved_by = 'ANONYMIZED',
         card_data = jsonb_set(card_data, '{anonymized}', 'true'::jsonb)
       WHERE workspace_id = $1`,
       
      `UPDATE agent_runs SET 
         input_data = '{"anonymized": true}'::jsonb,
         output_data = '{"anonymized": true}'::jsonb,
         created_by = 'ANONYMIZED'
       WHERE workspace_id = $1`
    ];

    for (const query of anonymizationQueries) {
      await tx.query(query, [workspace_id]);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Cron job runner
export async function runTTLArchivalJob(config?: Partial<TTLArchivalConfig>): Promise<void> {
  const defaultConfig: TTLArchivalConfig = {
    dryRun: false,
    batchSize: 10,
    maxConcurrency: 3,
    archiveToS3: true,
    s3Bucket: process.env.ARCHIVE_S3_BUCKET,
    retentionDays: 2555 // 7 years for compliance
  };

  const finalConfig = { ...defaultConfig, ...config };
  const db = new DatabaseClient();
  const job = new TTLArchivalJob(db, finalConfig);
  
  await job.execute();
}