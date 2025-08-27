const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up E2E test environment...');

  // Clean up port forwards if running in K8s mode
  const portForwardPidsFile = path.join(__dirname, '.port-forward-pids');
  if (fs.existsSync(portForwardPidsFile)) {
    console.log('🔌 Cleaning up port forwards...');
    
    try {
      const pids = fs.readFileSync(portForwardPidsFile, 'utf8')
        .split('\n')
        .filter(pid => pid.trim());

      for (const pid of pids) {
        try {
          process.kill(parseInt(pid, 10), 'SIGTERM');
          console.log(`✅ Killed port forward process ${pid}`);
        } catch (error) {
          console.warn(`⚠️  Could not kill process ${pid}: ${error.message}`);
        }
      }

      fs.unlinkSync(portForwardPidsFile);
    } catch (error) {
      console.error('❌ Error cleaning up port forwards:', error.message);
    }
  }

  // Clean up test database if needed
  if (process.env.CLEANUP_TEST_DB === 'true') {
    console.log('🗄️  Cleaning up test database...');
    try {
      execSync('npm run db:test:cleanup', { stdio: 'inherit' });
      console.log('✅ Test database cleanup complete');
    } catch (error) {
      console.error('❌ Failed to cleanup test database:', error.message);
    }
  }

  // Generate test report summary
  const testResultsDir = path.join(__dirname, 'test-results');
  if (fs.existsSync(testResultsDir)) {
    console.log('📊 Generating test report summary...');
    
    try {
      const reportFiles = fs.readdirSync(testResultsDir);
      const summaryPath = path.join(testResultsDir, 'test-summary.json');
      
      const summary = {
        timestamp: new Date().toISOString(),
        environment: process.env.TEST_MODE || 'unknown',
        namespace: process.env.K8S_NAMESPACE || 'local',
        reportFiles: reportFiles,
        testResults: testResultsDir,
      };

      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`✅ Test summary written to ${summaryPath}`);
    } catch (error) {
      console.error('❌ Failed to generate test summary:', error.message);
    }
  }

  console.log('✅ E2E test environment cleanup complete');
};