const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API client with automatic token injection and error handling
 */
class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async request(method, path, data = null, options = {}) {
        const url = `${this.baseURL}${path}`;

        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                const error = new Error(responseData.error || 'Request failed');
                error.status = response.status;
                error.code = responseData.code;
                error.response = { data: responseData, status: response.status };
                throw error;
            }

            return { data: responseData, status: response.status };
        } catch (error) {
            if (error.status) throw error;

            // Network error
            const networkError = new Error('Network error - please check your connection');
            networkError.status = 0;
            throw networkError;
        }
    }

    get(path, options = {}) {
        return this.request('GET', path, null, options);
    }

    post(path, data, options = {}) {
        return this.request('POST', path, data, options);
    }

    put(path, data, options = {}) {
        return this.request('PUT', path, data, options);
    }

    patch(path, data, options = {}) {
        return this.request('PATCH', path, data, options);
    }

    delete(path, options = {}) {
        return this.request('DELETE', path, null, options);
    }
}

const api = new ApiClient(`${API_URL}/api`);

export default api;

/**
 * Create an authenticated API client
 * @param {string} token - JWT access token
 */
export function createAuthenticatedApi(token) {
    return {
        get: (path) => api.get(path, { headers: { Authorization: `Bearer ${token}` } }),
        post: (path, data) => api.post(path, data, { headers: { Authorization: `Bearer ${token}` } }),
        put: (path, data) => api.put(path, data, { headers: { Authorization: `Bearer ${token}` } }),
        patch: (path, data) => api.patch(path, data, { headers: { Authorization: `Bearer ${token}` } }),
        delete: (path) => api.delete(path, { headers: { Authorization: `Bearer ${token}` } }),
    };
}
