import axios from 'axios';
import { JSDOM } from 'jsdom';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { ApiError } from '../middleware/error-handler';

export interface SourceContent {
  sourceId: string;
  url: string;
  contentType: string;
  title?: string | undefined;
  extractedText: string;
  metadata: {
    author?: string | undefined;
    publishedAt?: string | undefined;
    description?: string | undefined;
    keywords?: string[] | undefined;
    wordCount: number;
    language?: string | undefined;
  };
  claims: ContentClaim[];
  contentHash: string;
  ingestedAt: string;
}

export interface ContentClaim {
  claimId: string;
  text: string;
  spanStart: number;
  spanEnd: number;
  confidence: number;
  category: 'factual' | 'opinion' | 'promotional' | 'testimonial' | 'other';
  citations: string[];
}

export interface IngestRequest {
  workspaceId: string;
  sources: Array<{
    url: string;
    contentType?: 'webpage' | 'social_media' | 'document' | 'api';
    priority?: 'high' | 'medium' | 'low';
  }>;
  extractionRules?: {
    extractClaims: boolean;
    minClaimConfidence: number;
    includeImages: boolean;
    includeMetadata: boolean;
  };
}

export class ContentIngestionService {
  private readonly maxContentSize = 5 * 1024 * 1024; // 5MB
  private readonly userAgent = 'SMM-Architect-ToolHub/1.0';

  /**
   * Ingest content from multiple sources
   */
  async ingestSources(request: IngestRequest): Promise<SourceContent[]> {
    const results: SourceContent[] = [];
    
    for (const source of request.sources) {
      try {
        const content = await this.ingestSingleSource(
          source.url,
          source.contentType || 'webpage',
          request.workspaceId,
          request.extractionRules
        );
        results.push(content);
      } catch (error) {
        console.error(`Failed to ingest ${source.url}:`, error);
        // Continue with other sources even if one fails
      }
    }

    if (results.length === 0) {
      throw new ApiError(400, 'INGESTION_FAILED', 'No sources could be processed successfully');
    }

    return results;
  }

  /**
   * Ingest content from a single source
   */
  private async ingestSingleSource(
    url: string,
    contentType: string,
    workspaceId: string,
    extractionRules?: IngestRequest['extractionRules']
  ): Promise<SourceContent> {
    const sourceId = uuidv4();
    
    // Fetch content
    const rawContent = await this.fetchContent(url);
    
    // Extract structured data based on content type
    let extractedData;
    switch (contentType) {
      case 'webpage':
        extractedData = await this.extractWebpageContent(rawContent, url);
        break;
      case 'social_media':
        extractedData = await this.extractSocialMediaContent(rawContent, url);
        break;
      default:
        extractedData = await this.extractGenericContent(rawContent, url);
    }

    // Extract claims if requested
    const claims = extractionRules?.extractClaims 
      ? await this.extractClaims(extractedData.text, extractionRules.minClaimConfidence || 0.7)
      : [];

    // Generate content hash
    const contentHash = crypto
      .createHash('sha256')
      .update(extractedData.text)
      .digest('hex');

    return {
      sourceId,
      url,
      contentType,
      title: extractedData.title || undefined,
      extractedText: extractedData.text,
      metadata: {
        ...extractedData.metadata,
        wordCount: extractedData.text.split(/\s+/).length
      },
      claims,
      contentHash,
      ingestedAt: new Date().toISOString()
    };
  }

