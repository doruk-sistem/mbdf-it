import { ESignatureProvider } from './types';
import { MockESignatureProvider } from './mock';

// Provider registry
const providers: Record<string, () => ESignatureProvider> = {
  mock: () => new MockESignatureProvider(),
  // TODO: Add real providers here
  // docusign: () => new DocuSignProvider(),
  // heliosign: () => new HelloSignProvider(),
};

export function createESignatureProvider(providerName: string = 'mock'): ESignatureProvider {
  const providerFactory = providers[providerName];
  if (!providerFactory) {
    throw new Error(`E-signature provider '${providerName}' not found. Available providers: ${Object.keys(providers).join(', ')}`);
  }
  
  return providerFactory();
}

export * from './types';
export { MockESignatureProvider };