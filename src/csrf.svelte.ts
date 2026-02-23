















interface CSRFState {
  token: string | null;
  tokenHash: string | null;
  issuedAt: number | null;
  expiresAt: number | null;
  role: string | null;
}


const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; 
const EXPIRY_THRESHOLD_MS = 30 * 60 * 1000; 





function hashToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}




function readTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';').map(c => c.trim());
  const csrfCookie = cookies.find(c => c.startsWith(`${CSRF_COOKIE}=`));

  if (csrfCookie) {
    const token = csrfCookie.split('=')[1];
    return decodeURIComponent(token);
  }

  return null;
}




function createCSRFStore() {
  let state = $state<CSRFState>({
    token: null,
    tokenHash: null,
    issuedAt: null,
    expiresAt: null,
    role: null
  });

  
  const isValid = $derived(
    state.token !== null &&
    state.expiresAt !== null &&
    Date.now() < state.expiresAt
  );

  const isExpiringSoon = $derived(
    state.expiresAt !== null &&
    Date.now() > state.expiresAt - EXPIRY_THRESHOLD_MS
  );

  const timeUntilExpiry = $derived(
    state.expiresAt !== null
      ? Math.max(0, state.expiresAt - Date.now())
      : null
  );

  


  function initialize(token: string, role?: string) {
    const now = Date.now();
    state = {
      token,
      tokenHash: hashToken(token),
      issuedAt: now,
      expiresAt: now + TOKEN_LIFETIME_MS,
      role: role ?? null
    };
  }

  



  async function fetchToken(): Promise<string | null> {
    try {
      
      const cookieToken = readTokenFromCookie();
      if (cookieToken) {
        initialize(cookieToken);
        return cookieToken;
      }

      
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          initialize(data.token);
          return data.token;
        }
      }
    } catch (error) {
      console.error('[CSRF Store] Failed to fetch token:', error);
    }

    return null;
  }

  



  async function rotateOnRoleChange(newRole: string): Promise<void> {
    
    if (state.role === newRole) {
      return;
    }

    console.log(`[CSRF Store] Rotating token due to role change: ${state.role} -> ${newRole}`);

    try {
      
      const response = await fetch('/api/csrf-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason: 'role_change',
          previousRole: state.role,
          newRole
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          initialize(data.token, newRole);
          console.log('[CSRF Store] Token rotated successfully');
        }
      } else {
        console.error('[CSRF Store] Failed to rotate token:', response.status);
      }
    } catch (error) {
      console.error('[CSRF Store] Token rotation error:', error);
    }
  }

  



  async function refreshIfNeeded(): Promise<void> {
    if (!isExpiringSoon) return;

    console.log('[CSRF Store] Token expiring soon, refreshing');

    try {
      const response = await fetch('/api/csrf-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'refresh' })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          initialize(data.token, state.role ?? undefined);
          console.log('[CSRF Store] Token refreshed successfully');
        }
      }
    } catch (error) {
      console.error('[CSRF Store] Token refresh error:', error);
      
    }
  }

  



  function getHeaders(): Record<string, string> {
    if (!state.token || !isValid) {
      console.warn('[CSRF Store] No valid token available for request');
      return {};
    }
    return { [CSRF_HEADER]: state.token };
  }

  



  function validate(token: string): boolean {
    if (!state.token) return false;
    return token === state.token && isValid;
  }

  



  function clear() {
    console.log('[CSRF Store] Clearing token');
    state = {
      token: null,
      tokenHash: null,
      issuedAt: null,
      expiresAt: null,
      role: null
    };
  }

  



  function setRole(role: string | null) {
    state.role = role;
  }

  return {
    
    get token() { return state.token; },
    get isValid() { return isValid; },
    get isExpiringSoon() { return isExpiringSoon; },
    get role() { return state.role; },
    get timeUntilExpiry() { return timeUntilExpiry; },
    get expiresAt() { return state.expiresAt; },

    
    initialize,
    fetchToken,
    rotateOnRoleChange,
    refreshIfNeeded,
    getHeaders,
    validate,
    clear,
    setRole,

    
    HEADER: CSRF_HEADER,
    COOKIE: CSRF_COOKIE
  };
}


export const csrfStore = createCSRFStore();


export const getCSRFHeaders = () => csrfStore.getHeaders();
export const validateCSRF = (token: string) => csrfStore.validate(token);
export const refreshCSRF = () => csrfStore.refreshIfNeeded();