  /**
   * Fetch raw content from URL
   */
  private async fetchContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 30000,
        maxContentLength: this.maxContentSize,
        validateStatus: (status) => status >= 200 && status < 400
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          400,
          'FETCH_FAILED',
          `Failed to fetch content from ${url}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Extract content from webpage HTML
   */
  private async extractWebpageContent(html: string, url: string): Promise<{
    title?: string | undefined;
    text: string;
    metadata: any;
  }> {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract title
    const titleElement = document.querySelector('title');
    const title = titleElement?.textContent?.trim();

    // Extract meta description
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const description = descriptionMeta?.getAttribute('content');

    // Extract keywords
    const keywordsMeta = document.querySelector('meta[name="keywords"]');
    const keywords = keywordsMeta?.getAttribute('content')?.split(',').map(k => k.trim());

    // Extract author
    const authorMeta = document.querySelector('meta[name="author"]') ||
                      document.querySelector('meta[property="article:author"]');
    const author = authorMeta?.getAttribute('content');

    // Extract publish date
    const publishedMeta = document.querySelector('meta[property="article:published_time"]') ||
                          document.querySelector('meta[name="date"]');
    const publishedAt = publishedMeta?.getAttribute('content');

    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style');
    scripts.forEach(el => el.remove());

    // Extract main content
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '#content'
    ];

    let mainContent = '';
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = element.textContent || '';
        break;
      }
    }

    // Fallback to body if no main content found
    if (!mainContent) {
      mainContent = document.body?.textContent || '';
    }

    // Clean up text
    const text = mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    return {
      title: title || undefined,
      text,
      metadata: {
        author: author || undefined,
        publishedAt: publishedAt || undefined,
        description: description || undefined,
        keywords: keywords || [],
        language: document.documentElement?.lang || undefined
      }
    };
  }

  /**
   * Extract content from social media post
   */
  private async extractSocialMediaContent(html: string, url: string): Promise<{
    title?: string | undefined;
    text: string;
    metadata: any;
  }> {
    // Simplified social media extraction
    // In production, this would use platform-specific APIs
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract Open Graph data
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    const ogAuthor = document.querySelector('meta[property="og:author"]')?.getAttribute('content');

    return {
      title: ogTitle || undefined,
      text: ogDescription || document.body?.textContent?.replace(/\s+/g, ' ').trim() || '',
      metadata: {
        author: ogAuthor || undefined,
        platform: this.detectSocialPlatform(url)
      }
    };
  }

  /**
   * Extract generic content
   */
  private async extractGenericContent(content: string, url: string): Promise<{
    title?: string | undefined;
    text: string;
    metadata: any;
  }> {
    return {
      text: content.replace(/\s+/g, ' ').trim(),
      metadata: {
        contentType: 'raw'
      }
    };
  }

  /**
   * Extract factual claims from text using simple heuristics
   */
  private async extractClaims(text: string, minConfidence: number): Promise<ContentClaim[]> {
    const claims: ContentClaim[] = [];
    
    // Simple sentence-based claim extraction
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      
      if (sentence.length < 20) continue; // Skip very short sentences
      
      const confidence = this.calculateClaimConfidence(sentence);
      
      if (confidence >= minConfidence) {
        const spanStart = text.indexOf(sentence);
        const spanEnd = spanStart + sentence.length;
        
        claims.push({
          claimId: uuidv4(),
          text: sentence,
          spanStart,
          spanEnd,
          confidence,
          category: this.categorizeClaimType(sentence),
          citations: [] // TODO: Extract citations
        });
      }
    }

    return claims;
  }

  /**
   * Calculate confidence score for a claim
   */
  private calculateClaimConfidence(text: string): number {
    let confidence = 0.5;
    
    // Boost confidence for factual indicators
    if (/\b(founded|established|launched|created)\b/i.test(text)) confidence += 0.2;
    if (/\b(statistics|data|research|study)\b/i.test(text)) confidence += 0.2;
    if (/\b\d{4}\b/.test(text)) confidence += 0.1; // Contains year
    if (/\b\d+%\b/.test(text)) confidence += 0.1; // Contains percentage
    
    // Reduce confidence for opinion indicators
    if (/\b(believe|think|feel|opinion|might|maybe)\b/i.test(text)) confidence -= 0.2;
    if (/\b(amazing|incredible|best|worst)\b/i.test(text)) confidence -= 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Categorize claim type
   */
  private categorizeClaimType(text: string): ContentClaim['category'] {
    if (/\b(founded|established|headquarters|employees|revenue)\b/i.test(text)) {
      return 'factual';
    }
    if (/\b(believe|opinion|think|feel)\b/i.test(text)) {
      return 'opinion';
    }
    if (/\b(buy|purchase|sale|offer|discount)\b/i.test(text)) {
      return 'promotional';
    }
    if (/\b(testimonial|review|experience|recommend)\b/i.test(text)) {
      return 'testimonial';
    }
    return 'other';
  }

  /**
   * Detect social media platform from URL
   */
  private detectSocialPlatform(url: string): string {
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'x';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    return 'unknown';
  }
}