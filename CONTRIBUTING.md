# Toast 앱에 기여하기

Toast 앱에 기여하는 데 관심을 가져주셔서 감사합니다! 이 문서는 프로젝트에 기여하기 위한 가이드라인과 지침을 제공합니다.

## 목차

- [행동 강령](#행동-강령)
- [시작하기](#시작하기)
- [개발 환경](#개발-환경)
- [프로젝트 구조](#프로젝트-구조)
- [워크플로우](#워크플로우)
- [풀 리퀘스트 프로세스](#풀-리퀘스트-프로세스)
- [코딩 표준](#코딩-표준)
- [테스팅](#테스팅)
- [문서화](#문서화)
- [이슈 보고](#이슈-보고)
- [기능 요청](#기능-요청)
- [커뮤니티](#커뮤니티)

## 행동 강령

이 프로젝트와 참여하는 모든 사람은 [행동 강령](CODE_OF_CONDUCT.md)에 의해 관리됩니다. 참여함으로써 이 코드를 준수할 것으로 기대됩니다. 용납할 수 없는 행동은 [project-email@example.com](mailto:project-email@example.com)으로 신고해 주세요.

## 시작하기

### 필수 조건

- Node.js (v16 이상)
- npm (v7 이상) 또는 yarn
- Git
- Electron, JavaScript 및 데스크톱 애플리케이션 개발에 대한 기본 지식

### 포크 및 클론

1. GitHub에서 저장소를 포크합니다
2. 로컬에 포크를 클론합니다:
   ```
   git clone https://github.com/YOUR-USERNAME/toast-app.git
   cd toast-app
   ```

3. 원본 저장소를 업스트림 원격으로 추가합니다:
   ```
   git remote add upstream https://github.com/opspresso/toast-app.git
   ```

4. 의존성을 설치합니다:
   ```
   npm install
   ```

5. 개발 서버를 시작합니다:
   ```
   npm run dev
   ```

## 개발 환경

### 권장 도구

- 다음 확장 기능이 있는 **Visual Studio Code**:
  - ESLint
  - Prettier
  - Debugger for Chrome/Electron
  - Jest
- 디버깅을 위한 **Chrome DevTools**
- 버전 관리를 위한 **Git**

### 환경 설정

1. 권장 도구 설치
2. 에디터에서 ESLint 및 Prettier 구성
3. 개발 환경 설정:
   ```
   npm run setup-dev
   ```

### 애플리케이션 실행

- **개발 모드**:
  ```
  npm run dev
  ```

- **프로덕션 빌드**:
  ```
  npm run build
  ```

- **테스팅**:
  ```
  npm run test
  ```

## 프로젝트 구조

프로젝트 구조에 대한 자세한 개요는 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) 문서를 참조하세요.

주요 디렉토리:
- `src/` - 소스 코드
  - `main/` - 메인 프로세스 코드
  - `renderer/` - 렌더러 프로세스 코드
  - `common/` - 공유 코드
- `assets/` - 정적 자산
- `build/` - 빌드 구성
- `tests/` - 테스트 파일

## 워크플로우

우리는 기능 브랜치 워크플로우를 따릅니다:

1. 포크가 최신 상태인지 확인:
   ```
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. 기능 또는 버그 수정을 위한 새 브랜치 생성:
   ```
   git checkout -b feature/your-feature-name
   ```
   또는
   ```
   git checkout -b fix/issue-number-description
   ```

3. [코딩 표준](#코딩-표준)을 따라 변경 사항 적용

4. 명확하고 설명적인 커밋 메시지로 변경 사항 커밋:
   ```
   git commit -m "feat: add new button type for custom scripts"
   ```
   또는
   ```
   git commit -m "fix: resolve global hotkey conflict on Windows"
   ```

5. 브랜치를 포크에 푸시:
   ```
   git push origin feature/your-feature-name
   ```

6. 브랜치에서 메인 저장소로 풀 리퀘스트 생성

## 풀 리퀘스트 프로세스

1. 코드가 [코딩 표준](#코딩-표준)을 따르는지 확인
2. 필요에 따라 문서 업데이트
3. 새 기능 또는 버그 수정에 대한 테스트 포함
4. 모든 테스트가 통과하는지 확인
5. 풀 리퀘스트 템플릿을 완전히 작성
6. 메인테이너로부터 리뷰 요청
7. 리뷰어의 피드백 반영
8. 승인되면 메인테이너가 풀 리퀘스트를 병합할 것입니다

## 코딩 표준

코드베이스 전체의 일관성을 유지하기 위해 코딩 표준 세트를 따릅니다:

### JavaScript/TypeScript

- 코드 포맷팅 및 린팅을 위해 ESLint 및 Prettier 사용
- Airbnb JavaScript 스타일 가이드 준수
- 적절한 곳에 ES6+ 기능 사용
- 비동기 코드에 async/await 사용
- JSDoc 주석으로 코드 문서화

### 커밋 메시지

[Conventional Commits](https://www.conventionalcommits.org/) 사양을 따릅니다:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

타입:
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드의 의미에 영향을 주지 않는 변경 사항
- `refactor`: 버그를 수정하거나 기능을 추가하지 않는 코드 변경
- `perf`: 성능 개선
- `test`: 테스트 추가 또는 수정
- `chore`: 빌드 프로세스 또는 보조 도구의 변경 사항

예시:
```
feat(button): add new script action type
fix(shortcut): resolve global hotkey conflict on Windows
docs: update README with new features
```

### 코드 품질

- 명확한 변수 및 함수 이름으로 자체 문서화 코드 작성
- 함수는 작고 단일 책임에 집중
- 깊은 조건문 및 루프 중첩 피하기
- 복잡한 로직을 설명하는 의미 있는 주석 사용
- 적절하게 오류 처리
- 코드 중복 피하기

## 테스팅

단위 및 통합 테스트에 Jest를 사용합니다. 코드에 적절한 테스트가 포함되어 있는지 확인하세요:

### 테스트 작성

- 테스트를 `tests/` 디렉토리에 배치
- 테스트 파일 이름을 `.test.js` 또는 `.spec.js` 접미사로 지정
- 소스 코드의 구조를 반영하도록 테스트 구성
- 성공과 실패 사례 모두를 위한 테스트 작성
- 필요에 따라 외부 종속성 모킹

### 테스트 실행

```
# 모든 테스트 실행
npm run test

# 커버리지가 있는 테스트 실행
npm run test:coverage

# 감시 모드에서 테스트 실행
npm run test:watch

# 특정 테스트 실행
npm run test -- -t "test name pattern"
```

### 테스트 커버리지

특히 중요한 컴포넌트에 대해 높은 테스트 커버리지를 목표로 합니다:
- 핵심 기능은 80%+ 커버리지
- 중요 경로는 100% 커버리지
- UI 컴포넌트는 적절한 스냅샷 또는 상호 작용 테스트

## 문서화

좋은 문서화는 프로젝트의 성공에 중요합니다:

### 코드 문서화

- 함수, 클래스 및 복잡한 코드에 JSDoc 주석 사용
- 매개변수 및 반환 유형 설명 포함
- 예외 및 경계 사례 문서화

### 프로젝트 문서화

- 새 기능이나 변경 사항으로 README.md 업데이트
- 인터페이스 변경 시 API 문서 업데이트
- 새 기능에 대한 예제 추가
- 사용자 가이드 최신 상태 유지

### 문서 파일

- `README.md`: 프로젝트 개요 및 빠른 시작
- `ARCH_OVERVIEW.md`: 시스템 설계 및 컴포넌트
- `API_DOCUMENTATION.md`: API 참조
- `GUIDE_USER.md`: 사용자 지침
- `CONTRIBUTING.md`: 기여 가이드라인(이 파일)

## 이슈 보고

### 버그 보고서

버그를 보고할 때는 다음을 포함하세요:

1. 명확하고 설명적인 제목
2. 이슈를 재현하는 단계
3. 예상 동작
4. 실제 동작
5. 해당되는 경우 스크린샷
6. 환경 정보:
   - 운영 체제 및 버전
   - Toast 앱 버전
   - Node.js 버전
   - 관련 시스템 정보

새 이슈를 만들 때 버그 보고서 템플릿을 사용하세요.

### 보안 이슈

보안 이슈의 경우 공개 이슈를 만들지 마세요. 대신 취약점에 대한 세부 정보와 함께 [security@toast-app.example.com](mailto:security@toast-app.example.com)로 이메일을 보내주세요.

## 기능 요청

기능 요청을 환영합니다! 새로운 기능을 제안할 때:

1. 기능이 이미 제안되거나 구현되었는지 확인
2. 기능 요청 템플릿 사용
3. 기능이 해결할 문제를 명확하게 설명
4. 가능하면 해결책 제안
5. 기능이 어떻게 사용될지 예제 제공

## 커뮤니티

### 커뮤니케이션 채널

- **GitHub Issues**: 버그 보고서 및 기능 요청용
- **GitHub Discussions**: 일반적인 질문 및 토론용
- **Discord**: 실시간 커뮤니케이션용(README에 링크)
- **메일링 리스트**: 공지 및 뉴스레터용

### 코드 리뷰

- 코드 리뷰에서 존중하고 건설적인 태도 유지
- 사람이 아닌 코드에 집중
- 제안된 변경 사항에 대한 이유 설명
- 대안적 접근 방식에 열려 있기

### 인정

우리는 크고 작은 모든 기여를 소중히 여깁니다. 기여자는 다음에서 인정받습니다:
- 프로젝트 README
- 릴리스 노트
- CONTRIBUTORS.md 파일

## 개발 팁

### 디버깅

- 빠른 디버깅을 위해 `console.log` 사용
- 더 복잡한 디버깅의 경우:
  ```javascript
  // 메인 프로세스에서
  const { app } = require('electron');
  app.on('ready', () => {
    const mainWindow = new BrowserWindow({
      webPreferences: {
        devTools: true
      }
    });
  });
  ```

- 렌더러 프로세스 디버깅에 Chrome DevTools 사용
- 메인 프로세스 디버깅에 VS Code의 디버거 사용

### 일반적인 이슈

- **글로벌 단축키 등록**: 플랫폼별 차이점을 처리하고 있는지 확인
- **IPC 통신**: 채널이 올바르게 명명되고 핸들러가 등록되어 있는지 확인
- **윈도우 관리**: 윈도우 참조 및 수명 주기 이벤트에 주의
- **구성**: 구성 손상을 방지하기 위해 사용자 입력 검증

### 성능 고려 사항

- 메인 프로세스 작업량 최소화
- 대규모 데이터 전송에 IPC 사용 최소화
- 부드러운 UI를 위해 렌더러 프로세스 최적화
- 특히 장기 실행 프로세스의 경우 메모리 사용량에 주의

## 라이선스

Toast 앱에 기여함으로써, 귀하의 기여가 프로젝트의 [MIT 라이선스](LICENSE)에 따라 라이선스 부여된다는 데 동의합니다.
