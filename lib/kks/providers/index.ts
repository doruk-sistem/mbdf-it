import { KKSProvider, KEPProvider } from './types';
import { MockKKSProvider, MockKEPProvider } from './mock';

// KKS Provider registry
const kksProviders: Record<string, () => KKSProvider> = {
  mock: () => new MockKKSProvider(),
  // TODO: Add real providers here
  // kks_official: () => new OfficialKKSProvider(),
};

// KEP Provider registry
const kepProviders: Record<string, () => KEPProvider> = {
  mock: () => new MockKEPProvider(),
  // TODO: Add real providers here
  // ptt_kep: () => new PTTKEPProvider(),
  // turktrust_kep: () => new TurkTrustKEPProvider(),
};

export function createKKSProvider(providerName: string = 'mock'): KKSProvider {
  const providerFactory = kksProviders[providerName];
  if (!providerFactory) {
    throw new Error(`KKS provider '${providerName}' not found. Available providers: ${Object.keys(kksProviders).join(', ')}`);
  }
  
  return providerFactory();
}

export function createKEPProvider(providerName: string = 'mock'): KEPProvider {
  const providerFactory = kepProviders[providerName];
  if (!providerFactory) {
    throw new Error(`KEP provider '${providerName}' not found. Available providers: ${Object.keys(kepProviders).join(', ')}`);
  }
  
  return providerFactory();
}

export * from './types';
export { MockKKSProvider, MockKEPProvider };