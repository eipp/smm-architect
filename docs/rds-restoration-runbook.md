# RDS Snapshot Restoration Runbook

This runbook describes how to restore the production database from the most recent automated snapshot.

## Prerequisites
- AWS CLI configured with access to the target account
- IAM permissions for RDS restore and S3 access
- Identifier of the RDS instance to restore

## 1. Locate the Latest Snapshot
```bash
DB_INSTANCE_ID="smm-postgres"
LATEST_SNAPSHOT=$(aws rds describe-db-snapshots \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --snapshot-type automated \
  --query 'max_by(DBSnapshots,&SnapshotCreateTime).DBSnapshotIdentifier' \
  --output text)
```

## 2. Restore the Snapshot
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "${DB_INSTANCE_ID}-restore" \
  --db-snapshot-identifier "$LATEST_SNAPSHOT" \
  --db-subnet-group-name smm-db-subnet-group \
  --no-publicly-accessible
```

## 3. Promote Restored Instance
1. Wait for the restored instance to reach the `available` status.
2. Update application configuration with the new endpoint.
3. Run database migrations as needed.

## 4. Cleanup
- Once verified, decommission the old instance if required.
- Remove temporary restore instances to avoid charges.

## Verification
```bash
aws rds describe-db-instances --db-instance-identifier "${DB_INSTANCE_ID}-restore" \
  --query 'DBInstances[0].DBInstanceStatus'
```
Ensure the status returns `available` before resuming normal operations.
