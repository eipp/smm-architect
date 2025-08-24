#!/bin/bash

# CI script to set up test KMS keys for audit integration testing
# This script creates test keys for local KMS adapter in CI environment

set -euo pipefail

# Configuration
CI_KEYS_DIR="${CI_KEYS_DIR:-./ci/keys}"
TEST_KEY_ID="${TEST_KEY_ID:-ci-test-audit-key}"

echo "🔑 Setting up KMS test keys for CI..."

# Create keys directory
mkdir -p "$CI_KEYS_DIR"
chmod 700 "$CI_KEYS_DIR"

echo "📁 Created CI keys directory: $CI_KEYS_DIR"

# Generate test key pair using Node.js script
cat > /tmp/generate_test_keys.js << 'EOF'
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = process.argv[2];
const keyId = process.argv[3];

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Create metadata
const metadata = {
  keyId,
  alias: keyId,
  keySpec: 'RSA_2048',
  keyUsage: 'SIGN_VERIFY',
  algorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
  keySize: 2048,
  createdAt: new Date().toISOString(),
  status: 'active',
  description: 'CI test key for audit bundle signing',
  tags: { environment: 'ci', purpose: 'audit_testing' }
};

// Write key files
const privateKeyPath = path.join(keysDir, `${keyId}.private.pem`);
const publicKeyPath = path.join(keysDir, `${keyId}.public.pem`);
const metadataPath = path.join(keysDir, `${keyId}.metadata.json`);

fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o644 });

console.log(`✅ Generated test key: ${keyId}`);
console.log(`   Private key: ${privateKeyPath}`);
console.log(`   Public key: ${publicKeyPath}`);
console.log(`   Metadata: ${metadataPath}`);

// Test signing with the generated key
const testData = Buffer.from('CI KMS test signature data');
const sign = crypto.createSign('RSA-SHA256');
sign.update(testData);
sign.end();
const signature = sign.sign(privateKey, 'base64');

// Test verification
const verify = crypto.createVerify('RSA-SHA256');
verify.update(testData);
verify.end();
const isValid = verify.verify(publicKey, signature, 'base64');

if (isValid) {
  console.log('✅ Key validation successful');
} else {
  console.error('❌ Key validation failed');
  process.exit(1);
}
EOF

# Run the key generation script
node /tmp/generate_test_keys.js "$CI_KEYS_DIR" "$TEST_KEY_ID"

# Create additional keys for comprehensive testing
node /tmp/generate_test_keys.js "$CI_KEYS_DIR" "ci-test-workspace-key"
node /tmp/generate_test_keys.js "$CI_KEYS_DIR" "ci-test-contract-key"

# Clean up temp script
rm /tmp/generate_test_keys.js

# Set environment variables for tests
echo "🔧 Setting up environment variables..."
echo "export LOCAL_KMS_KEY_PATH=$CI_KEYS_DIR" > "$CI_KEYS_DIR/env.sh"
echo "export CI_TEST_KEY_ID=$TEST_KEY_ID" >> "$CI_KEYS_DIR/env.sh"
echo "export KMS_PROVIDER=local" >> "$CI_KEYS_DIR/env.sh"

# Create test configuration file
cat > "$CI_KEYS_DIR/test-config.json" << EOF
{
  "kms": {
    "provider": "local",
    "config": {
      "keyStorePath": "$CI_KEYS_DIR"
    }
  },
  "testKeys": {
    "auditSigning": "$TEST_KEY_ID",
    "workspaceSigning": "ci-test-workspace-key", 
    "contractSigning": "ci-test-contract-key"
  },
  "ciEnvironment": true
}
EOF

echo "📝 Created test configuration: $CI_KEYS_DIR/test-config.json"

# Verify all keys were created successfully
echo "🔍 Verifying created keys..."
KEY_COUNT=$(find "$CI_KEYS_DIR" -name "*.private.pem" | wc -l)

if [ "$KEY_COUNT" -eq 3 ]; then
  echo "✅ Successfully created $KEY_COUNT test keys"
else
  echo "❌ Expected 3 keys, found $KEY_COUNT"
  exit 1
fi

# Display key information
echo "📋 Created keys:"
for key_file in "$CI_KEYS_DIR"/*.metadata.json; do
  key_id=$(basename "$key_file" .metadata.json)
  echo "  - $key_id"
done

# Create usage example
cat > "$CI_KEYS_DIR/usage-example.js" << 'EOF'
// Example usage of CI test keys
const { KMSManager } = require('../src/kms/kms-manager');
const path = require('path');

const kms = new KMSManager({
  provider: 'local',
  config: {
    keyStorePath: __dirname
  }
});

async function testAuditSigning() {
  const keyId = 'ci-test-audit-key';
  const testData = Buffer.from('Test audit bundle data');
  
  const signature = await kms.sign(testData, keyId);
  const verified = await kms.verify(testData, signature.signature, keyId);
  
  console.log('Audit signing test:', verified ? '✅ PASS' : '❌ FAIL');
}

// Uncomment to run test
// testAuditSigning().catch(console.error);
EOF

echo "💡 Usage example created: $CI_KEYS_DIR/usage-example.js"

echo ""
echo "🎉 KMS CI setup complete!"
echo ""
echo "To use in tests:"
echo "  export KMS_PROVIDER=local"
echo "  export LOCAL_KMS_KEY_PATH=$CI_KEYS_DIR"
echo "  export CI_TEST_KEY_ID=$TEST_KEY_ID"
echo ""
echo "To load environment:"
echo "  source $CI_KEYS_DIR/env.sh"
echo ""
echo "Key directory: $CI_KEYS_DIR"
echo "Test keys created: 3"
echo "Ready for audit integration testing! 🚀"