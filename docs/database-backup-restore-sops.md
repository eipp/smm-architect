# Database Backup, Restore & Disaster Recovery SOPs

## Overview
This document outlines Standard Operating Procedures (SOPs) for PostgreSQL database backup, restore, and disaster recovery operations for the SMM Architect platform.

## 1. Backup Strategy

### 1.1 Backup Types

#### Daily Base Backups
- **Frequency**: Every 24 hours at 02:00 UTC
- **Method**: pg_basebackup with compression
- **Retention**: 30 days
- **Storage**: Encrypted S3 with cross-region replication

```bash
#!/bin/bash
# Daily base backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="smm_architect_base_${DATE}"
S3_BUCKET="smm-architect-backups"

# Create base backup
pg_basebackup -h $DB_HOST -U $DB_USER -D /tmp/${BACKUP_NAME} \
  --format=tar --gzip --progress --verbose \
  --wal-method=stream --write-recovery-conf

# Upload to S3 with encryption
aws s3 sync /tmp/${BACKUP_NAME} s3://${S3_BUCKET}/base/${BACKUP_NAME}/ \
  --storage-class STANDARD_IA \
  --server-side-encryption aws:kms \
  --sse-kms-key-id alias/smm-architect-backup-key

# Cleanup local files
rm -rf /tmp/${BACKUP_NAME}

# Update backup inventory
psql -c "INSERT INTO backup_inventory (backup_type, backup_name, backup_date, s3_location, size_bytes) 
          VALUES ('base', '${BACKUP_NAME}', NOW(), 's3://${S3_BUCKET}/base/${BACKUP_NAME}/', 
                  (SELECT sum(size) FROM pg_stat_file('${BACKUP_NAME}')))"
```

#### Continuous WAL Archiving
- **Method**: WAL-E or pgBackRest with S3
- **Frequency**: Real-time as WAL segments are filled
- **Compression**: gzip level 6
- **Encryption**: KMS-managed keys

```bash
# WAL archival configuration (postgresql.conf)
wal_level = replica
archive_mode = on
archive_command = 'wal-e wal-push %p'
archive_timeout = 300  # 5 minutes
max_wal_senders = 3
```

#### Weekly Logical Backups
- **Frequency**: Every Sunday at 01:00 UTC
- **Method**: pg_dump with custom format
- **Purpose**: Schema validation and selective restore capability
- **Retention**: 12 weeks

```bash
#!/bin/bash
# Weekly logical backup
DATE=$(date +%Y%m%d)
DUMP_FILE="smm_architect_logical_${DATE}.dump"

# Create logical backup with all data
pg_dump -h $DB_HOST -U $DB_USER -d smm_architect \
  --format=custom --compress=6 --verbose \
  --file=/tmp/${DUMP_FILE}

# Upload to S3
aws s3 cp /tmp/${DUMP_FILE} s3://${S3_BUCKET}/logical/${DUMP_FILE} \
  --storage-class STANDARD_IA \
  --server-side-encryption aws:kms

# Test restore capability
pg_restore --list /tmp/${DUMP_FILE} > /tmp/${DUMP_FILE}.toc
aws s3 cp /tmp/${DUMP_FILE}.toc s3://${S3_BUCKET}/logical/${DUMP_FILE}.toc

rm /tmp/${DUMP_FILE} /tmp/${DUMP_FILE}.toc
```

### 1.2 Backup Validation

#### Daily Backup Verification
```bash
#!/bin/bash
# Verify backup integrity
LATEST_BACKUP=$(aws s3 ls s3://${S3_BUCKET}/base/ | sort | tail -n 1 | awk '{print $4}')

# Download and verify base backup
aws s3 sync s3://${S3_BUCKET}/base/${LATEST_BACKUP} /tmp/verify_backup/
tar -tzf /tmp/verify_backup/base.tar.gz > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Backup integrity verified: ${LATEST_BACKUP}"
    # Update monitoring
    curl -X POST "${MONITORING_WEBHOOK}" -d "backup_verification_success=1"
else
    echo "❌ Backup integrity check failed: ${LATEST_BACKUP}"
    # Alert on-call team
    curl -X POST "${ALERT_WEBHOOK}" -d "backup_verification_failed=1"
fi

rm -rf /tmp/verify_backup/
```

## 2. Point-in-Time Recovery (PITR)

### 2.1 PITR Procedure

#### Step 1: Determine Recovery Point
```sql
-- Find the exact time for recovery
SELECT * FROM pg_stat_activity WHERE query LIKE '%DELETE%' OR query LIKE '%DROP%';
SELECT * FROM pg_stat_database WHERE datname = 'smm_architect';

-- Check available WAL files
SELECT * FROM pg_ls_waldir() ORDER BY modification DESC LIMIT 10;
```

