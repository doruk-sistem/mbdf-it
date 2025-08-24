/**
 * Base API utilities for making HTTP requests with error handling
 */

export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public data?: any;

  constructor(status: number, statusText: string, data?: any) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

/**
 * Base fetch wrapper with error handling
 */
export async function fetchJSON<T = any>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...init,
    headers: {
      ...defaultHeaders,
      ...init.headers,
    },
  };

  try {
    const response = await fetch(input, config);

    // Handle non-JSON responses (like redirects or HTML error pages)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new ApiError(
        response.status,
        response.statusText,
        `Expected JSON response, got ${contentType}`
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, data);
    }

    return data;
  } catch (error) {
    // Re-throw ApiErrors as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors, JSON parse errors, etc.
    if (error instanceof TypeError) {
      throw new ApiError(0, 'Network Error', error.message);
    }

    // Handle other unexpected errors
    throw new ApiError(
      500,
      'Unknown Error',
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * GET request
 */
export async function get<T = any>(url: string, init?: RequestInit): Promise<T> {
  return fetchJSON<T>(url, { ...init, method: 'GET' });
}

/**
 * POST request
 */
export async function post<T = any>(
  url: string,
  data?: any,
  init?: RequestInit
): Promise<T> {
  return fetchJSON<T>(url, {
    ...init,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T = any>(
  url: string,
  data?: any,
  init?: RequestInit
): Promise<T> {
  return fetchJSON<T>(url, {
    ...init,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T = any>(
  url: string,
  init?: RequestInit
): Promise<T> {
  return fetchJSON<T>(url, { ...init, method: 'DELETE' });
}

/**
 * PATCH request
 */
export async function patch<T = any>(
  url: string,
  data?: any,
  init?: RequestInit
): Promise<T> {
  return fetchJSON<T>(url, {
    ...init,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Upload file using FormData
 */
export async function uploadFile<T = any>(
  url: string,
  formData: FormData,
  init?: Omit<RequestInit, 'body'>
): Promise<T> {
  const config: RequestInit = {
    ...init,
    method: 'POST',
    body: formData,
    // Don't set Content-Type header for FormData - browser will set it automatically with boundary
    headers: {
      ...init?.headers,
    },
  };

  // Remove Content-Type header if it exists for file uploads
  if (config.headers && 'Content-Type' in config.headers) {
    delete (config.headers as any)['Content-Type'];
  }

  try {
    const response = await fetch(url, config);

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new ApiError(
        response.status,
        response.statusText,
        `Expected JSON response, got ${contentType}`
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError) {
      throw new ApiError(0, 'Network Error', error.message);
    }

    throw new ApiError(
      500,
      'Unknown Error',
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Utility to build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]);

  if (filtered.length === 0) return '';

  const searchParams = new URLSearchParams(filtered);
  return `?${searchParams.toString()}`;
}

/**
 * Helper to handle query parameters in API calls
 */
export function withQuery<T = any>(
  url: string,
  params: Record<string, any> = {}
): string {
  const queryString = buildQueryString(params);
  return `${url}${queryString}`;
}

/**
 * Error boundary helper for React Query
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.data?.message || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if error is a specific HTTP status
 */
export function isHttpError(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

/**
 * API endpoints configuration
 */
export const API_ENDPOINTS = {
  // Rooms
  rooms: '/api/rooms',
  room: (id: string) => `/api/rooms/${id}`,

  // Documents
  documents: '/api/documents',
  document: (id: string) => `/api/documents/${id}`,
  documentUpload: '/api/documents/upload',

  // Members
  members: '/api/members',
  member: (id: string) => `/api/members/${id}`,

  // Access Packages & Requests
  packages: '/api/packages',
  package: (id: string) => `/api/packages/${id}`,
  accessRequests: '/api/access-requests',
  accessRequest: (id: string) => `/api/access-requests/${id}`,
  approveRequest: (id: string) => `/api/access-requests/${id}/approve`,
  rejectRequest: (id: string) => `/api/access-requests/${id}/reject`,

  // Voting
  votes: '/api/votes',
  vote: (id: string) => `/api/votes/${id}`,
  candidates: '/api/candidates',
  finalizeLr: '/api/lr/finalize',

  // Agreements
  agreements: '/api/agreements',
  agreement: (id: string) => `/api/agreements/${id}`,
  requestSignature: (id: string) => `/api/agreements/${id}/request-sign`,
  pollSignature: (id: string) => `/api/agreements/${id}/poll`,
  sendKep: (id: string) => `/api/agreements/${id}/send-kep`,

  // KKS
  kks: '/api/kks',
  kksSubmission: (id: string) => `/api/kks/${id}`,
  kksEvidence: (id: string) => `/api/kks/${id}/evidence`,
  kksSend: (id: string) => `/api/kks/${id}/send`,

  // Messages
  messages: '/api/messages',
  message: (id: string) => `/api/messages/${id}`,

  // Profile & Company
  profile: '/api/profile',
  company: '/api/company',

  // Substances
  substances: '/api/substances',
  substance: (id: string) => `/api/substances/${id}`,
  
  // Room Archive Operations
  archiveCheck: (roomId: string) => `/api/rooms/${roomId}/archive/check`,
  archiveConfirm: (roomId: string) => `/api/rooms/${roomId}/archive/confirm`,
  unarchiveRoom: (roomId: string) => `/api/rooms/${roomId}/archive/unarchive`,
} as const;