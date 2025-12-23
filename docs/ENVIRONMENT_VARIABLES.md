# Toast 앱 환경 변수

이 문서는 Toast 앱에서 실제로 사용하는 환경 변수를 설명합니다.

## 목차

- [환경 변수 설정 방법](#환경-변수-설정-방법)
- [인증 관련 변수](#인증-관련-변수)
- [클라우드 동기화 변수](#클라우드-동기화-변수)
- [애플리케이션 설정 변수](#애플리케이션-설정-변수)

## 환경 변수 설정 방법

환경 변수는 다음 방법으로 설정할 수 있습니다:

### 1. .env 파일 사용 (권장)

`src/main/config/.env` 파일을 생성하여 환경 변수를 설정합니다:

```bash
# .env 파일 예시
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
TOAST_URL=https://app.toast.sh
TOKEN_EXPIRES_IN=2592000
```

### 2. 시스템 환경 변수

운영체제의 환경 변수로 설정:

```bash
# macOS/Linux
export CLIENT_ID=your_client_id
export TOKEN_EXPIRES_IN=2592000

# Windows
set CLIENT_ID=your_client_id
set TOKEN_EXPIRES_IN=2592000
```

## 인증 관련 변수

사용자 인증 및 API 통신에 사용되는 환경 변수들입니다.

| 변수명 | 기본값 | 설명 | 예시 |
|--------|--------|------|------|
| `CLIENT_ID` | - | OAuth 클라이언트 ID | `toast_app_client_id` |
| `CLIENT_SECRET` | - | OAuth 클라이언트 시크릿 | `your_client_secret` |

### 인증 변수 설정 예시

```bash
# 개발 환경
CLIENT_ID=development_client_id
CLIENT_SECRET=development_client_secret

# 프로덕션 환경
CLIENT_ID=production_client_id
CLIENT_SECRET=production_client_secret
```

## 클라우드 동기화 변수

클라우드 동기화 기능에 사용되는 환경 변수들입니다.

| 변수명 | 기본값 | 설명 | 예시 |
|--------|--------|------|------|
| `TOKEN_EXPIRES_IN` | `2592000` | 토큰 만료 시간 (초 단위, 0 이하는 무기한) | `86400` |

### 토큰 만료 시간 설정

```bash
# 30일 (기본값)
TOKEN_EXPIRES_IN=2592000

# 무기한 (0 이하 값)
TOKEN_EXPIRES_IN=0
TOKEN_EXPIRES_IN=-1

# 1일
TOKEN_EXPIRES_IN=86400

# 1시간
TOKEN_EXPIRES_IN=3600
```

**토큰 만료 시간 설명**:
- **2592000**: 30일 (기본 설정)
- **0 또는 음수 값(-1)**: 무제한(사실상 영구) 토큰으로 설정
- **양수 값**: 해당 초 단위만큼 토큰 유효

## 애플리케이션 설정 변수

애플리케이션 기본 설정에 사용되는 환경 변수들입니다.

| 변수명 | 기본값 | 설명 | 예시 |
|--------|--------|------|------|
| `TOAST_URL` | `https://app.toast.sh` | Toast 웹 서비스 URL | `https://app.toast.sh` |

### 애플리케이션 설정 예시

```bash
# 프로덕션 환경
TOAST_URL=https://app.toast.sh

# 개발 환경 (로컬 서버 사용 시)
TOAST_URL=http://localhost:3000
```

## 환경별 설정 예시

### 개발 환경 (.env.development)

```bash
CLIENT_ID=development_client_id
CLIENT_SECRET=development_client_secret
TOAST_URL=http://localhost:3000
TOKEN_EXPIRES_IN=86400
```

### 프로덕션 환경 (.env.production)

```bash
CLIENT_ID=production_client_id
CLIENT_SECRET=production_client_secret
TOAST_URL=https://app.toast.sh
TOKEN_EXPIRES_IN=0
```

### 테스트 환경 (.env.test)

```bash
CLIENT_ID=test_client_id
CLIENT_SECRET=test_client_secret
TOAST_URL=http://localhost:3000
TOKEN_EXPIRES_IN=3600
```

## 보안 고려사항

1. **민감한 정보 보호**:
   - `.env` 파일을 `.gitignore`에 추가
   - `CLIENT_SECRET`은 절대 공개 저장소에 커밋하지 않음
   - 프로덕션 환경에서는 시스템 환경 변수 사용 권장

2. **환경별 분리**:
   - 개발, 테스트, 프로덕션 환경별로 다른 클라이언트 ID/시크릿 사용
   - 각 환경에 맞는 TOAST_URL 설정

3. **기본값 설정**:
   - 필수 변수가 없을 때 명확한 오류 메시지 표시
   - TOKEN_EXPIRES_IN은 기본값 제공

## 문제 해결

### 환경 변수가 인식되지 않는 경우

1. `.env` 파일 위치 확인: `src/main/config/.env`
2. 파일 인코딩 확인: UTF-8
3. 변수명에 공백이나 특수문자 없는지 확인
4. 애플리케이션 재시작

### 인증 오류가 발생하는 경우

1. `CLIENT_ID`와 `CLIENT_SECRET` 값 확인
2. Toast 웹 서비스에서 발급받은 정확한 값인지 확인
3. 환경별로 올바른 클라이언트 정보 사용 여부 확인

### 토큰 관련 문제

1. `TOKEN_EXPIRES_IN` 값이 올바른 형식인지 확인 (숫자)
2. 무기한 토큰 설정 시 0 또는 음수 값 사용
3. 토큰 만료 시간이 너무 짧지 않은지 확인

## 관련 문서

- [개발 가이드](./DEVELOPMENT.md) - 개발 환경 설정
- [클라우드 동기화](./CLOUD_SYNC.md) - 동기화 관련 환경 변수
- [구성 스키마](./CONFIG_SCHEMA.md) - 애플리케이션 구성 옵션