#### Step 2: Restore Base Backup
```bash
#!/bin/bash
RECOVERY_TIME="2024-01-15 14:30:00 UTC"
RECOVERY_TARGET_NAME="before_incident"

# Stop PostgreSQL
systemctl stop postgresql

# Backup current data directory
mv $PGDATA $PGDATA.backup.$(date +%s)

# Download and restore base backup
LATEST_BASE=$(aws s3 ls s3://${S3_BUCKET}/base/ | grep -E '[0-9]{8}_[0-9]{6}' | sort | tail -n 1 | awk '{print $4}')
aws s3 sync s3://${S3_BUCKET}/base/${LATEST_BASE} /tmp/recovery/

# Extract base backup
mkdir -p $PGDATA
cd $PGDATA
tar -xzf /tmp/recovery/base.tar.gz

# Set proper ownership
chown -R postgres:postgres $PGDATA
chmod 700 $PGDATA
```

#### Step 3: Configure Recovery
```bash
# Create recovery.conf
cat > $PGDATA/recovery.conf << EOF
restore_command = 'wal-e wal-fetch %f %p'
recovery_target_time = '${RECOVERY_TIME}'
recovery_target_action = 'promote'
recovery_target_inclusive = false
EOF
```

#### Step 4: Start Recovery
```bash
# Start PostgreSQL in recovery mode
systemctl start postgresql

# Monitor recovery progress
tail -f $PGDATA/log/postgresql-*.log

# Verify recovery completion
psql -c "SELECT pg_is_in_recovery();"
```

### 2.2 Recovery Validation
```sql
-- Validate data integrity after recovery
SELECT COUNT(*) FROM workspaces WHERE created_at < '${RECOVERY_TIME}';
SELECT MAX(created_at) FROM audit_bundles;

-- Verify RLS policies are intact
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check for any corruption
SELECT datname, pg_database_size(datname) FROM pg_database;
```

## 3. Quarterly Restore Testing

### 3.1 Test Environment Setup
```bash
#!/bin/bash
# Quarterly restore test procedure
TEST_DATE=$(date +%Y%m%d)
TEST_DB="smm_architect_restore_test_${TEST_DATE}"

# Create test instance
aws rds create-db-instance \
  --db-instance-identifier ${TEST_DB} \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.9 \
  --allocated-storage 100 \
  --master-username testuser \
  --master-user-password $(aws secretsmanager get-secret-value --secret-id test-db-password --query SecretString --output text)
```

### 3.2 Restore Test Procedure
```bash
#!/bin/bash
# Test 1: Base backup restore
echo "🧪 Testing base backup restore..."
LATEST_BACKUP=$(aws s3 ls s3://${S3_BUCKET}/base/ | sort | tail -n 1 | awk '{print $4}')
aws s3 sync s3://${S3_BUCKET}/base/${LATEST_BACKUP} /tmp/test_restore/

# Restore to test instance
pg_restore -h ${TEST_DB_HOST} -U testuser -d postgres \
  --create --verbose /tmp/test_restore/base.tar.gz

# Test 2: Logical backup restore
echo "🧪 Testing logical backup restore..."
LATEST_LOGICAL=$(aws s3 ls s3://${S3_BUCKET}/logical/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp s3://${S3_BUCKET}/logical/${LATEST_LOGICAL} /tmp/logical_test.dump

createdb -h ${TEST_DB_HOST} -U testuser smm_architect_logical_test
pg_restore -h ${TEST_DB_HOST} -U testuser -d smm_architect_logical_test \
  --verbose /tmp/logical_test.dump

# Test 3: PITR simulation
echo "🧪 Testing PITR capability..."
PITR_TIME=$(date -d '1 hour ago' '+%Y-%m-%d %H:%M:%S UTC')
# Simulate PITR process with 1-hour-old data
```

### 3.3 Test Validation
```sql
-- Validate restore completeness
DO $$
DECLARE
    table_count INTEGER;
    expected_tables INTEGER := 11; -- workspaces, workspace_runs, etc.
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    IF table_count = expected_tables THEN
        RAISE NOTICE '✅ All tables restored: %', table_count;
    ELSE
        RAISE EXCEPTION '❌ Missing tables. Expected: %, Found: %', expected_tables, table_count;
    END IF;
END $$;

-- Validate RLS policies
SELECT 
    CASE 
        WHEN COUNT(*) = 9 THEN '✅ All RLS policies restored'
        ELSE '❌ Missing RLS policies: ' || COUNT(*) || '/9'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('workspaces', 'workspace_runs', 'audit_bundles', 'connectors', 'consent_records', 'brand_twins', 'decision_cards', 'simulation_results', 'asset_fingerprints')
AND rowsecurity = true;

-- Data integrity checks
SELECT 
    'workspaces' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM workspaces
UNION ALL
SELECT 'audit_bundles', COUNT(*), MIN(created_at), MAX(created_at) FROM audit_bundles
UNION ALL
SELECT 'simulation_results', COUNT(*), MIN(created_at), MAX(created_at) FROM simulation_results;
```

