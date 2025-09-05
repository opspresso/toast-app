# Toast 앱 기술 스택

## 핵심 기술

- **프레임워크**: Electron v35+ (Node.js + Chromium)
- **런타임**: Node.js v16+
- **패키지 매니저**: npm
- **빌드 시스템**: electron-builder
- **테스팅**: 커버리지 리포팅이 포함된 Jest
- **코드 품질**: ESLint + Prettier

## 주요 의존성

### 프로덕션
- **electron-store**: 설정 지속성
- **electron-log**: 중앙화된 로깅 시스템
- **electron-updater**: GitHub 릴리스를 통한 자동 업데이트 기능
- **axios**: API 통신용 HTTP 클라이언트
- **dotenv**: 환경 변수 관리
- **uuid**: 고유 식별자 생성
- **yaml**: 설정용 YAML 파싱

### 개발
- **@electron/notarize**: macOS 앱 공증
- **electron-builder-notarize**: 빌드 시 공증 통합

## 아키텍처 패턴

- **메인 프로세스**: 핵심 비즈니스 로직, 시스템 통합, IPC 핸들러
- **렌더러 프로세스**: 컨텍스트 격리가 있는 UI 컴포넌트
- **프리로드 스크립트**: 메인과 렌더러 프로세스 간 보안 IPC 브리지

## 공통 명령어

### 개발
```bash
npm run dev          # 핫 리로드가 있는 개발 모드 시작
npm run dev:win      # Windows 개발 모드
```

### 빌드
```bash
npm run build        # 현재 플랫폼용 빌드
npm run build:mac    # macOS DMG 및 ZIP 빌드
npm run build:win    # Windows NSIS 및 포터블 빌드
npm run build:mas    # Mac App Store용 빌드
```

### 테스팅 및 품질
```bash
npm test             # Jest 테스트 스위트 실행
npm run lint         # ESLint 코드 분석
npm run format       # Prettier 코드 포맷팅
```

## 빌드 설정

- **출력 디렉토리**: `dist/`
- **앱 ID**: `com.opspresso.toast-app`
- **자동 업데이트**: ZIP(macOS) 및 NSIS(Windows)가 있는 GitHub 릴리스
- **코드 서명**: 권한이 있는 macOS 공증
- **플랫폼**: macOS (DMG/ZIP), Windows (NSIS/Portable), Linux (AppImage/DEB)

## 환경 설정

1. 저장소 클론
2. `npm install` - 의존성 설치
3. `src/main/config/`에 `.env` 파일 생성 (`.env.example` 참조)
4. `npm run dev` - 개발 서버 시작

## 로깅 시스템

- **라이브러리**: 파일 로테이션이 있는 electron-log (5MB 제한, 최대 5개 파일)
- **위치**:
  - macOS: `~/Library/Logs/Toast/`
  - Windows: `%USERPROFILE%\AppData\Roaming\Toast\logs\`
  - Linux: `~/.config/Toast/logs/`
- **사용법**: `createLogger('ModuleName')`을 통한 모듈별 로거
