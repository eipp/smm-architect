# RDS Snapshot Restoration Runbook

This runbook describes how to restore the production PostgreSQL database from the most recent snapshot and resume service operation.

## Prerequisites
- AWS CLI configured with sufficient permissions
- Database endpoint and credentials for the restored instance
- Access to the SMM Architect infrastructure repository

## Steps
1. **Locate the latest snapshot**
   ```bash
   aws rds describe-db-snapshots \
     --db-instance-identifier smm-architect \
     --snapshot-type automated \
     --query 'reverse(sort_by(DBSnapshots, &SnapshotCreateTime))[0].DBSnapshotIdentifier'
   ```
2. **Restore snapshot to a new instance**
   ```bash
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier smm-architect-restore \
     --db-snapshot-identifier <SNAPSHOT_ID> \
     --db-instance-class db.t3.micro
   ```
3. **Apply security group and subnet settings**
   ```bash
   aws rds modify-db-instance \
     --db-instance-identifier smm-architect-restore \
     --vpc-security-group-ids <SG_ID> \
     --db-subnet-group-name <SUBNET_GROUP>
   ```
4. **Update application configuration**
   - Point `DATABASE_URL` to the new instance endpoint
   - Redeploy services using `pulumi up` or appropriate deployment tool
5. **Validate restoration**
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```
6. **Promote restored instance**
   - Optional: rename instances or update DNS to route traffic to the restored database
   - Decommission the old instance once validated

## Verification Checklist
- [ ] Snapshot restored successfully
- [ ] Application connected to restored database
- [ ] Data integrity verified
- [ ] Old instance cleaned up

---
*Last Updated: 2025-09-05*
