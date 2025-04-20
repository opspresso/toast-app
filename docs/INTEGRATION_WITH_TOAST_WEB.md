# Toast-App과 Toast-Web 연동 가이드

이 문서는 Toast-App(Electron 애플리케이션)과 Toast-Web(Next.js 웹 서비스) 간의 연동 설정 및 구현 방법을 설명합니다.

## 목차

- [개요](#개요)
- [인증 구성](#인증-구성)
- [프로토콜 핸들러 설정](#프로토콜-핸들러-설정)
- [인증 흐름 구현](#인증-흐름-구현)
- [토큰 관리](#토큰-관리)
- [구독 정보 활용](#구독-정보-활용)
- [오류 처리](#오류-처리)
- [보안 고려사항](#보안-고려사항)

## 개요

Toast-App은 사용자의 단축키 액션을 수행하는 Electron 데스크톱 애플리케이션이며, Toast-Web은 사용자 인증, 구독 관리 등을 담당하는 Next.js 웹 애플리케이션입니다. 두 시스템은 OAuth 2.0 표준 프로토콜을 통해 안전하게 연동됩니다.

## 인증 구성

Toast-App은 OAuth 2.0 클라이언트로 동작하며, Toast-Web은 OAuth 2.0 서버 역할을 합니다. Toast-App은 미리 등록된 공개 클라이언트(Public Client)로, 사용자는 별도의 클라이언트 ID나 시크릿을 설정할 필요 없이 앱을 사용할 수 있습니다.

### 핵심 개념

1. **인증 코드 흐름**: 사용자가 앱에서 로그인하면 시스템 브라우저가 열리고 웹 서비스에서 인증 후 `toast-app://auth` 프로토콜로 인증 코드가 반환됩니다.
2. **토큰 교환**: 인증 코드는 액세스 토큰 및 리프레시 토큰으로 교환됩니다.
3. **자원 접근**: 액세스 토큰을 사용하여 사용자 프로필, 구독 정보 등의 API에 접근합니다.

## 프로토콜 핸들러 설정

Toast-App은 `toast-app://` 프로토콜을 처리할 수 있도록 설정해야 합니다. 이는 OAuth 인증 후 리디렉션을 처리하기 위해 필요합니다.

```javascript
// app.js 또는 메인 프로세스 파일에서
function registerProtocolHandler() {
  if (process.defaultApp) {
    // 개발 모드에서는 앱 인수에 URL 스킴을 명시적으로 추가
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('toast-app', process.execPath, [
        path.resolve(process.argv[1])
      ]);
    }
  } else {
    // 프로덕션 빌드에서는 간단하게 등록
    app.setAsDefaultProtocolClient('toast-app');
  }
}

// 앱 준비 이벤트에서 호출
app.on('ready', () => {
  registerProtocolHandler();
  // ...
});
```

### URL 핸들링

프로토콜 요청을 처리하는 이벤트 리스너 등록:

```javascript
// macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleAuthRedirect(url);
});

// Windows
app.on('second-instance', (event, commandLine) => {
  // 대부분의 경우 마지막 인수가 URL
  const url = commandLine.pop();
  if (url.startsWith('toast-app://')) {
    handleAuthRedirect(url);
  }
});
```

## 인증 흐름 구현

### 1. 로그인 시작

```javascript
// 클라이언트 ID는 앱 내부에 미리 포함되어 있음
const CLIENT_ID = 'toast-app-client';
const REDIRECT_URI = 'toast-app://auth';

async function initiateLogin() {
  const state = uuidv4(); // CSRF 방지용 상태 값

  // 코드 검증기(PKCE)를 위한 코드 생성
  const codeVerifier = generateCodeVerifier();
  // 코드 검증기를 저장 (토큰 교환 시 사용)
  await storeCodeVerifier(codeVerifier);
  // 코드 챌린지 생성
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL('https://web.toast.sh/api/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', 'profile subscription');
  authUrl.searchParams.append('state', state);
  // PKCE 파라미터 추가
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  await shell.openExternal(authUrl.toString());
  return true;
}

// PKCE 코드 검증기 생성
function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

// 코드 챌린지 생성 (SHA-256)
async function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64URLEncode(hash);
}

// Base64URL 인코딩
function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

### 2. 인증 코드 처리

```javascript
function handleAuthRedirect(url) {
  const urlObj = new URL(url);

  // 인증 코드 추출
  const code = urlObj.searchParams.get('code');
  const state = urlObj.searchParams.get('state');

  if (code) {
    // 토큰으로 교환
    exchangeCodeForToken(code).then(result => {
      if (result.success) {
        // 로그인 성공 처리
        emitLoginSuccess();
      } else {
        // 로그인 실패 처리
        emitLoginFailure(result.error);
      }
    });
  } else {
    // 오류 처리
    const error = urlObj.searchParams.get('error');
    emitLoginFailure(error || 'Unknown error');
  }
}
```

### 3. 토큰 교환

```javascript
async function exchangeCodeForToken(code) {
  try {
    // 저장된 코드 검증기 가져오기
    const codeVerifier = await getStoredCodeVerifier();

    // 토큰 요청 데이터 준비
    const data = new URLSearchParams();
    data.append('grant_type', 'authorization_code');
    data.append('code', code);
    data.append('client_id', CLIENT_ID);
    data.append('redirect_uri', REDIRECT_URI);
    // PKCE 코드 검증기 추가
    data.append('code_verifier', codeVerifier);

    // 토큰 요청
    const response = await axios.post('https://web.toast.sh/api/oauth/token', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token } = response.data;

    // 토큰 안전하게 저장
    await storeToken(access_token);
    if (refresh_token) {
      await storeRefreshToken(refresh_token);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}
```

## 토큰 관리

Toast-App은 액세스 토큰과 리프레시 토큰을 안전하게 저장해야 합니다. 시스템의 보안 키체인/자격 증명 저장소를 사용하는 것이 권장됩니다.

```javascript
const keytar = require('keytar');

// 코드 검증기 저장
async function storeCodeVerifier(codeVerifier) {
  await keytar.setPassword('toast-app', 'code-verifier', codeVerifier);
}

// 코드 검증기 가져오기
async function getStoredCodeVerifier() {
  return await keytar.getPassword('toast-app', 'code-verifier');
}

// 토큰 저장
async function storeToken(token) {
  await keytar.setPassword('toast-app', 'auth-token', token);
}

// 리프레시 토큰 저장
async function storeRefreshToken(refreshToken) {
  await keytar.setPassword('toast-app', 'refresh-token', refreshToken);
}

// 토큰 가져오기
async function getStoredToken() {
  return await keytar.getPassword('toast-app', 'auth-token');
}

// 리프레시 토큰 가져오기
async function getStoredRefreshToken() {
  return await keytar.getPassword('toast-app', 'refresh-token');
}

// 토큰 삭제 (로그아웃 시)
async function clearTokens() {
  await keytar.deletePassword('toast-app', 'auth-token');
  await keytar.deletePassword('toast-app', 'refresh-token');
  await keytar.deletePassword('toast-app', 'code-verifier');
}
```

### 토큰 갱신

```javascript
async function refreshAccessToken() {
  try {
    const refreshToken = await getStoredRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const data = new URLSearchParams();
    data.append('grant_type', 'refresh_token');
    data.append('refresh_token', refreshToken);
    data.append('client_id', CLIENT_ID);

    const response = await axios.post('https://web.toast.sh/api/oauth/token', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token } = response.data;
    await storeToken(access_token);

    if (refresh_token) {
      await storeRefreshToken(refresh_token);
    }

    return true;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return false;
  }
}
```

## 구독 정보 활용

구독 상태에 따라 앱 기능을 제한하거나 활성화하는 예시:

```javascript
// 구독 정보 조회
async function fetchSubscription() {
  return authenticatedRequest(async () => {
    const headers = await getAuthHeaders();
    const response = await axios.get('https://web.toast.sh/api/user/subscription', { headers });
    return response.data;
  });
}

// 구독 상태에 따른 기능 활성화
async function checkFeatureAvailability(featureName) {
  try {
    const subscription = await fetchSubscription();

    // 구독이 활성 상태인지 확인
    if (subscription.status !== 'active') {
      return { available: false, reason: 'inactive_subscription' };
    }

    // 플랜에 따른 기능 확인
    if (subscription.plan === 'free' && isPremiumFeature(featureName)) {
      return { available: false, reason: 'premium_required' };
    }

    // 특정 기능이 구독에 포함되어 있는지 확인
    if (subscription.features && !subscription.features.includes(featureName)) {
      return { available: false, reason: 'feature_not_included' };
    }

    return { available: true };
  } catch (error) {
    console.error('Error checking feature availability:', error);
    return { available: false, reason: 'error', message: error.message };
  }
}
```

## 오류 처리

인증 및 API 통신 시 발생할 수 있는 오류에 대한 처리:

```javascript
// 인증이 필요한 API 호출을 처리하는 헬퍼 함수
async function authenticatedRequest(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    // 401 오류는 토큰 만료를 의미
    if (error.response && error.response.status === 401) {
      // 토큰 갱신 시도
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // 갱신된 토큰으로 재시도
        return await apiCall();
      } else {
        // 토큰 갱신 실패 - 사용자 재로그인 필요
        emitAuthError('session_expired');
        throw new Error('Authentication required');
      }
    }

    // 403 오류는 권한 부족을 의미
    if (error.response && error.response.status === 403) {
      emitAuthError('permission_denied');
    }

    throw error;
  }
}

// 인증 오류 이벤트 발생
function emitAuthError(type) {
  // 앱에서 구현한 이벤트 시스템에 오류 알림
  eventEmitter.emit('auth:error', { type });
}
```

## 보안 고려사항

1. **PKCE 사용**:
   - Toast-App은 공개 클라이언트로서 클라이언트 시크릿을 사용하지 않고 PKCE를 통해 인증합니다.
   - 이는 사용자가 별도의 환경 변수나 설정 없이도 인증을 안전하게 수행할 수 있게 합니다.

2. **토큰 저장**:
   - 토큰은 항상 시스템의 안전한 저장소(keytar 등)를 사용하여 저장해야 합니다.
   - 메모리에 토큰을 캐시하는 경우, 앱 종료 시 메모리에서 안전하게 제거해야 합니다.

3. **CSRF 방지**:
   - OAuth 인증 요청 시 항상 고유한 `state` 파라미터를 포함하고, 인증 응답에서 이를 검증해야 합니다.

4. **토큰 무효화**:
   - 로그아웃 시 항상 서버에 토큰 무효화 요청을 보내고, 로컬 토큰도 삭제해야 합니다.

```javascript
async function logout() {
  try {
    const token = await getStoredToken();

    if (token) {
      // 토큰 무효화 요청
      const data = new URLSearchParams();
      data.append('token', token);
      data.append('client_id', CLIENT_ID);

      await axios.post('https://web.toast.sh/api/oauth/revoke', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    }

    // 로컬 토큰 삭제
    await clearTokens();
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    // 오류가 발생해도 로컬 토큰은 삭제
    await clearTokens();
    return false;
  }
}
