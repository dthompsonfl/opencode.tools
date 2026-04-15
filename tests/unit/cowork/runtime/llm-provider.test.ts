import {
  MockLLMProvider,
  OpenAILLMProvider,
  getLLMProvider,
  resolveLLMProviderConfig
} from '../../../../src/cowork/runtime/llm-provider';

describe('cowork/runtime/llm-provider', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.COWORK_LLM_PROVIDER;
    delete process.env.COWORK_ALLOW_MOCK_LLM;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_TEMPERATURE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses mock provider by default in test environment', () => {
    process.env.NODE_ENV = 'test';

    const provider = getLLMProvider();

    expect(provider).toBeInstanceOf(MockLLMProvider);
  });

  it('fails fast in non-test environment when config is missing', () => {
    process.env.NODE_ENV = 'production';

    expect(() => getLLMProvider()).toThrow(
      'Invalid cowork LLM provider configuration'
    );
  });

  it('uses openai provider when openai config is valid', () => {
    process.env.NODE_ENV = 'production';
    process.env.COWORK_LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';

    const provider = getLLMProvider();

    expect(provider).toBeInstanceOf(OpenAILLMProvider);
  });

  it('allows mock provider only with explicit development opt-in', () => {
    process.env.NODE_ENV = 'development';

    const provider = getLLMProvider({
      type: 'mock',
      allowMockInDev: true
    });

    expect(provider).toBeInstanceOf(MockLLMProvider);
  });

  it('rejects mock provider in production', () => {
    process.env.NODE_ENV = 'production';

    expect(() => getLLMProvider({ type: 'mock' })).toThrow(
      'mock provider is restricted to test and explicit development opt-in'
    );
  });

  it('rejects invalid provider type from environment', () => {
    process.env.NODE_ENV = 'development';
    process.env.COWORK_LLM_PROVIDER = 'invalid-provider';

    expect(() => resolveLLMProviderConfig()).toThrow(
      'Invalid cowork LLM provider type'
    );
  });
});
