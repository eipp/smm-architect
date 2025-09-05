import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
app.use(helmet());
app.use(cors());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agents'
  });
});

if (require.main === module) {
  const port = process.env.PORT || 3004;
  app.listen(port, () => {
    console.log(`Agents service listening on port ${port}`);
  });
}

export default app;
