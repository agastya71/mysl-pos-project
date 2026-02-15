import axios, { AxiosInstance, AxiosError } from 'axios';

// Default API URL for development or web deployment
const DEFAULT_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string = DEFAULT_API_URL;

  constructor() {
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initializeFromElectronConfig();
  }

  /**
   * Initialize API URL from Electron configuration (if running in Electron)
   * Falls back to environment variable or localhost if not in Electron
   */
  private async initializeFromElectronConfig() {
    if (window.electron?.config) {
      try {
        const config = await window.electron.config.get();
        if (config.apiUrl && config.apiUrl !== this.baseURL) {
          this.updateBaseURL(config.apiUrl);
          console.log('API URL loaded from Electron config:', config.apiUrl);
        }
      } catch (error) {
        console.error('Failed to load Electron config, using default API URL:', error);
      }
    }
  }

  /**
   * Update the base URL for API requests
   * Useful when API URL changes at runtime
   */
  public updateBaseURL(newBaseURL: string) {
    this.baseURL = newBaseURL;
    this.client.defaults.baseURL = newBaseURL;
    console.log('API base URL updated to:', newBaseURL);
  }

  /**
   * Get the current base URL
   */
  public getBaseURL(): string {
    return this.baseURL;
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(`${this.baseURL}/auth/refresh`, {
                refreshToken,
              });

              const { accessToken, refreshToken: newRefreshToken } = response.data.data;
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  getClient(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
const apiClientInstance = new ApiClient();
export const apiClient = apiClientInstance.getClient();

// Export the instance for accessing methods like updateBaseURL
export const apiClientManager = apiClientInstance;
