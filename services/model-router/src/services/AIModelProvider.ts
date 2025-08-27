import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';

export interface ContentGenerationRequest {
  workspaceId: string;
  agentType: 'research' | 'planner' | 'creative' | 'legal' | 'automation' | 'publisher';
  contentType: 'post' | 'article' | 'caption' | 'headline' | 'description' | 'hashtags';
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'multi';
  prompt: string;
  context?: {
    brandVoice?: BrandVoice;
    targetAudience?: string;
    industry?: string;
    tone?: 'professional' | 'casual' | 'humorous' | 'informative' | 'inspiring';
    length?: 'short' | 'medium' | 'long';
    includeHashtags?: boolean;
    includeMentions?: boolean;
    callToAction?: string;
  };
  constraints?: {
    maxLength?: number;
    minLength?: number;
    prohibitedWords?: string[];
    requiredWords?: string[];
    complianceRules?: ComplianceRule[];
  };
  preferences?: {
    model?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku';
    temperature?: number;
    maxTokens?: number;
  };
}

export interface BrandVoice {
  personality: string[];
  values: string[];
  communicationStyle: string;
  keyMessages: string[];
  avoidedTopics: string[];
  examples: string[];
}

export interface ComplianceRule {
  type: 'FTC' | 'GDPR' | 'CCPA' | 'platform' | 'custom';
  description: string;
  required: boolean;
  checkFunction?: (content: string) => boolean;
}

export interface ContentGenerationResponse {
  id: string;
  requestId: string;
  content: string;
  alternatives?: string[];
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    qualityScore?: number;
    complianceChecks: ComplianceResult[];
    platformOptimization: PlatformOptimization;
  };
  suggestions?: {
    hashtags?: string[];
    mentions?: string[];
    improvements?: string[];
  };
  createdAt: Date;
}

export interface ComplianceResult {
  rule: ComplianceRule;
  passed: boolean;
  issues?: string[];
  suggestions?: string[];
}

export interface PlatformOptimization {
  platform: string;
  optimalLength: number;
  actualLength: number;
  score: number;
  recommendations: string[];
}

export interface ImageGenerationRequest {
  workspaceId: string;
  prompt: string;
  style?: 'realistic' | 'artistic' | 'minimalist' | 'corporate' | 'playful';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  quantity?: number;
}

export interface ImageGenerationResponse {
  id: string;
  requestId: string;
  images: {
    url: string;
    revisedPrompt?: string;
  }[];
  metadata: {
    model: string;
    processingTime: number;
  };
  createdAt: Date;
}

export class AIModelProvider extends EventEmitter {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private brandVoices: Map<string, BrandVoice> = new Map();
  private complianceRules: ComplianceRule[] = [];

  constructor() {
    super();
    
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Anthropic
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Initialize default compliance rules
    this.initializeComplianceRules();
  }

  /**
   * Generate content using AI models
   */
  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get brand voice if available
      const brandVoice = request.context?.brandVoice || this.brandVoices.get(request.workspaceId);
      
      // Build enhanced prompt
      const enhancedPrompt = this.buildEnhancedPrompt(request, brandVoice);
      
      // Select model based on request preferences and content type
      const selectedModel = this.selectOptimalModel(request);
      
      // Generate content
      let generatedContent: string;
      let alternatives: string[] = [];
      let tokensUsed = 0;

      if (selectedModel.startsWith('gpt')) {
        const result = await this.generateWithOpenAI(enhancedPrompt, selectedModel, request.preferences);
        generatedContent = result.content;
        alternatives = result.alternatives;
        tokensUsed = result.tokensUsed;
      } else if (selectedModel.startsWith('claude')) {
        const result = await this.generateWithAnthropic(enhancedPrompt, selectedModel, request.preferences);
        generatedContent = result.content;
        alternatives = result.alternatives;
        tokensUsed = result.tokensUsed;
      } else {
        throw new Error(`Unsupported model: ${selectedModel}`);
      }

      // Post-process content
      const processedContent = await this.postProcessContent(generatedContent, request);
      
      // Run compliance checks
      const complianceChecks = await this.runComplianceChecks(processedContent, request.constraints?.complianceRules);
      
      // Calculate platform optimization
      const platformOptimization = this.calculatePlatformOptimization(processedContent, request.platform);
      
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(processedContent, request, complianceChecks, platformOptimization);
      
      // Generate suggestions
      const suggestions = await this.generateSuggestions(processedContent, request);

