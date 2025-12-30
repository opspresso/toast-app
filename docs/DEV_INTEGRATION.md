# Toast 앱 연동 가이드

이 문서는 Toast 앱과 외부 서비스 간의 연동에 대한 기본적인 가이드를 제공합니다.

> **참고**: OAuth 인증, 환경 변수, API 통신 등의 상세한 내용은 각각의 전용 문서를 참조하세요:
> - [클라우드 동기화](./FEATURE_CLOUD_SYNC.md) - 설정 동기화 및 API 통신
> - [환경 변수](./CONFIG_ENV.md) - 환경 변수 설정 및 관리
> - [보안](./ARCH_SECURITY.md) - 인증 및 보안 관련 사항

## 목차

- [개요](#개요)
- [설정 동기화](#설정-동기화)
- [로컬 데이터 관리](#로컬-데이터-관리)
- [오류 처리](#오류-처리)
- [보안 고려사항](#보안-고려사항)
- [변경 내역](#변경-내역)

## 개요

Toast 앱은 다양한 외부 서비스와 연동하여 사용자에게 향상된 기능을 제공합니다. 주요 연동 기능은 다음과 같습니다:

- **클라우드 동기화**: 설정 및 데이터의 클라우드 저장 및 동기화
- **인증 시스템**: 사용자 인증 및 권한 관리
- **API 통신**: 외부 서비스와의 데이터 교환

## 설정 동기화

Toast 앱은 사용자의 설정(페이지 구성, 테마 등)을 클라우드에 동기화하는 기능을 제공합니다.

클라우드 동기화에 대한 자세한 내용은 [FEATURE_CLOUD_SYNC.md](./FEATURE_CLOUD_SYNC.md) 문서를 참조하세요.

## 로컬 데이터 관리

Toast 앱은 사용자 데이터를 로컬에 안전하게 저장하고 관리합니다:

- **구성 데이터**: 앱 설정 및 페이지 구성
- **사용자 프로필**: 인증된 사용자 정보
- **캐시 데이터**: 성능 향상을 위한 임시 데이터

자세한 내용은 [CONFIG_DATA_STORAGE.md](./CONFIG_DATA_STORAGE.md) 문서를 참조하세요.

## 오류 처리

Toast 앱은 다양한 네트워크 오류와 API 응답 오류를 적절히 처리하여 사용자 경험을 유지합니다.

### 주요 오류 처리 전략

1. **네트워크 연결 오류**: 로컬에 저장된 데이터를 사용하여 오프라인 기능 유지
2. **토큰 만료 오류**: 자동으로 리프레시 토큰으로 갱신 시도
3. **API 요청 실패**: 적절한 재시도 로직 및 사용자에게 통보

### 오류 응답 형식

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable error message",
  "details": { ... }
}
```

### 오류 코드 및 처리 방법

| 오류 코드 | 설명 | 처리 방법 |
|-----------|------|-----------|
| `TOKEN_EXPIRED` | 액세스 토큰 만료 | 리프레시 토큰으로 갱신 |
| `REFRESH_TOKEN_EXPIRED` | 리프레시 토큰 만료 | 재로그인 요청 |
| `NETWORK_ERROR` | 네트워크 연결 오류 | 로컬 데이터 사용, 재연결 시 동기화 |
| `API_ERROR` | API 서버 오류 | 일정 시간 후 재시도 |
| `PERMISSION_DENIED` | 리소스 접근 권한 없음 | 구독 요구 메시지 표시 |

### 비어있는 파일 처리

파일이 손상되었거나 비어있는 경우 기본값을 제공하여 오류를 방지합니다:

```javascript
function getUserProfile() {
  try {
    const profileData = readFromFile(PROFILE_FILE_PATH);

    if (!profileData) {
      // 파일이 없거나 비어있는 경우 익명 프로필 반환
      return {
        id: 'anonymous',
        name: 'Anonymous User',
        email: '',
        subscription: {
          plan: 'free',
          active: false,
          features: { page_groups: 1 }
        }
      };
    }

    return profileData;
  } catch (error) {
    // 오류 발생 시 익명 프로필 반환
    console.error('프로필 정보 가져오기 오류:', error);
    return getAnonymousProfile();
  }
}
```

## 보안 고려사항

Toast 앱은 사용자 인증 정보와 개인 데이터를 안전하게 보호하기 위한 여러 보안 조치를 구현합니다.

보안에 대한 자세한 내용은 [ARCH_SECURITY.md](./ARCH_SECURITY.md) 문서를 참조하세요.

### 토큰 보안

1. **안전한 저장**: 토큰은 OS의 보안 키체인/자격 증명 저장소에 저장
2. **HTTPS 통신**: 모든 API 통신은 HTTPS를 통해 암호화됨
3. **토큰 만료 관리**: 액세스 토큰의 짧은 만료 시간(1시간)을 통한 보안 강화

### CSRF 보호

OAuth 인증 과정에서 `state` 파라미터를 사용하여 CSRF(Cross-Site Request Forgery) 공격을 방지합니다:

```javascript
// 인증 요청 시 상태 생성 및 저장
const state = uuidv4();
storeStateParam(state);

// 인증 응답에서 상태 검증
const storedState = retrieveStoredState();
if (!storedState || state !== storedState) {
  // CSRF 공격 가능성 대응
  console.error('State mismatch. Possible CSRF attack');
  return { success: false, error: 'state_mismatch' };
}
```

### 로컬 데이터 보호

1. **민감 정보 필터링**: 로컬에 저장되는 정보에서 민감한 정보 제외
2. **파일 접근 제한**: 사용자 데이터 디렉토리의 적절한 접근 권한 설정
3. **항상 검증**: 파일에서 로드된 데이터는 사용 전 항상 유효성 검증

### 벤더별 보안 고려사항

| 운영체제 | 토큰 저장 방식 | 보안 고려사항 |
|---------|---------------|-------------|
| macOS | Keychain | 앱 샌드박스 권한 필요 |
| Windows | Credential Manager | 사용자 계정 권한 필요 |
| Linux | libsecret / Secret Service API | 환경에 따라 추가 구성 필요 |

## 변경 내역

### 2025.04.22 (v2.5.0)
- 사용자 데이터 관리 모듈 추가
- 프로필 및 설정 정보 파일 저장 기능 구현
- 파일-API 연동 및 주기적 갱신 구현
- 로그아웃 시 로컬 데이터 정리 기능 추가

### 2025.03.15 (v2.4.0)
- 클라우드 동기화 기능 개선
- 페이지 추가/삭제, 버튼 수정 시 자동 동기화 구현
- 주기적 동기화 기능 구현 (15분 간격)

### 2025.02.01 (v2.3.0)
- OAuth 2.0 인증 개선
- 토큰 리프레시 메커니즘 강화
- 인증 데이터의 안전한 저장 및 관리 개선

### 2025.01.15 (v2.2.0)
- 사용자 프로필 및 구독 정보 API 통합
- 구독 상태에 따른 기능 제한 구현
- VIP 사용자 지원 추가
