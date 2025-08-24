import crypto from 'crypto';
import { StorageService } from './storage-service';

export interface ContractSnapshot {
  contractId: string;
  contractVersion: string;
  previousContractRef?: string;
  contractHash: string;
  contractContent: any;
  snapshotAt: string;
  snapshotBy: string;
  policyBundleChecksum: string;
  kmsKeyRef?: string;
  isImmutable: boolean;
}

export interface ContractChangeLogEntry {
  version: string;
  changedBy: string;
  changedAt: string;
  changes: string[];
  migrationRequired: boolean;
  previousHash?: string;
}

export class ContractSnapshotter {
  private storageService: StorageService;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Create an immutable snapshot of a workspace contract
   */
  async createSnapshot(
    workspaceId: string,
    contractContent: any,
    snapshotBy: string,
    changeLog?: ContractChangeLogEntry[]
  ): Promise<ContractSnapshot> {
    try {
      // Validate contract content has required immutability fields
      this.validateContractContent(contractContent);

      // Generate deterministic hash of contract content
      const contractHash = this.generateContractHash(contractContent);
      const contractId = `${workspaceId}-${contractContent.contractVersion}`;
      
      // Create snapshot object
      const snapshot: ContractSnapshot = {
        contractId,
        contractVersion: contractContent.contractVersion,
        previousContractRef: contractContent.previousContractRef,
        contractHash,
        contractContent,
        snapshotAt: new Date().toISOString(),
        snapshotBy,
        policyBundleChecksum: contractContent.policyBundleChecksum,
        kmsKeyRef: contractContent.kmsKeyRef,
        isImmutable: true
      };

      // Store snapshot in immutable storage
      const snapshotPath = this.generateSnapshotPath(workspaceId, contractContent.contractVersion);
      const snapshotData = this.createCanonicalSnapshot(snapshot, changeLog);
      
      await this.storageService.store(snapshotPath, Buffer.from(snapshotData));

      return snapshot;

    } catch (error) {
      throw new Error(`Failed to create contract snapshot: ${error.message}`);
    }
  }

  /**
   * Retrieve a contract snapshot by workspace and version
   */
  async getSnapshot(workspaceId: string, contractVersion: string): Promise<ContractSnapshot | null> {
    try {
      const snapshotPath = this.generateSnapshotPath(workspaceId, contractVersion);
      
      if (!await this.storageService.exists(snapshotPath)) {
        return null;
      }

      const snapshotData = await this.storageService.retrieve(snapshotPath);
      const snapshotObj = JSON.parse(snapshotData.toString());

      // Verify snapshot integrity
      const expectedHash = this.generateContractHash(snapshotObj.contractContent);
      if (snapshotObj.contractHash !== expectedHash) {
        throw new Error(`Contract snapshot integrity violation: hash mismatch for ${contractVersion}`);
      }

      return snapshotObj as ContractSnapshot;

    } catch (error) {
      throw new Error(`Failed to retrieve contract snapshot: ${error.message}`);
    }
  }

  /**
   * Get the latest contract snapshot for a workspace
   */
  async getLatestSnapshot(workspaceId: string): Promise<ContractSnapshot | null> {
    try {
      // List all snapshots for the workspace
      const snapshots = await this.listSnapshots(workspaceId);
      
      if (snapshots.length === 0) {
        return null;
      }

      // Sort by version and get the latest
      const latestVersion = snapshots.sort((a, b) => this.compareVersions(b, a))[0];
      return await this.getSnapshot(workspaceId, latestVersion);

    } catch (error) {
      throw new Error(`Failed to get latest contract snapshot: ${error.message}`);
    }
  }

