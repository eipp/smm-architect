import axios from 'axios';
import { VectorService } from '../src/services/vector-service';
import { ApiError } from '../src/middleware/error-handler';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VectorService', () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
  });

  describe('constructor', () => {
    it('throws if credentials are missing', () => {
      const openai = process.env.OPENAI_API_KEY;
      const pinecone = process.env.PINECONE_API_KEY;
      const env = process.env.PINECONE_ENVIRONMENT;
      const index = process.env.PINECONE_INDEX;
      delete process.env.OPENAI_API_KEY;
      delete process.env.PINECONE_API_KEY;
      delete process.env.PINECONE_ENVIRONMENT;
      delete process.env.PINECONE_INDEX;
      expect(() => new VectorService()).toThrow('OPENAI_API_KEY is required');
      process.env.OPENAI_API_KEY = openai;
      process.env.PINECONE_API_KEY = pinecone;
      process.env.PINECONE_ENVIRONMENT = env;
      process.env.PINECONE_INDEX = index;
    });
  });

  describe('generateEmbedding', () => {
    it('returns embedding on success', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { data: [{ embedding: [0.1, 0.2] }] } });
      const service = new VectorService();
      const result = await service.generateEmbedding('hello world');
      expect(result).toEqual([0.1, 0.2]);
    });

    it('throws ApiError on failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('OpenAI failure'));
      const service = new VectorService();
      await expect(service.generateEmbedding('text')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('upsertVectors', () => {
    const docs = [
      {
        id: '1',
        workspaceId: 'ws',
        content: 'content',
        metadata: { contentType: 'webpage' },
        embedding: [0.1],
        createdAt: 'now',
        updatedAt: 'now'
      }
    ];

    it('calls pinecone upsert', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} });
      const service = new VectorService();
      await service.upsertVectors(docs as any);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/vectors/upsert'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('throws ApiError on failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Pinecone upsert error'));
      const service = new VectorService();
      await expect(service.upsertVectors(docs as any)).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('searchSimilar', () => {
    it('returns results from pinecone', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { data: [{ embedding: [0.1, 0.2] }] } })
        .mockResolvedValueOnce({
          data: {
            matches: [
              {
                id: 'doc1',
                score: 0.9,
                metadata: {
                  content: 'content',
                  contentType: 'webpage',
                  sourceUrl: 'url',
                  title: 'Title',
                  author: 'Author',
                  publishedAt: 'now',
                  tags: ['tag'],
                  sourceId: 'src1'
                }
              }
            ]
          }
        });
      const service = new VectorService();
      const results = await service.searchSimilar({ workspaceId: 'ws', query: 'q' });
      expect(results[0]).toMatchObject({ id: 'doc1', score: 0.9 });
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('throws ApiError when query fails', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { data: [{ embedding: [0.1] }] } })
        .mockRejectedValueOnce(new Error('Pinecone query error'));
      const service = new VectorService();
      await expect(
        service.searchSimilar({ workspaceId: 'ws', query: 'q' })
      ).rejects.toBeInstanceOf(ApiError);
    });
  });
});
