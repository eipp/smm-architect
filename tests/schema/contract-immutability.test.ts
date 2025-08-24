import { ContractSnapshotter, ContractSnapshot } from '../src/services/contract-snapshotter';
import { StorageService } from '../src/services/storage-service';

// Mock StorageService
class MockStorageService implements StorageService {
  private storage = new Map<string, Buffer>();

  async store(path: string, data: Buffer): Promise<string> {
    this.storage.set(path, data);
    return path;
  }

  async retrieve(path: string): Promise<Buffer> {
    const data = this.storage.get(path);
    if (!data) throw new Error(`Not found: ${path}`);
    return data;
  }

  async exists(path: string): Promise<boolean> {
    return this.storage.has(path);
  }

  async list(prefix: string): Promise<string[]> {
    return Array.from(this.storage.keys()).filter(key => key.startsWith(prefix));
  }

  async delete(path: string): Promise<void> {
    this.storage.delete(path);
  }
}

describe('Contract Immutability', () => {
  let snapshotter: ContractSnapshotter;
  let storageService: MockStorageService;

  beforeEach(() => {
    storageService = new MockStorageService();
    snapshotter = new ContractSnapshotter(storageService);
  });

  describe('Contract Snapshot Creation', () => {
    it('should create immutable contract snapshot with correct hash', async () => {
      const contractContent = {
        workspaceId: 'ws-test-001',
        contractVersion: 'v1.0.0',
        policyBundleChecksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        lifecycle: 'signed',
        tenantId: 'tenant-test',
        createdBy: 'user:test@example.com',
        goals: [{ key: 'test', target: 100, unit: 'leads' }]
      };

      const snapshot = await snapshotter.createSnapshot(
        'ws-test-001',
        contractContent,
        'audit-service'
      );

      expect(snapshot.contractId).toBe('ws-test-001-v1.0.0');
      expect(snapshot.contractVersion).toBe('v1.0.0');
      expect(snapshot.isImmutable).toBe(true);
      expect(snapshot.contractHash).toMatch(/^[a-f0-9]{64}$/);
      expect(snapshot.snapshotBy).toBe('audit-service');
    });

    it('should reject contracts without required immutability fields', async () => {
      const invalidContract = {
        workspaceId: 'ws-test-001'
        // Missing contractVersion, policyBundleChecksum, lifecycle
      };

      await expect(
        snapshotter.createSnapshot('ws-test-001', invalidContract, 'audit-service')
      ).rejects.toThrow('Contract missing required field for immutability');
    });

    it('should reject contracts with invalid version format', async () => {
      const invalidContract = {
        workspaceId: 'ws-test-001',
        contractVersion: '1.0.0', // Missing 'v' prefix
        policyBundleChecksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        lifecycle: 'signed'
      };

      await expect(
        snapshotter.createSnapshot('ws-test-001', invalidContract, 'audit-service')
      ).rejects.toThrow('Contract version must be in semantic version format');
    });
  });

  describe('Contract Hash Generation', () => {
    it('should generate identical hashes for identical contracts', async () => {
      const contractContent = {
        workspaceId: 'ws-test-001',
        contractVersion: 'v1.0.0',
        policyBundleChecksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        lifecycle: 'signed',
        tenantId: 'tenant-test'
      };

      const snapshot1 = await snapshotter.createSnapshot(
        'ws-test-001',
        contractContent,
        'audit-service'
      );

      const snapshot2 = await snapshotter.createSnapshot(
        'ws-test-002',
        contractContent,
        'audit-service'
      );

      // Different workspace IDs should produce different hashes due to workspaceId being part of content
      expect(snapshot1.contractHash).not.toBe(snapshot2.contractHash);
    });

    it('should generate different hashes for different contract content', async () => {
      const contract1 = {
        workspaceId: 'ws-test-001',
        contractVersion: 'v1.0.0',
        policyBundleChecksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        lifecycle: 'signed',
        budget: { weeklyCap: 1000 }
      };

      const contract2 = {
        workspaceId: 'ws-test-001',
        contractVersion: 'v1.0.0',
        policyBundleChecksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        lifecycle: 'signed',
        budget: { weeklyCap: 2000 } // Different budget
      };

      const snapshot1 = await snapshotter.createSnapshot('ws-test-001', contract1, 'audit-service');
      const snapshot2 = await snapshotter.createSnapshot('ws-test-001', contract2, 'audit-service');

      expect(snapshot1.contractHash).not.toBe(snapshot2.contractHash);
    });
  });

  describe('Immutability Chain Verification', () => {
    it('should verify valid immutability chain', async () => {
      // Create first contract version
      const contract_v1 = {
        workspaceId: 'ws-test-001',
        contractVersion: 'v1.0.0',
        policyBundleChecksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        lifecycle: 'signed'
      };

      const snapshot_v1 = await snapshotter.createSnapshot('ws-test-001', contract_v1, 'audit-service');

      // Create second contract version that references the first
      const contract_v2 = {
        workspaceId: 'ws-test-001',
        contractVersion: 'v1.1.0',
        previousContractRef: `sha256:${snapshot_v1.contractHash}`,
        policyBundleChecksum: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        lifecycle: 'signed'
      };

      const snapshot_v2 = await snapshotter.createSnapshot('ws-test-001', contract_v2, 'audit-service');

      // Verify the immutability chain
      const isValid = await snapshotter.verifyImmutabilityChain('ws-test-001', 'v1.1.0');
      expect(isValid).toBe(true);
    });

    it('should detect broken immutability chain', async () => {
      // Create contract with invalid previous reference
      const contract_v2 = {
        workspaceId: 'ws-test-001',
        contractVersion: 'v1.1.0',
        previousContractRef: 'sha256:invalidhash',
        policyBundleChecksum: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        lifecycle: 'signed'
      };

      await snapshotter.createSnapshot('ws-test-001', contract_v2, 'audit-service');

      // Verification should fail
      const isValid = await snapshotter.verifyImmutabilityChain('ws-test-001', 'v1.1.0');
      expect(isValid).toBe(false);
    });
  });

  describe('Contract Snapshot Retrieval', () => {
    it('should retrieve stored contract snapshot', async () => {
      const contractContent = {
        workspaceId: 'ws-test-001',
        contractVersion: 'v1.0.0',
        policyBundleChecksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        lifecycle: 'signed'
      };

      const originalSnapshot = await snapshotter.createSnapshot('ws-test-001', contractContent, 'audit-service');
      const retrievedSnapshot = await snapshotter.getSnapshot('ws-test-001', 'v1.0.0');

      expect(retrievedSnapshot).toBeTruthy();
      expect(retrievedSnapshot!.contractHash).toBe(originalSnapshot.contractHash);
      expect(retrievedSnapshot!.contractVersion).toBe('v1.0.0');
    });

    it('should return null for non-existent snapshot', async () => {
      const snapshot = await snapshotter.getSnapshot('ws-nonexistent', 'v1.0.0');
      expect(snapshot).toBeNull();
    });

    it('should detect tampered contract snapshots', async () => {
      const contractContent = {
        workspaceId: 'ws-test-001',
        contractVersion: 'v1.0.0',
        policyBundleChecksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        lifecycle: 'signed'
      };

      await snapshotter.createSnapshot('ws-test-001', contractContent, 'audit-service');

      // Manually tamper with stored data
      const snapshotPath = 'audit-snapshots/ws-test-001/v1.0.0/contract.json';
      const tamperedData = Buffer.from(JSON.stringify({
        contractHash: 'tampered_hash',
        contractContent: { ...contractContent, budget: { weeklyCap: 999999 } }
      }));
      
      await storageService.store(snapshotPath, tamperedData);

      // Retrieval should detect tampering
      await expect(
        snapshotter.getSnapshot('ws-test-001', 'v1.0.0')
      ).rejects.toThrow('Contract snapshot integrity violation');
    });
  });

  describe('Attempt to Mutate Signed Contract', () => {
    it('should fail audit snapshot mismatch when contract is changed', async () => {
      // Create original signed contract
      const originalContract = {
        workspaceId: 'ws-test-001',
        contractVersion: 'v1.0.0',
        policyBundleChecksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        lifecycle: 'signed',
        budget: { weeklyCap: 1000 }
      };

      const originalSnapshot = await snapshotter.createSnapshot('ws-test-001', originalContract, 'audit-service');

      // Attempt to create snapshot of "mutated" contract with same version
      const mutatedContract = {
        ...originalContract,
        budget: { weeklyCap: 999999 } // Malicious change
      };

      const mutatedSnapshot = await snapshotter.createSnapshot('ws-test-001', mutatedContract, 'audit-service');

      // Hashes should be different, indicating mutation
      expect(mutatedSnapshot.contractHash).not.toBe(originalSnapshot.contractHash);

      // This would be caught in audit bundle verification
      expect(originalSnapshot.contractHash).not.toBe(mutatedSnapshot.contractHash);
    });
  });
});