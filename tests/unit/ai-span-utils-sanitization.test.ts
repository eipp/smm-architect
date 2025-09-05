const mockCaptureException = jest.fn();
const mockStartSpan = jest.fn((_options, callback) => {
  return callback({ setAttribute: jest.fn() });
});

jest.mock('@sentry/node', () => ({
  startSpan: mockStartSpan,
  captureException: mockCaptureException,
}));

const { withAISpan, withAgentSpan } = require('../../ai-span-utils-simple.js');

describe('AI span utilities error sanitization', () => {
  beforeEach(() => {
    mockCaptureException.mockClear();
    mockStartSpan.mockClear();
  });

  test('withAISpan sanitizes errors', async () => {
    const secretError = new Error('Sensitive: API key 12345');
    await expect(
      withAISpan('gpt-4o', 'Test Operation', async () => {
        throw secretError;
      })
    ).rejects.toThrow('AI request failed');

    expect(mockCaptureException).toHaveBeenCalledWith(secretError);
  });

  test('withAgentSpan sanitizes errors and logs details', async () => {
    const secretError = new Error('Sensitive: token abc');
    await expect(
      withAgentSpan('agent', 'gpt-4o', 'Test Task', async () => {
        throw secretError;
      })
    ).rejects.toThrow('Agent execution failed');

    expect(mockCaptureException).toHaveBeenCalledWith(
      secretError,
      expect.objectContaining({
        tags: expect.objectContaining({ agent: 'agent', model: 'gpt-4o', task: 'Test Task' }),
      })
    );
  });
});
