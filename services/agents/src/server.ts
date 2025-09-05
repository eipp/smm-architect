import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createHealthCheckMiddleware } from '../../shared/health-check';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());

const { routes } = createHealthCheckMiddleware({
  serviceName: 'agents-service',
  version: process.env.npm_package_version || '1.0.0',
  dependencies: {}
});

app.get('/health', routes.health);
app.get('/ready', routes.ready);
app.get('/live', routes.live);

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Agents service listening on port ${PORT}`);
  });
}

export default app;
export { app };