## 4. Disaster Recovery Procedures

### 4.1 RTO/RPO Targets
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 15 minutes
- **Maximum Allowable Downtime**: 8 hours for planned maintenance

### 4.2 DR Scenario Responses

#### Scenario 1: Primary Database Failure
```bash
#!/bin/bash
# Automated failover to standby
echo "🚨 Primary database failure detected"

# Promote standby replica
aws rds promote-read-replica --db-instance-identifier smm-architect-standby

# Update DNS to point to new primary
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 \
  --change-batch file://dns-failover.json

# Notify incident response team
curl -X POST "${INCIDENT_WEBHOOK}" \
  -d '{"alert": "database_failover", "status": "promoted_standby"}'
```

#### Scenario 2: Data Corruption
```bash
#!/bin/bash
# PITR to point before corruption
CORRUPTION_TIME="2024-01-15 15:45:00 UTC"
RECOVERY_TIME=$(date -d "${CORRUPTION_TIME} -5 minutes" '+%Y-%m-%d %H:%M:%S UTC')

echo "🔧 Initiating PITR for data corruption at ${CORRUPTION_TIME}"
echo "🎯 Recovery target: ${RECOVERY_TIME}"

# Execute PITR procedure (reference Section 2.1)
```

#### Scenario 3: Complete Site Failure
```bash
#!/bin/bash
# Cross-region disaster recovery
echo "🌊 Site failure - activating DR region"

# Launch infrastructure in DR region
cd infrastructure/pulumi/dr
pulumi up --stack dr-region

# Restore from cross-region backups
aws s3 sync s3://smm-architect-backups s3://smm-architect-backups-dr-restored \
  --source-region us-east-1 --region us-west-2

# Initialize new database cluster in DR region
```

## 5. Monitoring and Alerting

### 5.1 Backup Monitoring
```sql
-- Create backup monitoring table
CREATE TABLE backup_inventory (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL,
    backup_name VARCHAR(255) NOT NULL,
    backup_date TIMESTAMP WITH TIME ZONE NOT NULL,
    s3_location TEXT NOT NULL,
    size_bytes BIGINT,
    verification_status VARCHAR(50) DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backup health check query
SELECT 
    backup_type,
    COUNT(*) as backup_count,
    MAX(backup_date) as latest_backup,
    NOW() - MAX(backup_date) as time_since_last,
    SUM(size_bytes) as total_size_bytes
FROM backup_inventory 
WHERE backup_date > NOW() - INTERVAL '7 days'
GROUP BY backup_type;
```

### 5.2 Alert Configuration
```yaml
# Prometheus alerting rules
groups:
  - name: postgresql_backup
    rules:
      - alert: BackupMissing
        expr: time() - postgres_backup_last_success_timestamp > 86400
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL backup missing for > 24 hours"
          
      - alert: BackupVerificationFailed
        expr: postgres_backup_verification_failed == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL backup verification failed"
          
      - alert: WALArchivalLag
        expr: postgres_wal_archival_lag_seconds > 900
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL WAL archival lagging > 15 minutes"
```

## 6. Compliance and Security

### 6.1 Encryption Requirements
- **At Rest**: AES-256 with KMS-managed keys
- **In Transit**: TLS 1.3 with perfect forward secrecy
- **Backup Encryption**: Client-side encryption before S3 upload

### 6.2 Access Controls
```sql
-- Backup operator role with minimal privileges
CREATE ROLE backup_operator;
GRANT CONNECT ON DATABASE smm_architect TO backup_operator;
GRANT USAGE ON SCHEMA public TO backup_operator;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_operator;

-- Audit backup access
CREATE TABLE backup_access_log (
    id SERIAL PRIMARY KEY,
    operator_name VARCHAR(255) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    backup_name VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);
```

## 7. Testing Schedule

### 7.1 Quarterly Test Calendar
- **Q1**: Full disaster recovery simulation (cross-region)
- **Q2**: PITR accuracy test (various time points)
- **Q3**: Backup integrity and performance test
- **Q4**: Security and compliance audit

### 7.2 Monthly Validation
- **Week 1**: Verify backup retention policies
- **Week 2**: Test logical backup restore
- **Week 3**: Validate WAL archival integrity
- **Week 4**: Performance benchmark restore times

---

**Last Updated**: 2024-01-15  
**Next Review**: 2024-04-15  
**Owner**: Database Operations Team  
**Approver**: Chief Technology Officer