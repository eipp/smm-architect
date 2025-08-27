import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import FormData from 'form-data';

interface ServiceEndpoint {
  name: string;
  baseUrl: string;
  healthPath: string;
  readinessPath: string;
}

interface TestConfig {
  services: ServiceEndpoint[];
  timeout: number;
  retries: number;
}

const config: TestConfig = {
  timeout: 30000,
  retries: 3,
  services: [
    {
      name: 'SMM Architect Core',
      baseUrl: process.env.CORE_SERVICE_URL || 'http://localhost:4000',
      healthPath: '/health',
      readinessPath: '/ready',
    },
    {
      name: 'ToolHub Service',
      baseUrl: process.env.TOOLHUB_SERVICE_URL || 'http://localhost:3001',
      healthPath: '/health',
      readinessPath: '/ready',
    },
    {
      name: 'Model Router Service',
      baseUrl: process.env.MODEL_ROUTER_SERVICE_URL || 'http://localhost:3002',
      healthPath: '/health',
      readinessPath: '/ready',
    },
    {
      name: 'Publisher Service',
      baseUrl: process.env.PUBLISHER_SERVICE_URL || 'http://localhost:3003',
      healthPath: '/health',
      readinessPath: '/ready',
    },
    {
      name: 'Agents Service',
      baseUrl: process.env.AGENTS_SERVICE_URL || 'http://localhost:3004',
      healthPath: '/health',
      readinessPath: '/ready',
    },
  ],
};

