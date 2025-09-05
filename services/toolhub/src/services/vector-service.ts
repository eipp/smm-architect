import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../middleware/error-handler';

export interface VectorDocument {
  id: string;
  workspaceId: string;
  sourceId?: string | undefined;
  content: string;
  metadata: {
    contentType: string;
    sourceUrl?: string;
    title?: string;
    author?: string;
    publishedAt?: string;
    tags?: string[];
    [key: string]: any;
  };
  embedding: number[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchQuery {
  workspaceId: string;
  query: string;
  filters?: {
    contentType?: string[];
    sourceUrl?: string;
    tags?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
  limit?: number;
  threshold?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
  sourceId?: string;
}

export class VectorService {
  private readonly openaiApiKey: string;
  private readonly pineconeApiKey: string;
  private readonly pineconeEnvironment: string;
  private readonly pineconeIndex: string;
  
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.pineconeApiKey = process.env.PINECONE_API_KEY || '';
    this.pineconeEnvironment = process.env.PINECONE_ENVIRONMENT || 'us-east1-gcp';
    this.pineconeIndex = process.env.PINECONE_INDEX || 'smm-architect';

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (!this.openaiApiKey || !this.pineconeApiKey)) {
      throw new Error('Vector service: Missing API keys in production');
    }

    if (!this.openaiApiKey || !this.pineconeApiKey) {
      console.warn('Vector service: Missing API keys, using mock mode');
    }
  }

  /**
   * Generate embeddings using OpenAI's text-embedding-ada-002
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openaiApiKey) {
      // Return mock embedding for development
      return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: 'text-embedding-ada-002',
          input: text.substring(0, 8192) // Limit to model's max tokens
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new ApiError(500, 'EMBEDDING_ERROR', 'Failed to generate embeddings');
    }
  }

  /**
   * Upsert vectors to Pinecone
   */
  async upsertVectors(documents: VectorDocument[]): Promise<void> {
    if (!this.pineconeApiKey) {
      console.log('Mock: Upserting vectors', documents.map(d => d.id));
      return;
    }

    try {
      const vectors = documents.map(doc => ({
        id: doc.id,
        values: doc.embedding,
        metadata: {
          workspaceId: doc.workspaceId,
          sourceId: doc.sourceId,
          content: doc.content.substring(0, 1000), // Limit metadata size
          contentType: doc.metadata.contentType,
          sourceUrl: doc.metadata.sourceUrl,
          title: doc.metadata.title,
          author: doc.metadata.author,
          publishedAt: doc.metadata.publishedAt,
          tags: doc.metadata.tags,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        }
      }));

      const response = await axios.post(
        `https://${this.pineconeIndex}-${this.pineconeEnvironment}.svc.${this.pineconeEnvironment}.pinecone.io/vectors/upsert`,
        {
          vectors,
          namespace: ''
        },
        {
          headers: {
            'Api-Key': this.pineconeApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      console.log(`Upserted ${vectors.length} vectors to Pinecone`);
    } catch (error) {
      console.error('Pinecone upsert error:', error);
      throw new ApiError(500, 'VECTOR_UPSERT_ERROR', 'Failed to store vectors');
    }
  }

  /**
   * Search for similar vectors
   */
  async searchSimilar(query: SearchQuery): Promise<SearchResult[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query.query);

    if (!this.pineconeApiKey) {
      // Return mock results for development
      return [
        {
          id: uuidv4(),
          content: `Mock result for query: ${query.query}`,
          metadata: {
            contentType: 'webpage',
            title: 'Mock Document',
            sourceUrl: 'https://example.com'
          },
          score: 0.95,
          sourceId: uuidv4()
        }
      ];
    }

    try {
      // Build filter expression
      const filter: any = {
        workspaceId: { $eq: query.workspaceId }
      };

      if (query.filters?.contentType?.length) {
        filter.contentType = { $in: query.filters.contentType };
      }

      if (query.filters?.sourceUrl) {
        filter.sourceUrl = { $eq: query.filters.sourceUrl };
      }

      if (query.filters?.tags?.length) {
        filter.tags = { $in: query.filters.tags };
      }

      if (query.filters?.dateRange) {
        filter.publishedAt = {
          $gte: query.filters.dateRange.start,
          $lte: query.filters.dateRange.end
        };
      }

      const response = await axios.post(
        `https://${this.pineconeIndex}-${this.pineconeEnvironment}.svc.${this.pineconeEnvironment}.pinecone.io/query`,
        {
          vector: queryEmbedding,
          topK: query.limit || 10,
          includeMetadata: true,
          includeValues: false,
          filter,
          namespace: ''
        },
        {
          headers: {
            'Api-Key': this.pineconeApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const matches = response.data.matches || [];
      
      return matches
        .filter((match: any) => match.score >= (query.threshold || 0.7))
        .map((match: any) => ({
          id: match.id,
          content: match.metadata.content,
          metadata: {
            contentType: match.metadata.contentType,
            sourceUrl: match.metadata.sourceUrl,
            title: match.metadata.title,
            author: match.metadata.author,
            publishedAt: match.metadata.publishedAt,
            tags: match.metadata.tags
          },
          score: match.score,
          sourceId: match.metadata.sourceId
        }));

    } catch (error) {
      console.error('Pinecone search error:', error);
      throw new ApiError(500, 'VECTOR_SEARCH_ERROR', 'Failed to search vectors');
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(vectorIds: string[]): Promise<void> {
    if (!this.pineconeApiKey) {
      console.log('Mock: Deleting vectors', vectorIds);
      return;
    }

    try {
      await axios.post(
        `https://${this.pineconeIndex}-${this.pineconeEnvironment}.svc.${this.pineconeEnvironment}.pinecone.io/vectors/delete`,
        {
          ids: vectorIds,
          namespace: ''
        },
        {
          headers: {
            'Api-Key': this.pineconeApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log(`Deleted ${vectorIds.length} vectors from Pinecone`);
    } catch (error) {
      console.error('Pinecone delete error:', error);
      throw new ApiError(500, 'VECTOR_DELETE_ERROR', 'Failed to delete vectors');
    }
  }

  /**
   * Get vector statistics for a workspace
   */
  async getWorkspaceStats(workspaceId: string): Promise<{
    totalVectors: number;
    contentTypes: { [key: string]: number };
    lastUpdated: string;
  }> {
    if (!this.pineconeApiKey) {
      return {
        totalVectors: 42,
        contentTypes: {
          'webpage': 25,
          'social_media': 12,
          'document': 5
        },
        lastUpdated: new Date().toISOString()
      };
    }

    try {
      // Use describe_index_stats to get vector count
      const response = await axios.post(
        `https://${this.pineconeIndex}-${this.pineconeEnvironment}.svc.${this.pineconeEnvironment}.pinecone.io/describe_index_stats`,
        {
          filter: {
            workspaceId: { $eq: workspaceId }
          }
        },
        {
          headers: {
            'Api-Key': this.pineconeApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const stats = response.data;
      
      return {
        totalVectors: stats.totalVectorCount || 0,
        contentTypes: stats.namespaces?.['']?.vectorCount || {},
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Pinecone stats error:', error);
      throw new ApiError(500, 'VECTOR_STATS_ERROR', 'Failed to get vector statistics');
    }
  }

  /**
   * Batch process content into vectors
   */
  async processContentBatch(
    workspaceId: string,
    contentItems: Array<{
      sourceId?: string;
      content: string;
      metadata: any;
    }>
  ): Promise<VectorDocument[]> {
    const documents: VectorDocument[] = [];

    for (const item of contentItems) {
      try {
        // Generate embedding
        const embedding = await this.generateEmbedding(item.content);
        
        // Create vector document
        const document: VectorDocument = {
          id: uuidv4(),
          workspaceId,
          sourceId: item.sourceId || undefined,
          content: item.content,
          metadata: item.metadata,
          embedding,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        documents.push(document);
      } catch (error) {
        console.error(`Failed to process content item:`, error);
        // Continue with other items
      }
    }

    // Upsert to vector database
    if (documents.length > 0) {
      await this.upsertVectors(documents);
    }

    return documents;
  }
}