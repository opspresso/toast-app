# Toast App 창 표시/숨김 동작 기술 문서

## 1. 개요

이 문서는 Toast App의 창 표시 및 숨김 메커니즘에 대한 상세한 기술 설명을 제공합니다. Toast App은 Electron 기반 생산성 도구로, 사용자가 정의한 단축키로 실행되는 다양한 액션을 제공합니다. 이 문서에서는 앱의 메인 창이 언제 나타나고 숨겨지는지에 대한 동작 방식과, 이를 제어하는 설정에 대해 다룹니다.

## 2. 창 표시/숨김 동작 요약

Toast App은 다음과 같은 상황에서 창을 표시합니다:
- 전역 단축키(기본값: Alt+Space)가 눌렸을 때
- 토스트 표시 API 호출 시
- 시스템 트레이 아이콘 메뉴에서 "Show Toast" 옵션 선택 시

창은 다음 상황에서 자동으로 또는 명시적으로 숨겨집니다:
- 창이 포커스를 잃을 때 (설정에 따라)
- ESC 키를 누를 때 (설정에 따라)
- 버튼 액션 실행 후 (설정에 따라)
- 토스트 닫기 버튼 클릭 시
- 전역 단축키 토글 시

특정 상황에서는 창 숨김이 방지됩니다:
- 모달 창이 열려있을 때
- 로그인 프로세스가 진행 중일 때
- 특정 설정이 비활성화되었을 때

## 3. 창이 숨겨지는 상황

### 3.1 포커스 손실 (Blur 이벤트)

사용자가 다른 창으로 포커스를 옮기면 토스트 창이 숨겨집니다. 이는 `windows.js` 파일에서 다음과 같이 구현되어 있습니다:

```javascript
toastWindow.on('blur', () => {
  const hideOnBlur = config.get('advanced.hideOnBlur');
  const loginInProgress = isLoginProcessActive();

  if (loginInProgress) {
    return;
  }

  if (hideOnBlur !== false && !isModalOpened()) {
    toastWindow.webContents.send('before-hide');
    toastWindow.hide();
  }
});
```

다음 조건이 모두 충족될 때 창이 숨겨집니다:
- `advanced.hideOnBlur` 설정이 활성화됨 (기본값: true)
- 로그인 프로세스가 진행 중이 아님
- 모달이 열려있지 않음

### 3.2 ESC 키 입력

사용자가 ESC 키를 누르면 창이 숨겨집니다. 이는 렌더러 프로세스에서 키보드 이벤트 핸들러를 통해 처리됩니다:

```javascript
// 렌더러 프로세스의 키보드 이벤트 처리
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!buttonEditModal.classList.contains('show') && !profileModal.classList.contains('show')) {
      window.toast.hideWindow();
    }
  }
});
```

다음 조건이 충족될 때 창이 숨겨집니다:
- `advanced.hideOnEscape` 설정이 활성화됨 (기본값: true)
- 모달이 열려있지 않음
- 설정 모드에서는 ESC가 설정 모드 토글에 사용됨

### 3.3 버튼 액션 실행 후

버튼 액션이 성공적으로 완료된 후 창이 자동으로 숨겨집니다:

```javascript
function executeButton(button) {
  // ... 액션 실행 코드 ...

  window.toast.executeAction(action)
    .then(result => {
      if (result.success) {
        // 성공 처리
        if (window.toast.config.get('advanced.hideAfterAction')) {
          window.toast.hideWindow();
        }
      } else {
        // 실패 처리
      }
    });
}
```

다음 조건이 충족될 때 창이 숨겨집니다:
- `advanced.hideAfterAction` 설정이 활성화됨 (기본값: true)
- 버튼 액션이 성공적으로 완료됨

### 3.4 전역 단축키 토글

전역 단축키는 창을 토글하는 기능을 합니다. 창이 표시되어 있을 때 같은 단축키를 누르면 창이 숨겨집니다:

```javascript
function toggleToastWindow(toastWindow) {
  if (!toastWindow) {
    console.error('Toast window not available');
    return;
  }

  if (toastWindow.isVisible()) {
    toastWindow.hide();
  } else {
    // 창 표시 로직...
  }
}
```

### 3.5 명시적 호출

다음과 같은 명시적 호출로 창이 숨겨질 수 있습니다:
- 닫기 버튼 클릭 시 `window.toast.hideWindow()` 호출
- IPC 채널을 통한 `hide-toast` 이벤트 발생 시
- 메인 프로세스에서 `hideToastWindow()` 함수 직접 호출 시

## 4. 창이 숨겨지지 않는 예외 상황

### 4.1 모달 창이 열려있을 때

모달 창이 열려있는 경우 토스트 창은 숨겨지지 않습니다. 이는 `ipc.js`에서 모달 상태를 추적하여 구현되어 있습니다:

