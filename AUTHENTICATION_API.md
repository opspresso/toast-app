# Toast App 인증 및 구독 API 문서

이 문서는 Toast App이 웹 서비스(https://web.toast.sh/)를 통해 사용자 인증 및 구독 정보를 가져오는 방법에 대한 상세 설명입니다.

## 1. 개요

Toast App은 사용자 인증 및 구독 관리를 위해 OAuth 2.0 프로토콜을 사용하여 웹 서비스와 통신합니다. 이 시스템은 다음과 같은 기능을 제공합니다:

- 사용자 인증 (로그인/로그아웃)
- 구독 상태 확인
- 구독 정보 동기화
- 사용자 프로필 정보 접근

## 2. 인증 프로토콜: OAuth 2.0

OAuth 2.0은 사용자 인증 및 권한 부여를 위한 업계 표준 프로토콜로, 다음과 같은 이유로 선택되었습니다:

- 안전한 토큰 기반 인증 제공
- 제3자 애플리케이션에 대한 제한된 접근 권한 부여
- 사용자의 자격 증명(비밀번호 등)을 애플리케이션에 직접 노출하지 않음
- 다양한 클라이언트 애플리케이션(데스크톱, 모바일, 웹)에서 일관된 인증 경험 제공

### 인증 흐름 (Authorization Code Flow)

Toast App은 OAuth 2.0의 Authorization Code Flow를 사용합니다:

1. 사용자가 설정 페이지에서 "로그인" 버튼을 클릭합니다.
2. Toast App은 시스템 기본 브라우저를 열어 웹 서비스의 인증 페이지(https://web.toast.sh/auth)로 리디렉션합니다.
3. 사용자는 웹 서비스에서 로그인하고 Toast App에 대한 접근 권한을 승인합니다.
4. 웹 서비스는 사용자를 커스텀 URI 스킴(toast-app://auth)으로 리디렉션하고 인증 코드를 전달합니다.
5. Toast App은 이 URI를 인터셉트하여 인증 코드를 획득합니다.
6. Toast App은 획득한 인증 코드와 클라이언트 비밀키를 사용하여 웹 서비스의 토큰 엔드포인트에 접근 토큰을 요청합니다.
7. 웹 서비스는 유효한 인증 코드에 대한 접근 토큰(access token)과 갱신 토큰(refresh token)을 발급합니다.
8. Toast App은 이 토큰을 안전하게 저장하고 API 요청 시 사용합니다.

## 3. API 엔드포인트

### 기본 URL
```
https://web.toast.sh/api
```

### 인증 관련 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `https://web.toast.sh/auth` | GET | 사용자 인증 및 앱 승인을 위한 웹 페이지 |
| `/oauth/token` | POST | 액세스 토큰 및 리프레시 토큰 발급/갱신 |
| `/oauth/revoke` | POST | 토큰 무효화(로그아웃) |

### 사용자 및 구독 관련 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/user/profile` | GET | 사용자 프로필 정보 조회 |
| `/user/subscription` | GET | 현재 구독 상태 및 정보 조회 |

## 4. 인증 요청 매개변수

### 인증 요청 (`/oauth/authorize`)

```
https://web.toast.sh/auth?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=toast-app://auth&
  scope=profile subscription&
  state=RANDOM_STATE_STRING
```

| 매개변수 | 설명 |
|----------|------|
| `response_type` | `code`로 고정 (인증 코드 흐름 사용) |
| `client_id` | Toast App의 클라이언트 ID |
| `redirect_uri` | 인증 후 리디렉션할 URI (toast-app://auth) |
| `scope` | 요청 권한 범위 (profile: 사용자 정보, subscription: 구독 정보) |
| `state` | CSRF 공격 방지를 위한 임의의 문자열. 콜백에서 검증해야 함 |

### 토큰 요청 (`/oauth/token`)

```http
POST /oauth/token HTTP/1.1
Host: web.toast.sh
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
redirect_uri=toast-app://auth
```

| 매개변수 | 설명 |
|----------|------|
| `grant_type` | `authorization_code` (인증 코드 교환) 또는 `refresh_token` (토큰 갱신) |
| `code` | 이전 단계에서 받은 인증 코드 (grant_type이 authorization_code인 경우) |
| `refresh_token` | 이전에 받은 리프레시 토큰 (grant_type이 refresh_token인 경우) |
| `client_id` | Toast App의 클라이언트 ID |
| `client_secret` | Toast App의 클라이언트 비밀키 |
| `redirect_uri` | 인증 단계에서 사용한 것과 동일한 리디렉션 URI |

### 토큰 응답

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "profile subscription"
}
```

| 필드 | 설명 |
|------|------|
| `access_token` | API 요청에 사용할 액세스 토큰 |
| `token_type` | 토큰 타입 ("Bearer") |
| `expires_in` | 액세스 토큰 만료 시간(초) |
| `refresh_token` | 새 액세스 토큰을 얻기 위한 리프레시 토큰 |
| `scope` | 부여된 권한 범위 |

## 5. 사용자 및 구독 정보 API

### 사용자 프로필 조회

```http
GET /api/user/profile HTTP/1.1
Host: web.toast.sh
Authorization: Bearer ACCESS_TOKEN
```

#### 응답

```json
{
  "id": "user123",
  "email": "user@example.com",
  "name": "홍길동",
  "created_at": "2024-01-15T09:30:45Z",
  "avatar_url": "https://web.toast.sh/avatars/user123.jpg"
}
```

### 구독 정보 조회

```http
GET /api/user/subscription HTTP/1.1
Host: web.toast.sh
Authorization: Bearer ACCESS_TOKEN
```

#### 응답

```json
{
  "is_subscribed": true,
  "plan": "premium",
  "subscribed_until": "2025-12-31T23:59:59Z",
  "features": {
    "page_groups": 3,
    "advanced_actions": true,
    "cloud_sync": true
  },
  "payment": {
    "method": "credit_card",
    "last4": "1234",
    "next_billing_date": "2025-01-31T00:00:00Z"
  },
  "status": "active"
}
```

## 6. 토큰 저장 및 관리

Toast App은 다음과 같은 방식으로 인증 토큰을 안전하게 저장하고 관리합니다:

1. **안전한 저장**: 액세스 토큰과 리프레시 토큰은 운영체제의 안전한 저장소(Keychain, Windows Credential Manager 등)에 저장됩니다.

2. **토큰 갱신**: 액세스 토큰이 만료되면 리프레시 토큰을 사용하여 자동으로 갱신합니다.

3. **세션 유지**: 사용자가 앱을 재시작해도 저장된 토큰을 사용하여 자동 로그인됩니다.

4. **토큰 무효화**: 사용자가 로그아웃할 때 서버에 토큰 무효화 요청을 보내고 로컬 저장소에서 토큰을 삭제합니다.

## 7. 구독 정보 동기화

Toast App은 다음과 같은 시점에 구독 정보를 동기화합니다:

- 앱 시작 시
- 설정 페이지에 진입할 때
- 사용자가 구독 상태를 수동으로 새로고침할 때
- 일정 시간(12시간) 간격으로 백그라운드에서 자동 동기화

구독 정보를 받으면 config 저장소의 `subscription` 객체를 다음과 같이 업데이트합니다:

```javascript
config.set('subscription', {
  isSubscribed: response.is_subscribed,
  plan: response.plan,
  subscribedUntil: response.subscribed_until,
  pageGroups: response.features.page_groups,
  additionalFeatures: {
    advancedActions: response.features.advanced_actions,
    cloudSync: response.features.cloud_sync
  }
});
```

## 8. 구현 단계

Toast App에 인증 및 구독 기능을 구현하기 위한 권장 단계:

1. **설정 페이지 UI 개선**: 로그인/로그아웃 버튼과 구독 상태 표시 영역 추가

2. **URI 스킴 등록**: 애플리케이션이 `toast-app://` URI 스킴을 처리할 수 있도록 설정

3. **OAuth 클라이언트 구현**: 인증 코드 요청, 토큰 교환, 토큰 갱신 기능 구현

4. **안전한 토큰 저장소 구현**: 운영체제의 안전한 자격 증명 저장소 활용

5. **API 클라이언트 모듈 구현**: 사용자 프로필 및 구독 정보 조회 기능 구현

6. **구독 기반 기능 제한 로직 구현**: 구독 상태에 따라 앱 기능 제한/활성화

## 9. 보안 고려사항

- 모든 API 통신은 HTTPS를 통해 이루어집니다.
- 클라이언트 비밀키는 앱 내부에 하드코딩하지 않고, 빌드 시 환경 변수에서 가져오거나 안전한 저장소에서 로드합니다.
- 토큰은 메모리나 일반 파일이 아닌 운영체제의 안전한 저장소에 보관합니다.
- CSRF 공격 방지를 위해 상태 매개변수를 활용합니다.
- 정기적인 보안 감사를 통해 인증 로직의 취약점을 점검합니다.

## 10. 예외 처리

Toast App은 다음과 같은 예외 상황을 처리합니다:

- 인터넷 연결 실패 시 오프라인 모드로 전환하고 로컬 캐시된 구독 정보 사용
- 인증 만료 시 사용자에게 재로그인 알림
- 구독 만료 시 사용자에게 갱신 알림 및 기본 기능으로 제한
- 서버 오류 발생 시 적절한 오류 메시지 표시 및 재시도 로직 제공

## 11. 사용자 흐름 예시

### 로그인 및 구독 확인 흐름

1. 사용자가 Toast App 설정에서 "로그인" 버튼 클릭
2. 기본 웹 브라우저에서 인증 페이지 열림
3. 사용자가 자격 증명 입력 및 앱 접근 권한 허용
4. 브라우저가 `toast-app://auth?code=...` URI로 리디렉션
5. Toast App이 URI를 인터셉트하여 인증 코드 추출
6. 백그라운드에서 토큰 교환 및 구독 정보 조회
7. 구독 정보가 설정 페이지에 표시되고 구독 상태에 따라 기능 활성화
