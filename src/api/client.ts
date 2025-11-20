import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import Bottleneck from 'bottleneck';
import { KOLADA_CONFIG, ERROR_MESSAGES } from '../config/constants.js';
import type { KoladaResponse } from '../config/types.js';

/**
 * Kolada API Client with rate limiting and retry logic
 */
export class KoladaClient {
  private axios: AxiosInstance;
  private limiter: Bottleneck;

  constructor() {
    // Initialize rate limiter (5 requests per second)
    this.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: KOLADA_CONFIG.MIN_REQUEST_INTERVAL,
    });

    // Initialize axios with base configuration
    this.axios = axios.create({
      baseURL: KOLADA_CONFIG.BASE_URL,
      timeout: KOLADA_CONFIG.REQUEST_TIMEOUT,
      headers: {
        'Accept': 'application/json',
      },
    });

    // Configure retry logic
    axiosRetry(this.axios, {
      retries: KOLADA_CONFIG.MAX_RETRIES,
      retryDelay: (retryCount) => {
        return retryCount * KOLADA_CONFIG.RETRY_DELAY_BASE;
      },
      retryCondition: (error: AxiosError) => {
        // Retry on network errors or 429 (rate limit)
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429
        );
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.warn(
          `Retrying request (${retryCount}/${KOLADA_CONFIG.MAX_RETRIES}): ${requestConfig.url}`
        );
      },
    });
  }

  /**
   * Make a GET request to the Kolada API with rate limiting
   */
  async request<T>(endpoint: string, params?: Record<string, any>): Promise<KoladaResponse<T>> {
    return this.limiter.schedule(async (): Promise<KoladaResponse<T>> => {
      try {
        const response = await this.axios.get<KoladaResponse<T>>(endpoint, { params });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            return {
              values: [],
              count: 0,
            };
          }
          throw new Error(
            `${ERROR_MESSAGES.API_ERROR}: ${error.response?.statusText || error.message}`
          );
        }
        throw new Error(`${ERROR_MESSAGES.NETWORK_ERROR}: ${String(error)}`);
      }
    });
  }

  /**
   * Fetch all pages from a paginated endpoint
   */
  async *fetchAllPages<T>(
    endpoint: string,
    params?: Record<string, any>
  ): AsyncGenerator<T[], void, unknown> {
    let nextUrl: string | undefined = endpoint;
    let queryParams = params;

    while (nextUrl) {
      const response: KoladaResponse<T> = await this.request<T>(nextUrl, queryParams);

      if (response.values && response.values.length > 0) {
        yield response.values;
      }

      // Use next_page URL if available, otherwise stop
      if (response.next_page) {
        nextUrl = response.next_page.replace(KOLADA_CONFIG.BASE_URL, '');
        queryParams = undefined; // Next page URL includes params
      } else {
        break;
      }
    }
  }

  /**
   * Fetch all paginated data and return as a single array
   */
  async fetchAllData<T>(endpoint: string, params?: Record<string, any>): Promise<T[]> {
    const allData: T[] = [];

    for await (const page of this.fetchAllPages<T>(endpoint, params)) {
      allData.push(...page);
    }

    return allData;
  }

  /**
   * Batch request for multiple IDs (max 25 per request)
   */
  async batchRequest<T>(
    endpoint: string,
    ids: string[],
    idParam: string = 'id'
  ): Promise<T[]> {
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += KOLADA_CONFIG.MAX_BATCH_SIZE) {
      batches.push(ids.slice(i, i + KOLADA_CONFIG.MAX_BATCH_SIZE));
    }

    const results: T[] = [];
    for (const batch of batches) {
      const response = await this.request<T>(endpoint, {
        [idParam]: batch.join(','),
      });
      results.push(...response.values);
    }

    return results;
  }
}

// Singleton instance
export const koladaClient = new KoladaClient();
