/**
 * Database utility for SMM Architect Assessment Tool
 * 
 * Provides database connectivity and RLS testing capabilities
 * for the production readiness assessment validators.
 */

import { Client } from 'pg';

export interface DatabaseTestConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  tenantId?: string;
}

/**
 * Create a database client for testing
 */
export async function createTestDatabaseClient(config: DatabaseTestConfig): Promise<Client> {
  const client = new Client({
    connectionString: config.connectionString || process.env['SMM_DATABASE_URL'],
    host: config.host || process.env['DB_HOST'] || 'localhost',
    port: config.port || parseInt(process.env['DB_PORT'] || '5432'),
    database: config.database || process.env['DB_NAME'] || 'smm_architect',
    user: config.username || process.env['DB_USER'] || 'smm_user',
    password: config.password || process.env['DB_PASSWORD']
  });

  await client.connect();
  return client;
}

/**
 * Set tenant context for RLS testing
 */
export async function setTenantContext(client: Client, tenantId: string): Promise<void> {
  await client.query('SELECT set_config(\'app.current_tenant_id\', $1, false)', [tenantId]);
}

/**
 * Clear tenant context
 */
export async function clearTenantContext(client: Client): Promise<void> {
  await client.query('SELECT set_config(\'app.current_tenant_id\', \'\', false)');
}

/**
 * Check if RLS policies are enabled on key tables
 */
export async function checkRLSPolicies(client: Client): Promise<boolean> {
  try {
    const result = await client.query(`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('workspaces', 'workspace_contracts', 'audit_bundles')
    `);
    
    return result.rows.every(row => row.rowsecurity === true);
  } catch (error) {
    console.error('RLS policy check failed:', error);
    return false;
  }
}

/**
 * Test tenant isolation by creating test data and verifying separation
 */
export async function testTenantIsolation(
  client: Client, 
  tenantA: string, 
  tenantB: string
): Promise<boolean> {
  try {
    // Test tenant A isolation
    await setTenantContext(client, tenantA);
    
    // Create test workspace for tenant A
    await client.query(`
      INSERT INTO workspaces (workspace_id, tenant_id, created_by, created_at, updated_at, lifecycle, contract_version, goals, primary_channels, budget, approval_policy, risk_profile, data_retention, ttl_hours, policy_bundle_ref, policy_bundle_checksum, contract_data)
      VALUES ($1, $2, $3, NOW(), NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      `test-workspace-a-${Date.now()}`,
      tenantA,
      'system',
      'ACTIVE',
      '1.0',
      JSON.stringify({ primary: 'engagement' }),
      JSON.stringify(['linkedin', 'twitter']),
      JSON.stringify({ daily: 100 }),
      JSON.stringify({ required: true }),
      'low',
      JSON.stringify({ period: 30 }),
      720,
      'test-ref-a',
      'test-checksum-a',
      JSON.stringify({ test: true })
    ]);
    
    // Query workspaces for tenant A
    const tenantAResult = await client.query('SELECT COUNT(*) as count FROM workspaces');
    const tenantACount = parseInt(tenantAResult.rows[0].count);
    
    // Test tenant B isolation
    await setTenantContext(client, tenantB);
    
    // Create test workspace for tenant B
    await client.query(`
      INSERT INTO workspaces (workspace_id, tenant_id, created_by, created_at, updated_at, lifecycle, contract_version, goals, primary_channels, budget, approval_policy, risk_profile, data_retention, ttl_hours, policy_bundle_ref, policy_bundle_checksum, contract_data)
      VALUES ($1, $2, $3, NOW(), NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      `test-workspace-b-${Date.now()}`,
      tenantB,
      'system',
      'ACTIVE',
      '1.0',
      JSON.stringify({ primary: 'engagement' }),
      JSON.stringify(['linkedin', 'twitter']),
      JSON.stringify({ daily: 100 }),
      JSON.stringify({ required: true }),
      'low',
      JSON.stringify({ period: 30 }),
      720,
      'test-ref-b',
      'test-checksum-b',
      JSON.stringify({ test: true })
    ]);
    
    // Query workspaces for tenant B
    const tenantBResult = await client.query('SELECT COUNT(*) as count FROM workspaces');
    const tenantBCount = parseInt(tenantBResult.rows[0].count);
    
    // Clean up test data
    await setTenantContext(client, tenantA);
    await client.query('DELETE FROM workspaces WHERE workspace_id LIKE $1', [`test-workspace-a-${Date.now()}`]);
    
    await setTenantContext(client, tenantB);
    await client.query('DELETE FROM workspaces WHERE workspace_id LIKE $1', [`test-workspace-b-${Date.now()}`]);
    
    // Each tenant should see exactly one workspace (the one we created for them)
    return tenantACount === 1 && tenantBCount === 1;
  } catch (error) {
    console.error('Tenant isolation test failed:', error);
    return false;
  } finally {
    await clearTenantContext(client);
  }
}

/**
 * Test cross-tenant data leakage
 */
export async function testCrossTenantLeakage(
  client: Client,
  testTenant: string,
  evilTenant: string
): Promise<boolean> {
  try {
    // Set context to evil tenant
    await setTenantContext(client, evilTenant);
    
    // Try to access test tenant's data
    const result = await client.query(
      'SELECT * FROM workspaces WHERE tenant_id = $1 LIMIT 1',
      [testTenant]
    );
    
    // If we get results, there's leakage
    return result.rows.length > 0;
  } catch (error) {
    console.error('Cross-tenant leakage test failed:', error);
    // If we get a permission error, RLS is working correctly
    if (error instanceof Error && (error.message.includes('permission') || error.message.includes('denied'))) {
      return false;
    }
    // Other error, assume leakage for safety
    return true;
  } finally {
    await clearTenantContext(client);
  }
}

/**
 * Close database connection
 */
export async function closeDatabaseClient(client: Client): Promise<void> {
  await client.end();
}