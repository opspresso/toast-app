# Toast 앱 테스팅 전략

이 문서는 Toast 앱의 테스팅 전략을 설명하며, 테스팅 접근 방식, 도구 및 모범 사례를 포함합니다.

> **현재 상태**: 테스트 인프라가 설정되어 있으며, 주요 기능에 대한 단위 테스트가 구현되어 있습니다.
> - ✅ Jest 설정 완료
> - ✅ 테스트 디렉토리 구조 생성
> - ✅ 27개 테스트 스위트, 789개 단위 테스트 구현됨
> - ✅ 모든 테스트 통과
> - ❌ 통합 테스트, E2E 테스트 미구현

## 목차

- [테스팅 목표](#테스팅-목표)
- [테스팅 수준](#테스팅-수준)
  - [단위 테스팅](#단위-테스팅)
  - [통합 테스팅](#통합-테스팅)
  - [엔드 투 엔드 테스팅](#엔드-투-엔드-테스팅)
  - [UI 컴포넌트 테스팅](#ui-컴포넌트-테스팅)
  - [접근성 테스팅](#접근성-테스팅)
  - [성능 테스팅](#성능-테스팅)
- [테스팅 환경](#테스팅-환경)
- [테스트 데이터 관리](#테스트-데이터-관리)
- [테스트 커버리지](#테스트-커버리지)
- [테스팅 모범 사례](#테스팅-모범-사례)
- [테스트 자동화](#테스트-자동화)
- [수동 테스팅](#수동-테스팅)
- [테스팅 일정](#테스팅-일정)
- [테스트 유지 관리](#테스트-유지-관리)

## 테스팅 목표

테스팅 전략의 주요 목표는 다음과 같습니다:

1. **기능 보장**: 모든 기능이 예상대로 작동하는지 확인
2. **회귀 방지**: 사용자에게 도달하기 전에 회귀를 포착
3. **품질 유지**: 코드 품질 및 성능 표준 유지
4. **크로스 플랫폼 호환성**: 플랫폼 간 일관된 동작 보장
5. **사용자 경험**: 애플리케이션이 좋은 사용자 경험을 제공하는지 검증

## 테스팅 수준

### 단위 테스팅

단위 테스트는 개별 컴포넌트와 함수를 격리된 상태에서 테스트하는 데 중점을 둡니다.

#### 범위

- 구성 관리 함수
- 액션 실행 로직
- 유틸리티 함수
- 데이터 유효성 검사

#### 도구

- **Jest**: 주요 테스팅 프레임워크

#### 단위 테스트 예시

```javascript
// Testing the validateAction function in executor.js
describe('validateAction', () => {
  it('should validate a valid exec action', async () => {
    const action = {
      action: 'exec',
      command: 'echo "Hello, world!"'
    };

    const result = await validateAction(action);
    expect(result.valid).toBe(true);
  });

  it('should invalidate an exec action without a command', async () => {
    const action = {
      action: 'exec'
    };

    const result = await validateAction(action);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Command is required');
  });
});
```

### 통합 테스팅

통합 테스트는 애플리케이션의 다른 부분들이 올바르게 함께 작동하는지 확인합니다.

#### 범위

- IPC 통신
- 윈도우 관리
- 구성 지속성
- 액션 실행 흐름

#### 도구

- **Jest**: 테스팅 프레임워크
- **Mock-FS**: 파일 시스템 모의를 위한 도구 (필요시 추가 설치)

#### 통합 테스트 예시

```javascript
// Testing the executeAction flow
describe('Action Execution Flow', () => {
  it('should execute a command and return the result', async () => {
    const { executeAction } = require('../src/main/executor');

    const result = await executeAction({
      action: 'exec',
      command: 'echo "Test"'
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('Test');
  });
});
```

### 엔드 투 엔드 테스팅

엔드 투 엔드 테스트는 완전한 사용자 흐름과 시나리오를 검증합니다.

#### 범위

- 애플리케이션 시작 및 초기화
- 전역 단축키 등록
- Toast 윈도우 표시 및 상호작용
- 설정 윈도우 기능
- 버튼 생성 및 관리
- UI에서 액션 실행

#### 도구

- **Jest**: 테스팅 프레임워크
- **Electron Testing Library**: UI 테스팅을 위한 도구 (필요시 추가 설치)

#### 엔드 투 엔드 테스트 예시

```javascript
// Testing the global hotkey functionality
describe('Global Hotkey', () => {
  it('should register global shortcuts', () => {
    const { registerGlobalShortcuts } = require('../src/main/shortcuts');
    const mockConfig = { get: jest.fn().mockReturnValue('Alt+Space') };
    const mockWindows = { toast: { show: jest.fn() } };

    const result = registerGlobalShortcuts(mockConfig, mockWindows);
    expect(result).toBe(true);
  });
});
```

### UI 컴포넌트 테스팅

UI 컴포넌트 테스트는 UI 컴포넌트의 동작과 외관에 초점을 맞춥니다.

#### 범위

- Toast 윈도우 컴포넌트
- 설정 윈도우 컴포넌트
- 버튼 렌더링
- 폼 컨트롤
- 대화 상자

#### 도구

- **Jest**: 테스팅 프레임워크
- **JSDOM**: DOM 환경 시뮬레이션

#### UI 컴포넌트 테스트 예시

```javascript
// Testing the Button component
describe('Button Component', () => {
  it('should render a button with the correct properties', async () => {
    // Set up the test environment
    document.body.innerHTML = `<div id="test-container"></div>`;
    const container = document.getElementById('test-container');

    // Create a button
    const button = createButtonElement({
      name: 'Test Button',
      shortcut: 'T',
      icon: '🔘',
      action: 'exec',
      command: 'echo "Test"'
    });

    // Add the button to the container
    container.appendChild(button);

    // Check the button properties
    expect(button.querySelector('.button-name').textContent).toBe('Test Button');
    expect(button.querySelector('.button-shortcut').textContent).toBe('T');
    expect(button.querySelector('.button-icon').textContent).toBe('🔘');
  });
});
```

### 접근성 테스팅

접근성 테스트는 애플리케이션이 장애가 있는 사람들도 사용할 수 있는지 확인합니다.

#### 범위

- 키보드 탐색
- 스크린 리더 호환성
- 색상 대비
- 포커스 관리

#### 도구

- **Jest**: 기본 테스팅 프레임워크
- **수동 테스팅**: 스크린 리더 및 키보드 탐색을 통한 테스트

#### 접근성 테스트 예시

```javascript
// Testing keyboard navigation in the Toast window
describe('Keyboard Navigation', () => {
  it('should allow navigating between buttons using arrow keys', async () => {
    // Set up the test environment
    document.body.innerHTML = `
      <div id="buttons-container">
        <div class="toast-button" tabindex="0">Button 1</div>
        <div class="toast-button" tabindex="0">Button 2</div>
        <div class="toast-button" tabindex="0">Button 3</div>
      </div>
    `;

    // Focus the first button
    const buttons = document.querySelectorAll('.toast-button');
    buttons[0].focus();

    // Simulate pressing the down arrow key
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    document.dispatchEvent(event);

    // Check if the second button is focused
    expect(document.activeElement).toBe(buttons[1]);
  });
});
```

### 성능 테스팅

성능 테스트는 애플리케이션의 리소스 사용량과 응답성을 측정합니다.

#### 범위

- 시작 시간
- 메모리 사용량
- CPU 사용량
- 액션 실행 시간
- UI 응답성

#### 도구

- **Jest**: 성능 테스트를 위한 기본 프레임워크
- **Performance API**: 시간 측정을 위한 API
- **사용자 정의 모니터링**: 리소스 사용량 추적을 위한 도구

#### 성능 테스트 예시

```javascript
// Testing function performance
describe('Performance Tests', () => {
  it('should execute actions quickly', async () => {
    const { executeAction } = require('../src/main/executor');
    const startTime = performance.now();

    await executeAction({
      action: 'exec',
      command: 'echo "Performance test"'
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(executionTime).toBeLessThan(1000); // 1초 미만
  });
});
```

## 테스팅 환경

### 개발 환경

- **로컬 테스팅**: 개발자가 코드를 커밋하기 전에 로컬에서 테스트 실행
- **사전 커밋 훅**: 커밋 전에 린팅 및 단위 테스트 자동 실행
- **감시 모드**: 파일 변경 시 테스트 자동 실행

### 지속적 통합 환경

- **GitHub Actions**: 모든 푸시 및 풀 요청에서 테스트 실행
- **매트릭스 테스팅**: 여러 플랫폼(macOS, Windows, Linux)에서 테스트
- **커버리지 보고서**: 테스트 커버리지 생성 및 추적

### 프로덕션 유사 환경

- **패키지된 앱 테스팅**: 패키지된 애플리케이션 테스트
- **사용자 수용 테스팅**: 릴리스 후보에 대한 수동 테스트
- **베타 테스팅**: 실제 사용 피드백을 위해 베타 테스터에게 배포

## 테스트 데이터 관리

### 테스트 픽스처

- **구성 픽스처**: 미리 정의된 구성 객체
- **액션 픽스처**: 다양한 유형의 샘플 액션
- **모의 파일 시스템**: 파일 작업 테스트를 위한 가상 파일 시스템

### 테스트 더블

- **모의 객체**: 외부 의존성을 제어된 구현으로 대체
- **스텁**: 메서드 호출에 대한 미리 정의된 응답 제공
- **스파이**: 메서드 호출 및 인수 추적

## 테스트 커버리지

다음과 같은 테스트 커버리지 목표를 설정합니다:

- **단위 테스트**: 80% 코드 커버리지
- **통합 테스트**: 모든 중요 경로 포함
- **E2E 테스트**: 모든 주요 사용자 시나리오 포함

커버리지는 Jest의 커버리지 리포터를 사용하여 측정하고 CI에서 추적합니다.

## 테스팅 모범 사례

### 일반 사례

1. **테스트 격리**: 테스트는 서로 의존하지 않아야 함
2. **결정적 테스트**: 테스트는 매번 동일한 결과를 산출해야 함
3. **빠른 테스트**: 테스트는 빠르게 실행되어 빈번한 테스팅을 장려해야 함
4. **읽기 쉬운 테스트**: 테스트는 이해하고 유지 관리하기 쉬워야 함

### Electron 특정 사례

1. **메인 프로세스 테스팅**: 메인 프로세스 모듈을 격리된 상태에서 테스트
2. **렌더러 프로세스 테스팅**: 렌더러 프로세스 코드를 브라우저와 유사한 환경에서 테스트
3. **IPC 테스팅**: 프로세스 간 통신 테스트를 위한 IPC 채널 모의
4. **윈도우 관리**: 윈도우 생성, 표시, 숨기기 및 위치 지정 테스트

## 테스트 자동화

### 지속적 통합

- **풀 요청 검사**: 모든 풀 요청에서 테스트 실행
- **브랜치 보호**: 병합 전 테스트 통과 요구
- **예약된 테스트**: 야간에 전체 테스트 스위트 실행

### 테스트 보고

- **테스트 결과**: CI 통합을 위한 JUnit XML 보고서 생성
- **커버리지 보고서**: HTML 및 JSON 커버리지 보고서 생성
- **테스트 대시보드**: 테스트 결과 및 추세 시각화

## 수동 테스팅

자동화된 테스팅에도 불구하고, 일부 측면은 수동 테스팅이 필요합니다:

1. **사용자 경험**: UI 및 상호작용의 주관적 측면
2. **플랫폼별 동작**: 플랫폼 간 미묘한 차이
3. **전역 단축키 테스팅**: 시스템 수준 키보드 단축키
4. **설치 테스팅**: 패키지 설치 프로세스

## 테스팅 일정

- **커밋 전**: 린팅 및 단위 테스트
- **풀 요청**: 단위, 통합 및 선택된 E2E 테스트
- **야간**: 성능 테스트를 포함한 전체 테스트 스위트
- **릴리스 후보**: 수동 테스팅을 포함한 전체 테스트 스위트
- **릴리스 후**: 배포 확인을 위한 스모크 테스트

## 테스트 유지 관리

- **테스트 리팩터링**: 테스트를 유지 관리 가능하게 유지하기 위해 정기적으로 리팩터링
- **테스트 검토**: 코드 검토 중 테스트 검토
- **테스트 문서화**: 테스팅 접근 방식 및 패턴 문서화
- **테스트 부채**: 테스트 기술 부채 추적 및 해결
