import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { 
  createMetricsServer, 
  startMetricsCollection, 
  createMetricsMiddleware,
  HealthCheckService 
} from './metrics-service';
import { E2ESmokeTestSuite } from './e2e-smoke-tests';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const app = express();
const port = process.env.PORT || 3000;

// Initialize services
const healthCheck = new HealthCheckService();
const smokeTestSuite = new E2ESmokeTestSuite();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Add metrics middleware
app.use(createMetricsMiddleware('monitoring'));

// Merge metrics server routes
const metricsServer = createMetricsServer();
app.use('/', metricsServer);

// Additional monitoring endpoints

/**
 * GET /smoke-test
 * Run comprehensive smoke tests across all services
 */
app.get('/smoke-test', async (req, res) => {
  try {
    logger.info('Starting smoke test suite via API');
    
    const report = await smokeTestSuite.runSmokeTests();
    
    const statusCode = report.overall === 'passed' ? 200 : 
                      report.failed > 0 ? 500 : 503;
    
    res.status(statusCode).json(report);
    
  } catch (error) {
    logger.error('Smoke test suite failed', {
      error: error instanceof Error ? error.message : error
    });
    
    res.status(500).json({
      error: 'Smoke test suite failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /smoke-test/html
 * Run smoke tests and return HTML report
 */
app.get('/smoke-test/html', async (req, res) => {
  try {
    logger.info('Starting smoke test suite for HTML report');
    
    const report = await smokeTestSuite.runSmokeTests();
    const html = smokeTestSuite.generateHtmlReport(report);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    logger.error('HTML smoke test report failed', {
      error: error instanceof Error ? error.message : error
    });
    
    res.status(500).send(`
      <html>
        <body>
          <h1>Smoke Test Failed</h1>
          <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </body>
      </html>
    `);
  }
});

/**
 * POST /smoke-test/custom
 * Run smoke tests with custom configuration
 */
app.post('/smoke-test/custom', async (req, res) => {
  try {
    const customConfig = req.body;
    
    logger.info('Starting custom smoke test suite', {
      config: customConfig
    });
    
    const customSuite = new E2ESmokeTestSuite(customConfig);
    const report = await customSuite.runSmokeTests();
    
    const statusCode = report.overall === 'passed' ? 200 : 
                      report.failed > 0 ? 500 : 503;
    
    res.status(statusCode).json(report);
    
  } catch (error) {
    logger.error('Custom smoke test failed', {
      error: error instanceof Error ? error.message : error
    });
    
    res.status(500).json({
      error: 'Custom smoke test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /dashboard
 * Serve a simple monitoring dashboard
 */
app.get('/dashboard', (req, res) => {
  const dashboardHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SMM Architect Monitoring Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { margin-top: 0; color: #333; }
        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 5px; }
        .button:hover { background: #0056b3; }
        .status { padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        .status.healthy { background: #d4edda; color: #155724; }
        .status.unhealthy { background: #f8d7da; color: #721c24; }
        .iframe-container { position: relative; width: 100%; height: 400px; border: 1px solid #ddd; border-radius: 4px; }
        .iframe-container iframe { width: 100%; height: 100%; border: none; }
      </style>
      <script>
        async function runSmokeTest() {
          document.getElementById('smoke-test-result').innerHTML = 'Running tests...';
          try {
            const response = await fetch('/smoke-test');
            const result = await response.json();
            document.getElementById('smoke-test-result').innerHTML = 
              '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
          } catch (error) {
            document.getElementById('smoke-test-result').innerHTML = 'Error: ' + error.message;
          }
        }
        
        async function checkHealth() {
          try {
            const response = await fetch('/health');
            const health = await response.json();
            document.getElementById('health-status').innerHTML = 
              '<span class="status ' + (health.status === 'healthy' ? 'healthy' : 'unhealthy') + '">' + 
              health.status.toUpperCase() + '</span>';
          } catch (error) {
            document.getElementById('health-status').innerHTML = 
              '<span class="status unhealthy">ERROR</span>';
          }
        }
        
        // Auto-refresh health status
        setInterval(checkHealth, 30000);
        window.onload = checkHealth;
      </script>
    </head>
    <body>
      <div class="header">
        <h1>SMM Architect Monitoring Dashboard</h1>
        <p>Central monitoring and observability for all SMM Architect services</p>
        <div>
          <strong>Health Status:</strong> <span id="health-status">Checking...</span>
          <button onclick="checkHealth()" style="margin-left: 10px;">Refresh</button>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>🔍 Metrics & Monitoring</h3>
          <p>Access real-time metrics and monitoring tools</p>
          <a href="/metrics" class="button">Prometheus Metrics</a>
          <a href="http://localhost:9090" class="button" target="_blank">Prometheus UI</a>
          <a href="http://localhost:3007" class="button" target="_blank">Grafana Dashboards</a>
        </div>

        <div class="card">
          <h3>🚨 Alerting</h3>
          <p>View and manage system alerts</p>
          <a href="http://localhost:9093" class="button" target="_blank">AlertManager</a>
          <a href="/health" class="button">Health Checks</a>
        </div>

        <div class="card">
          <h3>🧪 Testing</h3>
          <p>Run comprehensive system tests</p>
          <a href="/smoke-test/html" class="button" target="_blank">Smoke Test Report</a>
          <button onclick="runSmokeTest()" class="button">Run Tests</button>
        </div>

        <div class="card">
          <h3>📊 Performance</h3>
          <p>System performance and resource usage</p>
          <a href="http://localhost:9100/metrics" class="button" target="_blank">Node Metrics</a>
          <a href="http://localhost:8080" class="button" target="_blank">Container Metrics</a>
        </div>

        <div class="card">
          <h3>📈 Business Metrics</h3>
          <p>Campaign readiness and cost tracking</p>
          <div class="iframe-container">
            <iframe src="http://localhost:3007/d/smm-business/smm-architect-business-metrics" 
                    title="Business Metrics Dashboard"></iframe>
          </div>
        </div>

        <div class="card">
          <h3>🏗️ Infrastructure</h3>
          <p>Cloud resources and provisioning status</p>
          <div class="iframe-container">
            <iframe src="http://localhost:3007/d/smm-infra/smm-architect-infrastructure" 
                    title="Infrastructure Dashboard"></iframe>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 20px;">
        <h3>🧪 Latest Smoke Test Results</h3>
        <div id="smoke-test-result">Click "Run Tests" to execute smoke tests</div>
      </div>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(dashboardHtml);
});

/**
 * GET /status
 * System status overview
 */
app.get('/status', async (req, res) => {
  try {
    const health = await healthCheck.checkAllServices();
    
    res.json({
      timestamp: new Date().toISOString(),
      overall: health.overall,
      services: Object.keys(health.services).map(name => ({
        name,
        status: health.services[name].status,
        latency: health.services[name].latency,
        lastCheck: health.services[name].lastCheck
      })),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    });
    
  } catch (error) {
    logger.error('Status check failed', {
      error: error instanceof Error ? error.message : error
    });
    
    res.status(500).json({
      error: 'Status check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling
app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
if (require.main === module) {
  // Start background metrics collection
  startMetricsCollection();
  
  app.listen(port, () => {
    logger.info(`SMM Architect Monitoring Service started`, {
      port,
      environment: process.env.NODE_ENV || 'development',
      metricsEndpoint: `http://localhost:${port}/metrics`,
      dashboardEndpoint: `http://localhost:${port}/dashboard`,
      smokeTestEndpoint: `http://localhost:${port}/smoke-test`
    });
  });
}

export default app;