      const response: ContentGenerationResponse = {
        id: `content_${Date.now()}`,
        requestId,
        content: processedContent,
        alternatives: alternatives.map(alt => this.postProcessContent(alt, request)).slice(0, 3),
        metadata: {
          model: selectedModel,
          tokensUsed,
          processingTime: Date.now() - startTime,
          qualityScore,
          complianceChecks,
          platformOptimization,
        },
        suggestions,
        createdAt: new Date(),
      };

      this.emit('contentGenerated', { request, response });
      return response;

    } catch (error) {
      console.error('Content generation failed:', error);
      throw new Error(`Content generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate images using DALL-E
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const startTime = Date.now();
    const requestId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: request.prompt,
        n: request.quantity || 1,
        size: request.size || "1024x1024",
        quality: request.quality || "standard",
        response_format: "url",
      });

      const images = response.data.map(img => ({
        url: img.url!,
        revisedPrompt: img.revised_prompt,
      }));

      const result: ImageGenerationResponse = {
        id: `img_${Date.now()}`,
        requestId,
        images,
        metadata: {
          model: "dall-e-3",
          processingTime: Date.now() - startTime,
        },
        createdAt: new Date(),
      };

      this.emit('imageGenerated', { request, response: result });
      return result;

    } catch (error) {
      console.error('Image generation failed:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate content with OpenAI models
   */
  private async generateWithOpenAI(prompt: string, model: string, preferences?: ContentGenerationRequest['preferences']) {
    const completion = await this.openai.chat.completions.create({
      model: model as any,
      messages: [
        {
          role: "system",
          content: "You are an expert social media content creator. Generate engaging, brand-appropriate content that resonates with the target audience. Ensure all content follows best practices for the specified platform."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: preferences?.temperature || 0.7,
      max_tokens: preferences?.maxTokens || 2000,
      n: 3, // Generate 3 alternatives
    });

    const content = completion.choices[0]?.message?.content || '';
    const alternatives = completion.choices.slice(1).map(choice => choice.message?.content || '');
    const tokensUsed = completion.usage?.total_tokens || 0;

    return { content, alternatives, tokensUsed };
  }

  /**
   * Generate content with Anthropic Claude
   */
  private async generateWithAnthropic(prompt: string, model: string, preferences?: ContentGenerationRequest['preferences']) {
    const response = await this.anthropic.messages.create({
      model: model as any,
      max_tokens: preferences?.maxTokens || 2000,
      temperature: preferences?.temperature || 0.7,
      messages: [
        {
          role: "user",
          content: `You are an expert social media content creator. ${prompt}`
        }
      ],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    
    // Generate alternatives with slightly different prompts
    const alternatives: string[] = [];
    for (let i = 0; i < 2; i++) {
      try {
        const altResponse = await this.anthropic.messages.create({
          model: model as any,
          max_tokens: preferences?.maxTokens || 2000,
          temperature: (preferences?.temperature || 0.7) + 0.1,
          messages: [
            {
              role: "user",
              content: `You are an expert social media content creator. Create a variation of this request: ${prompt}`
            }
          ],
        });
        
        const altContent = altResponse.content[0]?.type === 'text' ? altResponse.content[0].text : '';
        if (altContent) alternatives.push(altContent);
      } catch (error) {
        console.warn('Failed to generate alternative:', error);
      }
    }

    const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0;

    return { content, alternatives, tokensUsed };
  }

  /**
   * Build enhanced prompt with context and brand voice
   */
  private buildEnhancedPrompt(request: ContentGenerationRequest, brandVoice?: BrandVoice): string {
    let prompt = `Create ${request.contentType} content for ${request.platform}.\n\n`;
    
    prompt += `Content Request: ${request.prompt}\n\n`;

    if (request.context) {
      const ctx = request.context;
      
      if (ctx.targetAudience) {
        prompt += `Target Audience: ${ctx.targetAudience}\n`;
      }
      
      if (ctx.industry) {
        prompt += `Industry: ${ctx.industry}\n`;
      }
      
      if (ctx.tone) {
        prompt += `Tone: ${ctx.tone}\n`;
      }
      
      if (ctx.length) {
        prompt += `Length: ${ctx.length}\n`;
      }
      
      if (ctx.callToAction) {
        prompt += `Call to Action: ${ctx.callToAction}\n`;
      }
    }

    if (brandVoice) {
      prompt += `\nBrand Voice Guidelines:\n`;
      prompt += `Personality: ${brandVoice.personality.join(', ')}\n`;
      prompt += `Values: ${brandVoice.values.join(', ')}\n`;
      prompt += `Communication Style: ${brandVoice.communicationStyle}\n`;
      prompt += `Key Messages: ${brandVoice.keyMessages.join(', ')}\n`;
      
      if (brandVoice.avoidedTopics.length > 0) {
        prompt += `Avoid These Topics: ${brandVoice.avoidedTopics.join(', ')}\n`;
      }
    }

    if (request.constraints) {
      prompt += `\nConstraints:\n`;
      
      if (request.constraints.maxLength) {
        prompt += `Maximum Length: ${request.constraints.maxLength} characters\n`;
      }
      
      if (request.constraints.minLength) {
        prompt += `Minimum Length: ${request.constraints.minLength} characters\n`;
      }
      
      if (request.constraints.requiredWords?.length) {
        prompt += `Must Include: ${request.constraints.requiredWords.join(', ')}\n`;
      }
      
      if (request.constraints.prohibitedWords?.length) {
        prompt += `Must Avoid: ${request.constraints.prohibitedWords.join(', ')}\n`;
      }
    }

    // Add platform-specific guidelines
    const platformGuidelines = this.getPlatformGuidelines(request.platform);
    if (platformGuidelines) {
      prompt += `\nPlatform Guidelines:\n${platformGuidelines}\n`;
    }

    prompt += `\nPlease create engaging, original content that follows all guidelines and resonates with the target audience.`;

    return prompt;
  }

  /**
   * Select optimal model based on request
   */
  private selectOptimalModel(request: ContentGenerationRequest): string {
    // Use preference if specified
    if (request.preferences?.model) {
      return request.preferences.model;
    }

    // Select based on content type and agent type
    if (request.agentType === 'creative' || request.contentType === 'article') {
      return 'claude-3-opus'; // Best for creative content
    } else if (request.agentType === 'legal' || request.contentType === 'description') {
      return 'gpt-4'; // Best for accuracy and compliance
    } else if (request.platform === 'twitter' || request.contentType === 'caption') {
      return 'claude-3-sonnet'; // Good for concise content
    } else {
      return 'gpt-3.5-turbo'; // Default for general content
    }
  }

  /**
   * Post-process generated content
   */
  private async postProcessContent(content: string, request: ContentGenerationRequest): Promise<string> {
    let processed = content.trim();
    
    // Remove any markdown formatting if not needed
    processed = processed.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
    processed = processed.replace(/\*(.*?)\*/g, '$1'); // Remove italic
    
    // Handle platform-specific processing
    if (request.platform === 'twitter') {
      // Ensure under 280 characters
      if (processed.length > 280) {
        processed = processed.substring(0, 277) + '...';
      }
    } else if (request.platform === 'linkedin') {
      // Add professional formatting
      if (request.contentType === 'post' && !processed.includes('\n\n')) {
        processed = processed.replace(/\. /g, '.\n\n');
      }
    }

    // Add hashtags if requested
    if (request.context?.includeHashtags && request.contentType !== 'hashtags') {
      const hashtags = await this.generateHashtags(processed, request.platform);
      if (hashtags.length > 0) {
        processed += '\n\n' + hashtags.slice(0, 5).join(' ');
      }
    }

    return processed;
  }

  /**
   * Generate relevant hashtags
   */
  private async generateHashtags(content: string, platform: string): Promise<string[]> {
    try {
      const hashtagPrompt = `Generate 5-10 relevant hashtags for this ${platform} content: "${content.substring(0, 200)}...". Return only hashtags, one per line, starting with #.`;
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "user", content: hashtagPrompt }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const hashtagResponse = completion.choices[0]?.message?.content || '';
      return hashtagResponse.split('\n').filter(line => line.trim().startsWith('#')).map(line => line.trim());
    } catch (error) {
      console.warn('Failed to generate hashtags:', error);
      return [];
    }
  }

  /**
   * Run compliance checks
   */
  private async runComplianceChecks(content: string, rules?: ComplianceRule[]): Promise<ComplianceResult[]> {
    const allRules = [...this.complianceRules, ...(rules || [])];
    const results: ComplianceResult[] = [];

    for (const rule of allRules) {
      const result: ComplianceResult = {
        rule,
        passed: true,
        issues: [],
        suggestions: [],
      };

      if (rule.checkFunction) {
        result.passed = rule.checkFunction(content);
      } else {
        // Default compliance checks
        result.passed = await this.performDefaultComplianceCheck(content, rule);
      }

      if (!result.passed) {
        result.issues = await this.identifyComplianceIssues(content, rule);
        result.suggestions = await this.generateComplianceSuggestions(content, rule);
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Calculate platform optimization score
   */
  private calculatePlatformOptimization(content: string, platform: string): PlatformOptimization {
    const platformLimits = {
      twitter: { optimal: 120, max: 280 },
      linkedin: { optimal: 400, max: 3000 },
      facebook: { optimal: 300, max: 2000 },
      instagram: { optimal: 150, max: 2200 },
      tiktok: { optimal: 50, max: 150 },
      multi: { optimal: 200, max: 500 }
    };

    const limits = platformLimits[platform as keyof typeof platformLimits] || platformLimits.multi;
    const actualLength = content.length;
    
    let score = 100;
    const recommendations: string[] = [];

    if (actualLength > limits.max) {
      score -= 30;
      recommendations.push(`Content exceeds ${platform} maximum length (${limits.max} characters)`);
    } else if (actualLength > limits.optimal * 1.5) {
      score -= 15;
      recommendations.push(`Consider shortening for better ${platform} engagement`);
    } else if (actualLength < limits.optimal * 0.5) {
      score -= 10;
      recommendations.push(`Consider expanding content for better ${platform} performance`);
    }

    // Check for platform-specific features
    if (platform === 'instagram' && !content.includes('#')) {
      score -= 10;
      recommendations.push('Add hashtags for better Instagram discoverability');
    }

    if (platform === 'linkedin' && content.split('\n\n').length < 2) {
      score -= 5;
      recommendations.push('Use paragraph breaks for better LinkedIn readability');
    }

    return {
      platform,
      optimalLength: limits.optimal,
      actualLength,
      score: Math.max(0, score),
      recommendations,
    };
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(
    content: string,
    request: ContentGenerationRequest,
    complianceChecks: ComplianceResult[],
    platformOptimization: PlatformOptimization
  ): number {
    let score = 100;

    // Compliance score (40% weight)
    const failedCompliance = complianceChecks.filter(check => !check.passed && check.rule.required);
    score -= failedCompliance.length * 20;

    // Platform optimization score (30% weight)
    score = score * 0.7 + platformOptimization.score * 0.3;

    // Content length score (15% weight)
    const lengthScore = this.calculateLengthScore(content, request.constraints);
    score = score * 0.85 + lengthScore * 0.15;

    // Readability score (15% weight)
    const readabilityScore = this.calculateReadabilityScore(content);
    score = score * 0.85 + readabilityScore * 0.15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate content suggestions
   */
  private async generateSuggestions(content: string, request: ContentGenerationRequest): Promise<ContentGenerationResponse['suggestions']> {
    const suggestions: ContentGenerationResponse['suggestions'] = {};

    // Generate hashtags if not already included
    if (request.context?.includeHashtags && !content.includes('#')) {
      suggestions.hashtags = await this.generateHashtags(content, request.platform);
    }

    // Generate improvement suggestions
    suggestions.improvements = [];
    
    if (content.length > 1000 && request.platform === 'twitter') {
      suggestions.improvements.push('Consider breaking into a thread for Twitter');
    }
    
    if (!content.includes('?') && !content.includes('!') && request.contentType === 'post') {
      suggestions.improvements.push('Add a question or call-to-action to increase engagement');
    }

    return suggestions;
  }

  /**
   * Get platform-specific guidelines
   */
  private getPlatformGuidelines(platform: string): string | null {
    const guidelines = {
      twitter: 'Keep it concise (under 280 characters). Use hashtags sparingly (1-2 max). Encourage retweets and replies.',
      linkedin: 'Professional tone. Use line breaks for readability. Include industry insights. Ask thought-provoking questions.',
      facebook: 'Conversational tone. Encourage comments and shares. Use emojis moderately. Tell stories.',
      instagram: 'Visual-first content. Use 5-10 hashtags. Include location if relevant. Encourage saves and shares.',
      tiktok: 'Trendy, authentic language. Keep captions short. Use trending hashtags. Include call-to-action.',
    };

    return guidelines[platform as keyof typeof guidelines] || null;
  }

  /**
   * Initialize default compliance rules
   */
  private initializeComplianceRules(): void {
    this.complianceRules = [
      {
        type: 'FTC',
        description: 'FTC disclosure requirements for sponsored content',
        required: true,
        checkFunction: (content: string) => {
          const sponsoredKeywords = ['#ad', '#sponsored', '#partnership', 'sponsored by', 'paid partnership'];
          const hasSponsored = content.toLowerCase().includes('sponsor') || content.toLowerCase().includes('paid');
          const hasDisclosure = sponsoredKeywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
          return !hasSponsored || hasDisclosure;
        }
      },
      {
        type: 'platform',
        description: 'No misleading claims or false information',
        required: true,
        checkFunction: (content: string) => {
          const misleadingPhrases = ['guaranteed results', 'get rich quick', 'miracle cure', 'instant success'];
          return !misleadingPhrases.some(phrase => content.toLowerCase().includes(phrase));
        }
      },
      {
        type: 'custom',
        description: 'Professional language standards',
        required: false,
        checkFunction: (content: string) => {
          const profanity = ['damn', 'hell', 'crap']; // Simplified list
          return !profanity.some(word => content.toLowerCase().includes(word));
        }
      },
    ];
  }

  /**
   * Set brand voice for a workspace
   */
  setBrandVoice(workspaceId: string, brandVoice: BrandVoice): void {
    this.brandVoices.set(workspaceId, brandVoice);
  }

  /**
   * Helper methods for compliance and quality calculations
   */
  private async performDefaultComplianceCheck(content: string, rule: ComplianceRule): Promise<boolean> {
    // Default implementation based on rule type
    return true; // Simplified for now
  }

  private async identifyComplianceIssues(content: string, rule: ComplianceRule): Promise<string[]> {
    return [`Content may violate ${rule.type} regulations`];
  }

  private async generateComplianceSuggestions(content: string, rule: ComplianceRule): Promise<string[]> {
    return [`Review content for ${rule.type} compliance`];
  }

  private calculateLengthScore(content: string, constraints?: ContentGenerationRequest['constraints']): number {
    if (!constraints?.maxLength && !constraints?.minLength) return 100;
    
    const length = content.length;
    let score = 100;
    
    if (constraints.maxLength && length > constraints.maxLength) {
      score -= ((length - constraints.maxLength) / constraints.maxLength) * 50;
    }
    
    if (constraints.minLength && length < constraints.minLength) {
      score -= ((constraints.minLength - length) / constraints.minLength) * 50;
    }
    
    return Math.max(0, score);
  }

  private calculateReadabilityScore(content: string): number {
    // Simplified readability calculation
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = content.split(/\s+/).filter(w => w.length > 0).length;
    
    if (sentences === 0) return 0;
    
    const avgWordsPerSentence = words / sentences;
    
    // Optimal range: 15-20 words per sentence
    if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 20) {
      return 100;
    } else if (avgWordsPerSentence < 10) {
      return 80; // Too choppy
    } else if (avgWordsPerSentence > 25) {
      return 70; // Too complex
    } else {
      return 90; // Good
    }
  }

  /**
   * Assess content quality with compliance checks
   */
  async assessContentQuality(request: {
    content: string;
    platform?: string;
    brandVoice?: BrandVoice;
    workspaceId: string;
  }): Promise<{
    score: number;
    feedback: string;
    compliance: {
      appropriate: boolean;
      issues: string[];
    };
    suggestions: string[];
    metadata: {
      tokensUsed: number;
      model: string;
    };
  }> {
    const prompt = `\nAssess the quality of this social media content:\n\n"${request.content}"\n\nPlatform: ${request.platform || 'general'}\nBrand Voice: ${JSON.stringify(request.brandVoice || {})}\n\nProvide assessment in JSON format:\n{\n  "score": number (0-100),\n  "feedback": "detailed feedback",\n  "compliance": {\n    "appropriate": boolean,\n    "issues": ["list of issues"]\n  },\n  "suggestions": ["improvement suggestions"]\n}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI model');
    }

    try {
      const assessment = JSON.parse(content);
      return {
        ...assessment,
        metadata: {
          tokensUsed: response.usage?.total_tokens || 0,
          model: 'gpt-4',
        },
      };
    } catch (error) {
      throw new Error('Failed to parse quality assessment response');
    }
  }

  /**
   * Check brand consistency and return analysis
   */
  async checkBrandConsistency(request: {
    content: string;
    brandGuidelines: {
      voice?: string;
      values?: string[];
      terminology?: string[];
      prohibitedTerms?: string[];
    };
    workspaceId: string;
  }): Promise<{
    consistent: boolean;
    score: number;
    analysis: string;
    deviations: string[];
    recommendations: string[];
    metadata: {
      tokensUsed: number;
      model: string;
    };
  }> {
    const prompt = `\nCheck brand consistency for this content:\n\n"${request.content}"\n\nBrand Guidelines:\n${JSON.stringify(request.brandGuidelines, null, 2)}\n\nProvide analysis in JSON format:\n{\n  "consistent": boolean,\n  "score": number (0-100),\n  "analysis": "detailed analysis",\n  "deviations": ["list of deviations"],\n  "recommendations": ["improvement recommendations"]\n}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI model');
    }

    try {
      const analysis = JSON.parse(content);
      return {
        ...analysis,
        metadata: {
          tokensUsed: response.usage?.total_tokens || 0,
          model: 'gpt-4',
        },
      };
    } catch (error) {
      throw new Error('Failed to parse brand consistency response');
    }
  }
}