```javascript
let isModalOpen = false;

function isModalOpened() {
  return isModalOpen;
}

ipcMain.on('modal-state-changed', (event, open) => {
  isModalOpen = open;
  console.log('Modal state changed:', isModalOpen ? 'open' : 'closed');
});
```

렌더러 프로세스에서는 모달이 열리거나 닫힐 때 이 상태를 업데이트합니다:

```javascript
function editButtonSettings(button) {
  // ... 버튼 편집 모달을 열고 설정하는 코드 ...

  // 메인 프로세스에 모달이 열렸음을 알림
  window.toast.setModalOpen(true);

  // 모달 표시
  buttonEditModal.classList.add('show');
}

function closeButtonEditModal() {
  // 메인 프로세스에 모달이 닫혔음을 알림
  window.toast.setModalOpen(false);

  buttonEditModal.classList.remove('show');
}
```

이러한 방식으로 다음 모달이 열렸을 때 창 숨김이 방지됩니다:
- 버튼 편집 모달
- 사용자 프로필 모달
- 기타 애플리케이션 모달

### 4.2 로그인 진행 중일 때

OAuth 인증 과정과 같이 로그인이 진행 중일 때는 창이 숨겨지지 않습니다:

```javascript
// windows.js
const loginInProgress = isLoginProcessActive();

if (loginInProgress) {
  return;
}
```

로그인 상태는 `auth.js`와 `auth-manager.js`에서 관리되며, 인증 토큰 교환 과정이 완료될 때까지 유지됩니다.

### 4.3 설정에 따른 예외

사용자가 특정 설정을 비활성화한 경우 해당 동작으로 인한 창 숨김이 발생하지 않습니다:

- `advanced.hideOnBlur`: false로 설정 시 창이 포커스를 잃어도 숨겨지지 않음
- `advanced.hideOnEscape`: false로 설정 시 ESC 키를 눌러도 숨겨지지 않음
- `advanced.hideAfterAction`: false로 설정 시 액션 실행 후에도 숨겨지지 않음

### 4.4 설정 모드에서 ESC 키 다른 용도로 사용 시

설정 모드에서는 ESC 키가 창을 숨기는 대신 설정 모드를 종료하는 데 사용됩니다:

```javascript
// src/renderer/pages/toast/index.js에서
case 'Escape':
  // Exit edit mode when ESC key is pressed in settings mode
  // Note: Modal closing is handled separately when modal is open
  if (isSettingsMode && !buttonEditModal.classList.contains('show')) {
    event.preventDefault();
    toggleSettingsMode();
  }
  break;
```

이 경우 창은 ESC 키 입력에도 불구하고 계속 표시됩니다.

## 5. 관련 설정 옵션

Toast App의 창 표시/숨김 동작은 `config.js`에 정의된 다음 설정을 통해 사용자가 제어할 수 있습니다:

```javascript
advanced: {
  type: 'object',
  properties: {
    launchAtLogin: {
      type: 'boolean',
      default: false
    },
    hideAfterAction: {
      type: 'boolean',
      default: true
    },
    hideOnBlur: {
      type: 'boolean',
      default: true
    },
    hideOnEscape: {
      type: 'boolean',
      default: true
    },
    showInTaskbar: {
      type: 'boolean',
      default: false
    }
  },
  default: {
    launchAtLogin: false,
    hideAfterAction: true,
    hideOnBlur: true,
    hideOnEscape: true,
    showInTaskbar: false
  }
}
```

### 설정 항목 설명

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `hideAfterAction` | `true` | 버튼 액션 실행 후 창 자동 숨김 여부 |
| `hideOnBlur` | `true` | 창이 포커스를 잃을 때 창 자동 숨김 여부 |
| `hideOnEscape` | `true` | ESC 키 입력 시 창 숨김 여부 |
| `showInTaskbar` | `false` | 시스템 작업 표시줄에 앱 표시 여부 |
| `launchAtLogin` | `false` | 시스템 시작 시 앱 자동 실행 여부 |

## 6. 결론

Toast App의 창 표시/숨김 메커니즘은 사용자 경험을 최적화하기 위해 다양한 조건을 고려합니다. 기본적으로 앱은 다음 원칙을 따릅니다:

1. **최소 간섭**: 사용하지 않을 때는 자동으로 숨겨져서 작업 공간을 차지하지 않음
2. **콘텍스트 인식**: 모달이 열려 있거나 로그인 중일 때는 예외적으로 표시 상태 유지
3. **사용자 제어**: 설정을 통해 동작 방식 커스터마이징 가능

이러한 동작은 사용자가 빠르게 앱에 접근하여 필요한 작업을 수행하고, 더 이상 필요하지 않을 때는 자동으로 사라지게 함으로써 원활한 작업 흐름을 제공합니다.
