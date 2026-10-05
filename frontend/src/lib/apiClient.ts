import { supabase } from './supabaseClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Retrieve a valid Supabase access token, proactively refreshing if expired or expiring soon.
 */
async function getValidToken(): Promise<string | null> {
  try {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const now = Math.floor(Date.now() / 1000);
    // If the token is already expired or expiring within 60 seconds, refresh it
    if (session.expires_at && session.expires_at <= now + 60) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData.session?.access_token) {
        return refreshData.session.access_token;
      }
      // If refresh token has also expired or been invalidated, clear stale session
      console.warn('[apiClient] Session expired and cannot be refreshed, signing out.');
      await supabase.auth.signOut().catch(() => {});
      return null;
    }

    return session.access_token || null;
  } catch (err) {
    console.warn('[apiClient] Error inspecting auth session:', err);
    return null;
  }
}

/**
 * Construct standard headers including auth token, organization ID, and role.
 */
function buildHeaders(options: RequestInit, token: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token && token !== 'undefined' && token !== 'null') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (typeof window !== 'undefined') {
    const savedOrgId = localStorage.getItem('paydoc_org_id') || '00000000-0000-0000-0000-000000000001';
    headers['x-organization-id'] = savedOrgId;

    const savedRole = localStorage.getItem('paydoc_active_role');
    if (savedRole) {
      headers['x-user-role'] = savedRole;
    }
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  let token = await getValidToken();

  let res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options, token),
  });

  // Handle 401 Unauthorized: token may have expired mid-session
  if (res.status === 401 && token) {
    console.warn('[apiClient] 401 Unauthorized encountered. Attempting token refresh and retry...');
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData.session?.access_token) {
        token = refreshData.session.access_token;
        // Retry with refreshed valid token
        res = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: buildHeaders(options, token),
        });
      } else {
        // If refresh failed, clear stale local session
        await supabase.auth.signOut().catch(() => {});
        // In local development, retry once without the dead token to utilize dev admin fallback
        res = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: buildHeaders(options, null),
        });
      }
    } catch (retryErr) {
      console.warn('[apiClient] 401 retry failed:', retryErr);
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed with status ${res.status}`);
  }

  // If content is PDF or blob
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return res.blob();
  }

  return res.json();
}