  /**
   * Verify contract immutability chain
   */
  async verifyImmutabilityChain(workspaceId: string, targetVersion: string): Promise<boolean> {
    try {
      const snapshot = await this.getSnapshot(workspaceId, targetVersion);
      if (!snapshot) {
        return false;
      }

      // Verify current snapshot integrity
      const currentHash = this.generateContractHash(snapshot.contractContent);
      if (currentHash !== snapshot.contractHash) {
        return false;
      }

      // If this has a previous contract reference, verify the chain
      if (snapshot.previousContractRef) {
        const previousSnapshot = await this.findSnapshotByHash(workspaceId, snapshot.previousContractRef);
        if (!previousSnapshot) {
          return false;
        }

        // Recursively verify the previous snapshot
        return await this.verifyImmutabilityChain(workspaceId, previousSnapshot.contractVersion);
      }

      return true;

    } catch (error) {
      console.error(`Error verifying immutability chain: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate snapshot storage path
   */
  private generateSnapshotPath(workspaceId: string, contractVersion: string): string {
    return `audit-snapshots/${workspaceId}/${contractVersion}/contract.json`;
  }

  /**
   * Generate deterministic hash of contract content
   */
  private generateContractHash(contractContent: any): string {
    // Create canonical representation for consistent hashing
    const canonical = this.canonicalizeContract(contractContent);
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Create canonical JSON representation for consistent hashing
   */
  private canonicalizeContract(contract: any): string {
    // Remove timestamp fields that change during processing
    const canonicalContract = {
      ...contract,
      // Exclude createdAt as it may vary during processing
      createdAt: undefined,
      signedBy: contract.signedBy ? {
        ...contract.signedBy,
        signedAt: undefined // Exclude signing timestamp from canonical form
      } : undefined
    };

    // Sort keys recursively for deterministic output
    return JSON.stringify(canonicalContract, Object.keys(canonicalContract).sort().filter(key => 
      canonicalContract[key] !== undefined
    ));
  }

  /**
   * Create canonical snapshot with change log
   */
  private createCanonicalSnapshot(snapshot: ContractSnapshot, changeLog?: ContractChangeLogEntry[]): string {
    const snapshotWithLog = {
      ...snapshot,
      changeLog: changeLog || []
    };

    return JSON.stringify(snapshotWithLog, null, 2);
  }

  /**
   * Validate contract content has required immutability fields
   */
  private validateContractContent(contract: any): void {
    const requiredFields = [
      'workspaceId',
      'contractVersion',
      'policyBundleChecksum',
      'lifecycle'
    ];

    for (const field of requiredFields) {
      if (!contract[field]) {
        throw new Error(`Contract missing required field for immutability: ${field}`);
      }
    }

    // Validate version format
    if (!/^v\d+\.\d+\.\d+$/.test(contract.contractVersion)) {
      throw new Error('Contract version must be in semantic version format (e.g., v1.0.0)');
    }

    // Validate policy bundle checksum format
    if (!/^[a-f0-9]{64}$/.test(contract.policyBundleChecksum)) {
      throw new Error('Policy bundle checksum must be a valid SHA-256 hash');
    }
  }

  /**
   * List all contract versions for a workspace
   */
  private async listSnapshots(workspaceId: string): Promise<string[]> {
    try {
      const prefix = `audit-snapshots/${workspaceId}/`;
      const allPaths = await this.storageService.list(prefix);
      
      // Extract version from paths like "audit-snapshots/ws-123/v1.0.0/contract.json"
      const versions = allPaths
        .filter(path => path.endsWith('/contract.json'))
        .map(path => {
          const parts = path.split('/');
          return parts[parts.length - 2]; // Get version part
        })
        .filter(version => /^v\d+\.\d+\.\d+$/.test(version));

      return versions;

    } catch (error) {
      throw new Error(`Failed to list contract snapshots: ${error.message}`);
    }
  }

  /**
   * Find snapshot by contract hash
   */
  private async findSnapshotByHash(workspaceId: string, targetHash: string): Promise<ContractSnapshot | null> {
    try {
      const versions = await this.listSnapshots(workspaceId);
      
      for (const version of versions) {
        const snapshot = await this.getSnapshot(workspaceId, version);
        if (snapshot && snapshot.contractHash === targetHash.replace('sha256:', '')) {
          return snapshot;
        }
      }

      return null;

    } catch (error) {
      console.error(`Error finding snapshot by hash: ${error.message}`);
      return null;
    }
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(a: string, b: string): number {
    const parseVersion = (v: string) => v.replace('v', '').split('.').map(Number);
    const [aMajor, aMinor, aPatch] = parseVersion(a);
    const [bMajor, bMinor, bPatch] = parseVersion(b);

    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }
}