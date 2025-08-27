const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🔧 Setting up E2E test environment...');

  // Create test results directory
  const testResultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // Check if services are running locally or in cluster
  const isLocalTest = process.env.TEST_MODE === 'local';
  const isK8sTest = process.env.TEST_MODE === 'k8s';

  if (isK8sTest) {
    console.log('📋 Setting up Kubernetes port forwards for testing...');
    
    // Start port forwards for each service
    const services = [
      { name: 'smm-architect-service', port: 4000 },
      { name: 'smm-toolhub-service', port: 3001 },
      { name: 'smm-model-router-service', port: 3002 },
      { name: 'smm-publisher-service', port: 3003 },
      { name: 'smm-agents-service', port: 3004 },
    ];

    const namespace = process.env.K8S_NAMESPACE || 'smm-architect';
    const portForwardPids = [];

    for (const service of services) {
      try {
        console.log(`🔗 Setting up port forward for ${service.name}:${service.port}`);
        
        const cmd = `kubectl port-forward service/${service.name} ${service.port}:${service.port} -n ${namespace}`;
        const child = require('child_process').spawn('kubectl', [
          'port-forward',
          `service/${service.name}`,
          `${service.port}:${service.port}`,
          '-n',
          namespace
        ], {
          stdio: 'pipe',
          detached: false,
        });

        portForwardPids.push(child.pid);
        
        // Wait a bit for port forward to establish
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`✅ Port forward established for ${service.name} (PID: ${child.pid})`);
      } catch (error) {
        console.error(`❌ Failed to set up port forward for ${service.name}:`, error.message);
      }
    }

    // Store PIDs for cleanup
    fs.writeFileSync(
      path.join(__dirname, '.port-forward-pids'),
      portForwardPids.join('\n')
    );

    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Give services time to start
  }

  if (isLocalTest) {
    console.log('🏠 Running tests against local services');
    
    // Check if local services are running
    const services = [
      { name: 'Core Service', url: 'http://localhost:4000' },
      { name: 'ToolHub Service', url: 'http://localhost:3001' },
      { name: 'Model Router Service', url: 'http://localhost:3002' },
      { name: 'Publisher Service', url: 'http://localhost:3003' },
      { name: 'Agents Service', url: 'http://localhost:3004' },
    ];

    for (const service of services) {
      try {
        console.log(`🔍 Checking ${service.name}...`);
        const response = await fetch(`${service.url}/health`, { timeout: 5000 });
        if (response.ok) {
          console.log(`✅ ${service.name} is ready`);
        } else {
          console.warn(`⚠️  ${service.name} returned status ${response.status}`);
        }
      } catch (error) {
        console.warn(`⚠️  ${service.name} is not ready: ${error.message}`);
      }
    }
  }

  // Create test database if needed
  if (process.env.CREATE_TEST_DB === 'true') {
    console.log('🗄️  Setting up test database...');
    try {
      execSync('npm run db:test:setup', { stdio: 'inherit' });
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test database:', error.message);
    }
  }

  // Generate test data if needed
  if (process.env.GENERATE_TEST_DATA === 'true') {
    console.log('📊 Generating test data...');
    try {
      execSync('npm run test:data:generate', { stdio: 'inherit' });
      console.log('✅ Test data generation complete');
    } catch (error) {
      console.error('❌ Failed to generate test data:', error.message);
    }
  }

  console.log('✅ E2E test environment setup complete');
};