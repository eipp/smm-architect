#!/usr/bin/env node

// Health check script for Model Router Service
// This is used in non-distroless environments or debugging

const http = require('http');
const https = require('https');

const HEALTH_CHECK_CONFIG = {
  timeout: 5000,
  retries: 3,
  retryDelay: 1000,
};

async function performHealthCheck() {
  const port = process.env.PORT || 3003;
  const protocol = process.env.HTTPS_ENABLED === 'true' ? https : http;
  
  const options = {
    hostname: 'localhost',
    port: port,
    path: '/health',
    method: 'GET',
    timeout: HEALTH_CHECK_CONFIG.timeout,
    headers: {
      'User-Agent': 'HealthCheck/1.0',
    }
  };

  return new Promise((resolve, reject) => {
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const healthData = JSON.parse(data);
            console.log('Health check passed:', healthData);
            resolve(true);
          } else {
            console.error(`Health check failed with status ${res.statusCode}: ${data}`);
            resolve(false);
          }
        } catch (error) {
          console.error('Health check response parsing error:', error.message);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Health check request error:', error.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.error('Health check timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function healthCheckWithRetries() {
  for (let attempt = 1; attempt <= HEALTH_CHECK_CONFIG.retries; attempt++) {
    console.log(`Health check attempt ${attempt}/${HEALTH_CHECK_CONFIG.retries}`);
    
    const success = await performHealthCheck();
    if (success) {
      console.log('✅ Health check successful');
      process.exit(0);
    }
    
    if (attempt < HEALTH_CHECK_CONFIG.retries) {
      console.log(`⏳ Retrying in ${HEALTH_CHECK_CONFIG.retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_CONFIG.retryDelay));
    }
  }
  
  console.error('❌ Health check failed after all retries');
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Health check received SIGTERM, exiting...');
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Health check received SIGINT, exiting...');
  process.exit(1);
});

// Run health check
healthCheckWithRetries().catch((error) => {
  console.error('Health check error:', error);
  process.exit(1);
});