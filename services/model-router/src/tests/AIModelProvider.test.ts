import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AIModelProvider } from '../services/AIModelProvider';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Mock external dependencies
jest.mock('openai');
jest.mock('@anthropic-ai/sdk');

const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
} as any;

const mockAnthropic = {
  messages: {
    create: jest.fn(),
  },
} as any;

(OpenAI as any).mockImplementation(() => mockOpenAI);
(Anthropic as any).mockImplementation(() => mockAnthropic);

describe('AIModelProvider', () => {
  let aiProvider: AIModelProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    aiProvider = new AIModelProvider({
      openai: {
        apiKey: 'test-openai-key',
        organization: 'test-org',
      },
      anthropic: {
        apiKey: 'test-anthropic-key',
      },
      defaultModel: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.7,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateContent', () => {
    test('should generate content using OpenAI GPT-4', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Generated LinkedIn post about AI trends in 2024',
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150,
        },
        model: 'gpt-4',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        prompt: 'Generate a professional LinkedIn post about AI trends',
        model: 'gpt-4' as const,
        maxTokens: 200,
        temperature: 0.7,
        workspaceId: 'workspace-123',
      };

      const result = await aiProvider.generateContent(request);

      expect(result).toEqual({
        content: 'Generated LinkedIn post about AI trends in 2024',
        model: 'gpt-4',
        tokensUsed: 150,
        finishReason: 'stop',
        metadata: {
          promptTokens: 50,
          completionTokens: 100,
          provider: 'openai',
        },
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Generate a professional LinkedIn post about AI trends',
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      });
    });

    test('should generate content using Anthropic Claude', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Creative social media caption with engaging visuals',
          },
        ],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 45,
          output_tokens: 85,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const request = {
        prompt: 'Write a creative social media caption',
        model: 'claude-3-sonnet' as const,
        maxTokens: 150,
        temperature: 0.8,
        workspaceId: 'workspace-123',
      };

      const result = await aiProvider.generateContent(request);

      expect(result).toEqual({
        content: 'Creative social media caption with engaging visuals',
        model: 'claude-3-sonnet',
        tokensUsed: 130, // input + output
        finishReason: 'end_turn',
        metadata: {
          promptTokens: 45,
          completionTokens: 85,
          provider: 'anthropic',
        },
      });

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 150,
        temperature: 0.8,
        messages: [
          {
            role: 'user',
            content: 'Write a creative social media caption',
          },
        ],
      });
    });

    test('should include brand voice context when provided', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Brand-aligned professional content',
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 80,
          completion_tokens: 60,
          total_tokens: 140,
        },
        model: 'gpt-4',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        prompt: 'Create a post about our new product',
        model: 'gpt-4' as const,
        brandVoice: {
          tone: 'professional',
          style: 'informative',
          audience: 'tech professionals',
          keywords: ['innovation', 'technology'],
        },
        workspaceId: 'workspace-123',
      };

      await aiProvider.generateContent(request);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('tone: professional'),
          },
          {
            role: 'user',
            content: 'Create a post about our new product',
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
    });

    test('should handle platform-specific optimization', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Twitter-optimized content with hashtags #tech #innovation',
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 70,
          completion_tokens: 90,
          total_tokens: 160,
        },
        model: 'gpt-4',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        prompt: 'Create a tech announcement',
        model: 'gpt-4' as const,
        platform: 'twitter' as const,
        workspaceId: 'workspace-123',
      };

      await aiProvider.generateContent(request);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('Twitter'),
          },
          {
            role: 'user',
            content: 'Create a tech announcement',
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
    });

    test('should throw error for invalid model', async () => {
      const request = {
        prompt: 'Test prompt',
        model: 'invalid-model' as any,
        workspaceId: 'workspace-123',
      };

      await expect(aiProvider.generateContent(request))
        .rejects
        .toThrow('Unsupported model: invalid-model');
    });

    test('should handle API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      const request = {
        prompt: 'Test prompt',
        model: 'gpt-4' as const,
        workspaceId: 'workspace-123',
      };

      await expect(aiProvider.generateContent(request))
        .rejects
        .toThrow('Failed to generate content: OpenAI API rate limit exceeded');
    });
  });

  describe('assessContentQuality', () => {
    test('should assess content quality with compliance checks', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                score: 85,
                feedback: 'Content is well-structured and engaging',
                compliance: {
                  appropriate: true,
                  issues: [],
                },
                suggestions: [
                  'Consider adding a call-to-action',
                  'Include relevant hashtags',
                ],
              }),
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 80,
          total_tokens: 200,
        },
        model: 'gpt-4',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        content: 'This is a test social media post about technology trends.',
        platform: 'linkedin' as const,
        brandVoice: {
          tone: 'professional',
          style: 'informative',
        },
        workspaceId: 'workspace-123',
      };

      const result = await aiProvider.assessContentQuality(request);

      expect(result).toEqual({
        score: 85,
        feedback: 'Content is well-structured and engaging',
        compliance: {
          appropriate: true,
          issues: [],
        },
        suggestions: [
          'Consider adding a call-to-action',
          'Include relevant hashtags',
        ],
        metadata: {
          tokensUsed: 200,
          model: 'gpt-4',
        },
      });
    });

    test('should identify compliance issues', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                score: 45,
                feedback: 'Content contains potential compliance issues',
                compliance: {
                  appropriate: false,
                  issues: [
                    'Unsubstantiated claims about product benefits',
                    'Missing required disclaimers',
                  ],
                },
                suggestions: [
                  'Add proper disclaimers',
                  'Provide evidence for claims',
                ],
              }),
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 70,
          total_tokens: 170,
        },
        model: 'gpt-4',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        content: 'Our product will solve all your problems instantly!',
        platform: 'facebook' as const,
        workspaceId: 'workspace-123',
      };

      const result = await aiProvider.assessContentQuality(request);

      expect(result.score).toBeLessThan(50);
      expect(result.compliance.appropriate).toBe(false);
      expect(result.compliance.issues).toHaveLength(2);
    });

    test('should handle invalid JSON in assessment response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 20,
          total_tokens: 70,
        },
        model: 'gpt-4',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        content: 'Test content',
        platform: 'twitter' as const,
        workspaceId: 'workspace-123',
      };

      await expect(aiProvider.assessContentQuality(request))
        .rejects
        .toThrow('Failed to parse quality assessment response');
    });
  });

  describe('checkBrandConsistency', () => {
    test('should check brand consistency and return score', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                consistent: true,
                score: 92,
                analysis: 'Content aligns well with brand voice and values',
                deviations: [],
                recommendations: [
                  'Consider using brand-specific terminology',
                ],
              }),
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 100,
          total_tokens: 250,
        },
        model: 'gpt-4',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        content: 'Exciting announcement about our innovative AI platform',
        brandGuidelines: {
          voice: 'friendly yet professional',
          values: ['innovation', 'reliability', 'customer-focus'],
          terminology: ['platform', 'solution', 'experience'],
          prohibitedTerms: ['cheap', 'basic'],
        },
        workspaceId: 'workspace-123',
      };

      const result = await aiProvider.checkBrandConsistency(request);

      expect(result).toEqual({
        consistent: true,
        score: 92,
        analysis: 'Content aligns well with brand voice and values',
        deviations: [],
        recommendations: [
          'Consider using brand-specific terminology',
        ],
        metadata: {
          tokensUsed: 250,
          model: 'gpt-4',
        },
      });
    });

    test('should identify brand inconsistencies', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                consistent: false,
                score: 35,
                analysis: 'Content deviates from brand guidelines',
                deviations: [
                  'Uses prohibited term: cheap',
                  'Tone is too casual for brand voice',
                ],
                recommendations: [
                  'Replace "cheap" with "affordable" or "cost-effective"',
                  'Adopt more professional tone',
                ],
              }),
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 140,
          completion_tokens: 90,
          total_tokens: 230,
        },
        model: 'gpt-4',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        content: 'Get our cheap solution now!',
        brandGuidelines: {
          voice: 'professional',
          prohibitedTerms: ['cheap'],
        },
        workspaceId: 'workspace-123',
      };

      const result = await aiProvider.checkBrandConsistency(request);

      expect(result.consistent).toBe(false);
      expect(result.score).toBeLessThan(50);
      expect(result.deviations).toHaveLength(2);
    });
  });

  describe('performance and reliability', () => {
    test('should implement request timeout', async () => {
      // Mock a delayed response
      mockOpenAI.chat.completions.create.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 35000))
      );

      const request = {
        prompt: 'Test prompt',
        model: 'gpt-4' as const,
        workspaceId: 'workspace-123',
      };

      await expect(aiProvider.generateContent(request))
        .rejects
        .toThrow('Request timeout');
    }, 40000);

    test('should retry failed requests', async () => {
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Temporary API error'))
        .mockRejectedValueOnce(new Error('Another temporary error'))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Success after retries',
                role: 'assistant',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 30,
            completion_tokens: 40,
            total_tokens: 70,
          },
          model: 'gpt-4',
        });

      const request = {
        prompt: 'Test prompt with retries',
        model: 'gpt-4' as const,
        workspaceId: 'workspace-123',
      };

      const result = await aiProvider.generateContent(request);

      expect(result.content).toBe('Success after retries');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    test('should track usage metrics', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test response',
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150,
        },
        model: 'gpt-4',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const trackUsageSpy = jest.spyOn(aiProvider as any, 'trackUsage')
        .mockResolvedValue(undefined);

      const request = {
        prompt: 'Test prompt for metrics',
        model: 'gpt-4' as const,
        workspaceId: 'workspace-123',
      };

      await aiProvider.generateContent(request);

      expect(trackUsageSpy).toHaveBeenCalledWith({
        workspaceId: 'workspace-123',
        model: 'gpt-4',
        provider: 'openai',
        tokensUsed: 150,
        requestType: 'content_generation',
      });
    });
  });
});