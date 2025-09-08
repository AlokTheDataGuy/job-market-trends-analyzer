// src/services/api.js
import axios from 'axios';

/**
 * API Service for Job Market Analyzer
 * Updated to match the actual FastAPI backend structure
 */
class ApiService {
  constructor() {
    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and data extraction
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        
        // For endpoints that return APIResponse wrapper, extract the data
        if (response.data && response.data.success !== undefined) {
          return {
            ...response,
            data: response.data.data || response.data, // Use nested data if available
            success: response.data.success,
            message: response.data.message
          };
        }
        
        return response;
      },
      (error) => {
        console.error('❌ Response Error:', error);
        
        // Handle specific error cases
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.response?.status === 503) {
          throw new Error('Service temporarily unavailable. Please try again later.');
        }
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Please check your connection.');
        }
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
        
        throw error;
      }
    );
  }

  /**
   * Search for jobs with filters
   * @param {Object} params - Search parameters matching JobSearchQuery
   * @returns {Promise<JobSearchResponse>}
   */
  async searchJobs(params = {}) {
    const searchQuery = {
      search_term: params.search_term || null,
      location: params.location || null,
      company: params.company || null,
      skills: params.skills || [],
      days_old: params.days_old || 30,
      page: params.page || 1,
      limit: params.limit || 20
    };

    const response = await this.client.post('/api/jobs/search', searchQuery);
    return response.data;
  }

  /**
   * Get trending skills data
   * @param {Object} params - Query parameters
   * @returns {Promise<SkillTrendResponse>}
   */
  async getTrendingSkills(params = {}) {
    const queryParams = {
      category: params.category || null,
      days: params.days || 30,
      limit: params.limit || 20,
      sort_by: params.sort_by || 'job_count_30d'
    };

    // Remove null values
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] === null) delete queryParams[key];
    });

    const response = await this.client.get('/api/skills/trending', { params: queryParams });
    return response.data;
  }

  /**
   * Get analytics data for a specific skill
   * @param {string} skillName - Name of the skill to analyze
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise<Object>}
   */
  async getSkillAnalytics(skillName, days = 30) {
    const response = await this.client.get(`/api/analytics/skill/${encodeURIComponent(skillName)}`, {
      params: { days }
    });
    return response.data; // This will be the extracted data from APIResponse
  }

  /**
   * Get market summary statistics
   * @param {number} days - Number of days to summarize (default: 7)
   * @returns {Promise<Object>}
   */
  async getMarketSummary(days = 7) {
    const response = await this.client.get('/api/market/summary', {
      params: { days }
    });
    return response.data; // This will be the extracted data from APIResponse
  }

  /**
   * Get application statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    const response = await this.client.get('/api/stats');
    return response.data; // This will be the extracted data from APIResponse
  }

  /**
   * Get skills categories breakdown
   * @returns {Promise<Object>}
   */
  async getSkillsCategories() {
    const response = await this.client.get('/api/skills/categories');
    return response.data; // This will be the extracted data from APIResponse
  }

  /**
   * Health check endpoint
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