describe('SMM Architect E2E Integration Tests', () => {
  beforeAll(async () => {
    console.log('🔍 Starting E2E integration tests...');
    
    // Wait for all services to be ready
    for (const service of config.services) {
      console.log(`⏳ Waiting for ${service.name} to be ready...`);
      await waitForService(service, config.timeout);
    }
  });

  describe('Service Health Checks', () => {
    test.each(config.services)('$name should be healthy', async (service) => {
      const response = await axios.get(`${service.baseUrl}${service.healthPath}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(['healthy', 'degraded']).toContain(response.data.status);
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('service');
    });

    test.each(config.services)('$name should be ready', async (service) => {
      const response = await axios.get(`${service.baseUrl}${service.readinessPath}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('ready', true);
    });
  });

  describe('Social Media Posting Integration', () => {
    test('Should create and schedule a social media post', async () => {
      const postData = {
        content: 'Test post from SMM Architect E2E tests',
        platforms: ['linkedin', 'twitter'],
        scheduledAt: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
        workspaceId: 'test-workspace',
      };

      // Create post via ToolHub
      const createResponse = await axios.post(
        `${getServiceUrl('ToolHub Service')}/api/v1/social-posting/create`,
        postData,
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(createResponse.status).toBe(201);
      expect(createResponse.data).toHaveProperty('postId');
      expect(createResponse.data).toHaveProperty('status', 'scheduled');

      const postId = createResponse.data.postId;

      // Verify post was scheduled via Publisher Service
      const statusResponse = await axios.get(
        `${getServiceUrl('Publisher Service')}/api/v1/publish/status/${postId}`,
        {
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data).toHaveProperty('status', 'scheduled');
    });

    test('Should handle media upload for social posts', async () => {
      const formData = new FormData();
      formData.append('file', Buffer.from('fake image data'), {
        filename: 'test-image.jpg',
        contentType: 'image/jpeg',
      });
      formData.append('workspaceId', 'test-workspace');

      const uploadResponse = await axios.post(
        `${getServiceUrl('ToolHub Service')}/api/v1/media/upload`,
        formData,
        {
          headers: {
            'Authorization': 'Bearer test-token',
            ...formData.getHeaders(),
          },
        }
      );

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.data).toHaveProperty('mediaId');
      expect(uploadResponse.data).toHaveProperty('url');
    });
  });

  describe('AI Content Generation Integration', () => {
    test('Should generate content using OpenAI', async () => {
      const requestData = {
        prompt: 'Generate a professional LinkedIn post about artificial intelligence',
        model: 'gpt-4',
        maxTokens: 100,
        workspaceId: 'test-workspace',
      };

      const response = await axios.post(
        `${getServiceUrl('Model Router Service')}/api/v1/ai/generate`,
        requestData,
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('model', 'gpt-4');
      expect(response.data.content).toBeTruthy();
    });

    test('Should generate content using Anthropic Claude', async () => {
      const requestData = {
        prompt: 'Write a creative social media caption',
        model: 'claude-3-sonnet',
        maxTokens: 100,
        workspaceId: 'test-workspace',
      };

      const response = await axios.post(
        `${getServiceUrl('Model Router Service')}/api/v1/ai/generate`,
        requestData,
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('model', 'claude-3-sonnet');
      expect(response.data.content).toBeTruthy();
    });

    test('Should perform content quality assessment', async () => {
      const requestData = {
        content: 'This is a test social media post for quality assessment.',
        platform: 'linkedin',
        brandVoice: {
          tone: 'professional',
          style: 'informative',
        },
        workspaceId: 'test-workspace',
      };

      const response = await axios.post(
        `${getServiceUrl('Model Router Service')}/api/v1/ai/assess-quality`,
        requestData,
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('score');
      expect(response.data).toHaveProperty('feedback');
      expect(response.data.score).toBeGreaterThanOrEqual(0);
      expect(response.data.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Agent System Integration', () => {
    test('Should execute research agent workflow', async () => {
      const requestData = {
        type: 'market_research',
        topic: 'artificial intelligence trends',
        scope: 'technology industry',
        workspaceId: 'test-workspace',
      };

      const response = await axios.post(
        `${getServiceUrl('Agents Service')}/api/v1/agents/research/execute`,
        requestData,
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('taskId');
      expect(response.data).toHaveProperty('status', 'running');
    });

    test('Should execute creative agent workflow', async () => {
      const requestData = {
        briefing: 'Create content ideas for a tech startup product launch',
        targetAudience: 'tech professionals',
        platforms: ['linkedin', 'twitter'],
        workspaceId: 'test-workspace',
      };

      const response = await axios.post(
        `${getServiceUrl('Agents Service')}/api/v1/agents/creative/execute`,
        requestData,
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('taskId');
      expect(response.data).toHaveProperty('status', 'running');
    });

    test('Should execute legal compliance check', async () => {
      const requestData = {
        content: 'This product claim needs legal review before publishing.',
        platform: 'linkedin',
        contentType: 'promotional',
        jurisdiction: 'US',
        workspaceId: 'test-workspace',
      };

      const response = await axios.post(
        `${getServiceUrl('Agents Service')}/api/v1/agents/legal/review`,
        requestData,
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('approved');
      expect(response.data).toHaveProperty('compliance');
      expect(response.data).toHaveProperty('suggestions');
    });
  });

  describe('End-to-End Workflow Integration', () => {
    test('Should complete full content creation and publishing workflow', async () => {
      // Step 1: Research
      const researchResponse = await axios.post(
        `${getServiceUrl('Agents Service')}/api/v1/agents/research/execute`,
        {
          type: 'trend_analysis',
          topic: 'social media marketing',
          workspaceId: 'test-workspace',
        },
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(researchResponse.status).toBe(200);
      const researchTaskId = researchResponse.data.taskId;

      // Step 2: Generate content based on research
      const contentResponse = await axios.post(
        `${getServiceUrl('Model Router Service')}/api/v1/ai/generate`,
        {
          prompt: 'Create a LinkedIn post about current social media marketing trends',
          model: 'gpt-4',
          maxTokens: 200,
          workspaceId: 'test-workspace',
        },
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(contentResponse.status).toBe(200);
      const generatedContent = contentResponse.data.content;

      // Step 3: Legal review
      const legalResponse = await axios.post(
        `${getServiceUrl('Agents Service')}/api/v1/agents/legal/review`,
        {
          content: generatedContent,
          platform: 'linkedin',
          contentType: 'informational',
          jurisdiction: 'US',
          workspaceId: 'test-workspace',
        },
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(legalResponse.status).toBe(200);
      expect(legalResponse.data.approved).toBe(true);

      // Step 4: Schedule publication
      const publishResponse = await axios.post(
        `${getServiceUrl('ToolHub Service')}/api/v1/social-posting/create`,
        {
          content: generatedContent,
          platforms: ['linkedin'],
          scheduledAt: new Date(Date.now() + 120000).toISOString(), // 2 minutes from now
          workspaceId: 'test-workspace',
        },
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(publishResponse.status).toBe(201);
      expect(publishResponse.data).toHaveProperty('postId');
      expect(publishResponse.data).toHaveProperty('status', 'scheduled');
    });
  });

  afterAll(async () => {
    console.log('✅ E2E integration tests completed');
  });
});

// Helper functions
async function waitForService(service: ServiceEndpoint, timeout: number): Promise<void> {
  const startTime = Date.now();
  const interval = 2000; // Check every 2 seconds

  while (Date.now() - startTime < timeout) {
    try {
      const response = await axios.get(`${service.baseUrl}${service.healthPath}`, {
        timeout: 5000,
      });
      
      if (response.status === 200) {
        console.log(`✅ ${service.name} is ready`);
        return;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Service ${service.name} did not become ready within ${timeout}ms`);
}

function getServiceUrl(serviceName: string): string {
  const service = config.services.find(s => s.name === serviceName);
  if (!service) {
    throw new Error(`Service ${serviceName} not found in configuration`);
  }
  return service.baseUrl;
}