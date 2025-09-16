import { describe, it, expect } from '@jest/globals';
import { AuditService } from '../../services/smm-architect/src/services/audit-service';
import { KMSManager } from '../../services/audit/src/kms/kms-manager';

describe('AuditService KMS integration', () => {
  it('signs and verifies audit bundles with local KMS', async () => {
    const kmsManager = KMSManager.forTesting();
    const keyId = await kmsManager.createKey('test-audit-key');

    const auditService = new AuditService(kmsManager);
    const original = (auditService as any).getWorkspaceContract.bind(auditService);
    (auditService as any).getWorkspaceContract = async (workspaceId: string) => {
      const contract = await original(workspaceId);
      contract.kmsKeyRef = keyId;
      return contract;
    };

    const bundle = await auditService.getAuditBundle('ws-1');
    expect(bundle.signature).toBeDefined();

    const valid = await auditService.verifyBundleSignature(
      bundle.bundleId,
      bundle.signature.signature,
      bundle
    );
    expect(valid).toBe(true);
  });
});
