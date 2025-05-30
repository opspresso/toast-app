# Toast 앱 사용자 정의 스크립트

이 문서는 Toast 앱에서 사용자 정의 스크립트를 생성, 사용 및 관리하는 방법과 사용자 보호를 위해 구현된 보안 모델을 설명합니다.

## 목차

- [개요](#개요)
- [지원되는 스크립트 유형](#지원되는-스크립트-유형)
  - [JavaScript](#javascript)
  - [AppleScript (macOS 전용)](#applescript-macos-전용)
  - [PowerShell (Windows 전용)](#powershell-windows-전용)
  - [Bash/Shell](#bashshell)
- [사용자 정의 스크립트 생성](#사용자-정의-스크립트-생성)
  - [스크립트 편집기](#스크립트-편집기)
  - [스크립트 테스트](#스크립트-테스트)
  - [스크립트 버튼 구성](#스크립트-버튼-구성)
- [스크립트 실행 환경](#스크립트-실행-환경)
  - [환경 변수](#환경-변수)
  - [실행 컨텍스트](#실행-컨텍스트)
  - [출력 처리](#출력-처리)
  - [오류 처리](#오류-처리)
- [보안 모델](#보안-모델)
  - [샌드박싱](#샌드박싱)
  - [권한](#권한)
  - [입력 검증](#입력-검증)
  - [스크립트 검증](#스크립트-검증)
- [스크립트 예시](#스크립트-예시)
  - [JavaScript 예시](#javascript-예시)
  - [AppleScript 예시](#applescript-예시)
  - [PowerShell 예시](#powershell-예시)
  - [Bash/Shell 예시](#bashshell-예시)
- [모범 사례](#모범-사례)
- [문제 해결](#문제-해결)
- [고급 사용법](#고급-사용법)
  - [외부 API 작업](#외부-api-작업)
  - [영구 데이터 저장](#영구-데이터-저장)
  - [스크립트 간 통신](#스크립트-간-통신)
- [보안 고려사항](#보안-고려사항)

## 개요

Toast 앱은 사용자가 내장 액션을 넘어서 기능을 확장할 수 있도록 사용자 정의 스크립트를 생성하고 실행할 수 있게 해줍니다. 사용자 정의 스크립트는 워크플로우를 자동화하고, 외부 시스템과 상호작용하거나, Toast 인터페이스를 통해 접근 가능한 사용자 정의 도구를 만들 수 있습니다.

## 지원되는 스크립트 유형

Toast 앱은 각각 고유한 기능과 제한사항을 가진 여러 스크립트 유형을 지원합니다:

### JavaScript

JavaScript 스크립트는 Electron 메인 프로세스 내의 Node.js 환경에서 실행됩니다.

- **기능**:
  - Node.js API 및 모듈에 대한 전체 액세스
  - 포함된 모듈에 대해 `require()` 사용 가능
  - async/await 지원
  - Promise 기반 반환 값

- **제한사항**:
  - DOM이나 렌더러 프로세스를 직접 조작할 수 없음
  - 특정 작업에 대한 보안 제한
  - 플랫폼별 API에 대한 제한된 액세스

예시:
```javascript
// 랜덤 명언 반환
const quotes = [
  "미래를 예측하는 가장 좋은 방법은 그것을 발명하는 것이다.",
  "코드는 유머와 같다. 설명해야 한다면, 그것은 나쁜 것이다.",
  "프로그래밍은 당신이 아는 것에 관한 것이 아니라, 당신이 알아낼 수 있는 것에 관한 것이다."
];

const randomIndex = Math.floor(Math.random() * quotes.length);
return quotes[randomIndex];
```

### AppleScript (macOS 전용)

AppleScript는 macOS에서 자동화를 가능하게 하여 시스템 서비스 및 애플리케이션과 상호작용할 수 있습니다.

- **기능**:
  - macOS 애플리케이션 및 서비스 제어
  - 시스템 자동화
  - UI 스크립팅 기능

- **제한사항**:
  - macOS 전용
  - 보안 권한이 필요할 수 있음
  - 제한된 오류 보고

예시:
```applescript
-- 현재 볼륨 레벨 가져오기
set currentVolume to output volume of (get volume settings)
return "현재 볼륨: " & currentVolume & "%"
```

### PowerShell (Windows 전용)

PowerShell 스크립트는 Windows 시스템에서 강력한 자동화 기능을 제공합니다.

- **기능**:
  - Windows 시스템 자동화
  - 풍부한 객체 모델
  - .NET 프레임워크 액세스

- **제한사항**:
  - Windows 전용
  - 실행 정책 고려사항
  - 특정 작업에 대해 관리자 권한이 필요할 수 있음

예시:
```powershell
# 시스템 가동 시간 가져오기
$os = Get-WmiObject win32_operatingsystem
$uptime = (Get-Date) - ($os.ConvertToDateTime($os.LastBootUpTime))
"시스템 가동 시간: {0}일 {1}시간 {2}분" -f $uptime.Days, $uptime.Hours, $uptime.Minutes
```

### Bash/Shell

Bash/Shell 스크립트는 기본 시스템 셸에서 실행되어 크로스 플랫폼 명령줄 작업을 가능하게 합니다.

- **기능**:
  - 크로스 플랫폼 (플랫폼별 고려사항 포함)
  - 명령줄 유틸리티에 직접 액세스
  - 명령줄 사용자에게 친숙한 구문

- **제한사항**:
  - 플랫폼별 동작
  - 제한된 오류 처리
  - 특정 명령줄 도구가 설치되어 있어야 할 수 있음

예시:
```bash
# 시스템 정보 가져오기
echo "호스트명: $(hostname)"
echo "커널: $(uname -r)"
echo "사용자: $(whoami)"
```

## 사용자 정의 스크립트 생성

### 스크립트 편집기

Toast 앱은 다음 기능을 제공하는 통합 스크립트 편집기를 제공합니다:

- 지원되는 모든 스크립트 유형에 대한 구문 강조
- 줄 번호
- 오류 강조
- 자동 들여쓰기
- 기본 코드 완성

스크립트 편집기에 액세스하려면:

1. 설정 창 열기
2. "버튼" 탭으로 이동
3. 새 버튼 추가 또는 기존 버튼 편집
4. 액션 유형으로 "사용자 정의 스크립트" 선택
5. 드롭다운 메뉴에서 스크립트 유형 선택
6. 스크립트 편집기를 사용하여 스크립트 작성 또는 붙여넣기

### 스크립트 테스트

저장하기 전에 스크립트를 테스트할 수 있습니다:

1. 스크립트 편집기에서 스크립트 작성
2. "스크립트 테스트" 버튼 클릭
3. 테스트 결과 패널에서 출력 또는 오류 확인
4. 필요한 경우 스크립트 수정
5. 결과에 만족하면 저장

### 스크립트 버튼 구성

스크립트용 버튼을 생성할 때:

1. 설명적인 이름 제공
2. 적절한 아이콘 선택
3. 단축키 선택 (선택사항)
4. 스크립트 유형 선택
5. 스크립트 입력 또는 붙여넣기
6. 추가 옵션 구성:
   - **백그라운드에서 실행**: 완료를 기다리지 않고 실행
   - **출력 표시**: Toast 상태 표시줄에 스크립트 출력 표시
   - **창 닫기 시 종료**: Toast 창이 닫힐 때 스크립트 프로세스 종료

## 스크립트 실행 환경

### 환경 변수

스크립트는 다음 환경 변수에 액세스할 수 있습니다:

| 변수 | 설명 |
|------|------|
| `TOAST_APP_VERSION` | Toast 앱의 현재 버전 |
| `TOAST_USER_DATA_PATH` | 사용자 데이터 디렉토리 경로 |
| `TOAST_TEMP_PATH` | 임시 디렉토리 경로 |
| `TOAST_SCRIPT_ID` | 현재 스크립트의 고유 식별자 |
| `TOAST_PLATFORM` | 현재 플랫폼 (darwin, win32) |

### 실행 컨텍스트

스크립트는 다음 특성으로 실행됩니다:

- JavaScript 스크립트는 Node.js 컨텍스트를 가진 Electron 메인 프로세스에서 실행
- AppleScript, PowerShell, Bash 스크립트는 자식 프로세스에서 실행
- 작업 디렉토리는 사용자의 홈 디렉토리로 설정
- 표준 입력은 비어있음 (닫힘)
- 표준 출력 및 오류는 표시를 위해 캡처됨

### 출력 처리

스크립트 출력은 다음과 같이 처리됩니다:

- **반환 값** (JavaScript만): 마지막 표현식 또는 명시적으로 반환된 값
- **표준 출력**: 캡처되어 결과에서 사용 가능
- **표준 오류**: 캡처되어 오류로 표시
- **종료 코드**: 0이 아닌 종료 코드는 오류로 처리

UI 문제를 방지하기 위해 출력이 10,000자를 초과하면 잘립니다.

### 오류 처리

오류 보고에는 다음이 포함됩니다:

- 실행 전에 감지된 구문 오류
- 줄 번호가 포함된 런타임 오류 (가능한 경우)
- 셸 스크립트의 종료 코드 정보
- 너무 오래 실행되는 스크립트의 타임아웃 오류

## 보안 모델

### 샌드박싱

Toast 앱은 스크립트 실행을 위한 보안 조치를 구현합니다:

- 스크립트는 Toast 앱 프로세스와 동일한 권한으로 실행
- 앱 자체가 관리자 권한으로 실행되지 않는 한 관리자 권한 없음
- 폭주 스크립트를 방지하기 위한 리소스 제한
- 무한 루프나 정지를 방지하기 위한 타임아웃

### 권한

스크립트는 다음 권한 특성을 가집니다:

- 사용자 디렉토리 내에서 파일시스템 액세스 (읽기/쓰기)
- HTTP 요청 및 기타 연결을 위한 네트워크 액세스
- 보호된 시스템 영역에 대한 특별한 액세스 없음
- macOS 및 Windows 보안 제한이 여전히 적용됨

### 입력 검증

모든 스크립트는 검증을 거칩니다:

- 명령 주입을 방지하기 위한 입력 정화
- 과도하게 큰 스크립트를 방지하기 위한 길이 제한
- 다양한 스크립트 유형에 대한 형식 검증

### 스크립트 검증

스크립트는 실행 전에 검증됩니다:

- 가능한 경우 구문 검사
- 필요한 권한 확인
- 무한 실행을 방지하기 위한 타임아웃 설정
- 리소스 제한 검사

## 스크립트 예시

### JavaScript 예시

**날씨 정보**:
```javascript
// 현재 날씨 정보 가져오기
const https = require('https');

async function getWeather(city) {
  const apiKey = 'YOUR_API_KEY'; // API 키로 교체
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const weatherData = JSON.parse(data);
          resolve(`${weatherData.name}의 날씨: ${weatherData.main.temp}°C, ${weatherData.weather[0].description}`);
        } catch (e) {
          reject(`날씨 데이터 파싱 오류: ${e.message}`);
        }
      });
    }).on('error', (e) => reject(`날씨 가져오기 오류: ${e.message}`));
  });
}

// 서울의 날씨 반환 (사용자 정의 가능)
return getWeather('Seoul');
```

**시스템 정보**:
```javascript
const os = require('os');

// 바이트를 사람이 읽기 쉬운 형식으로 변환
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

// 시스템 정보 수집
const cpus = os.cpus();
const totalMem = formatBytes(os.totalmem());
const freeMem = formatBytes(os.freemem());
const uptime = (os.uptime() / 3600).toFixed(2);

return `
시스템: ${os.type()} ${os.release()} ${os.arch()}
호스트명: ${os.hostname()}
CPU: ${cpus[0].model} (${cpus.length} 코어)
메모리: ${totalMem} 중 ${freeMem} 사용 가능
가동 시간: ${uptime} 시간
`;
```

### AppleScript 예시

**음악 앱 제어**:
```applescript
-- 음악 앱에서 재생/일시정지 토글
tell application "Music"
  if player state is playing then
    pause
    return "음악 일시정지됨"
  else
    play
    set currentTrack to name of current track
    set currentArtist to artist of current track
    return "현재 재생 중: " & currentTrack & " - " & currentArtist
  end if
end tell
```

**화면 밝기**:
```applescript
-- 화면 밝기 가져오기 및 설정
tell application "System Events"
  tell appearance preferences
    set currentBrightness to brightness

    -- 최대 밝기와 30% 사이 토글
    if currentBrightness > 0.5 then
      set brightness to 0.3
      return "밝기를 30%로 설정"
    else
      set brightness to 1.0
      return "밝기를 100%로 설정"
    end if
  end tell
end tell
```

### PowerShell 예시

**배터리 상태**:
```powershell
# 노트북의 배터리 상태 가져오기
$battery = Get-WmiObject Win32_Battery
if ($battery) {
    $status = switch ($battery.BatteryStatus) {
        1 {"방전 중"}
        2 {"AC 전원"}
        3 {"완전 충전"}
        4 {"낮음"}
        5 {"위험"}
        default {"알 수 없음"}
    }

    "배터리: $($battery.EstimatedChargeRemaining)% ($status)"
} else {
    "배터리가 감지되지 않음 (데스크톱 시스템)"
}
```

**Wi-Fi 네트워크 목록**:
```powershell
# 사용 가능한 Wi-Fi 네트워크 가져오기
$networks = (netsh wlan show networks) -match '(SSID|Signal)'
$networksFormatted = $networks -join "`n"
"사용 가능한 Wi-Fi 네트워크:`n$networksFormatted"
```

### Bash/Shell 예시

**Git 저장소 상태**:
```bash
# git 저장소 상태 표시
if [ -d .git ] || git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Git 저장소 상태:"
    echo "---------------------"
    echo "현재 브랜치: $(git branch --show-current)"
    echo "최근 커밋:"
    git log --oneline -n 5
    echo "---------------------"
    git status -s
else
    echo "git 저장소가 아닙니다"
fi
```

**시스템 모니터링**:
```bash
# 상위 CPU 및 메모리 프로세스 표시
echo "상위 CPU 프로세스:"
ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -n 6

echo -e "\n상위 메모리 프로세스:"
ps -eo pid,pcpu,pmem,comm --sort=-pmem | head -n 6

echo -e "\n디스크 사용량:"
df -h | grep -v "tmpfs"
```

## 모범 사례

1. **스크립트를 집중적으로 유지**: 각 스크립트는 특정하고 잘 정의된 작업을 수행해야 함
2. **오류를 우아하게 처리**: 스크립트에 오류 처리 포함
3. **주석 사용**: 특히 복잡한 작업에 대해 스크립트를 문서화
4. **성능 고려**: 장시간 실행되는 스크립트는 Toast 앱의 응답성에 영향을 줄 수 있음
5. **철저히 테스트**: 의존하기 전에 다양한 시나리오에서 스크립트 테스트
6. **민감한 정보 보안**: 스크립트에 API 키나 비밀번호를 하드코딩하지 않음
7. **플랫폼 검사 사용**: 셸 스크립트의 경우 플랫폼별 명령을 사용하기 전에 플랫폼 확인
8. **사용자 피드백 제공**: 스크립트에서 의미 있는 메시지 반환

## 문제 해결

일반적인 문제와 해결책:

| 문제 | 해결책 |
|------|--------|
| 스크립트 타임아웃 | 스크립트 성능 최적화 또는 설정에서 타임아웃 증가 |
| "명령을 찾을 수 없음" 오류 | 필요한 도구가 설치되어 있는지 확인하거나 전체 경로 제공 |
| 권한 오류 | 파일/폴더 권한 확인 또는 필요한 권한으로 Toast 앱 실행 |
| 네트워크 오류 | 네트워크 연결 및 URL 형식 확인 |
| 구문 오류 | 스크립트 테스트 기능을 사용하여 구문 문제 식별 및 수정 |
| 출력 없음 | 스크립트가 데이터를 올바르게 반환하거나 출력하는지 확인 |

## 고급 사용법

### 외부 API 작업

JavaScript 스크립트는 외부 API와 작업할 수 있습니다:

```javascript
const https = require('https');

async function fetchFromAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`요청 실패, 상태: ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function getJoke() {
  try {
    const data = await fetchFromAPI('https://icanhazdadjoke.com/');
    return data.joke;
  } catch (error) {
    return `농담 가져오기 오류: ${error.message}`;
  }
}

return getJoke();
```

### 영구 데이터 저장

스크립트는 파일시스템을 사용하여 데이터를 저장하고 검색할 수 있습니다:

```javascript
const fs = require('fs');
const path = require('path');

// 데이터 파일 경로
const dataFile = path.join(process.env.TOAST_USER_DATA_PATH, 'script-data.json');

// 기존 데이터 읽기 또는 없으면 새로 생성
function getData() {
  try {
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
    return { counter: 0, lastRun: null };
  } catch (error) {
    return { counter: 0, lastRun: null, error: error.message };
  }
}

// 데이터 업데이트
function updateData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// 현재 데이터 가져오기
const data = getData();

// 데이터 업데이트
data.counter += 1;
data.lastRun = new Date().toISOString();
updateData(data);

return `이 스크립트는 ${data.counter}번 실행되었습니다. 마지막 실행: ${data.lastRun}`;
```

### 스크립트 간 통신

스크립트는 임시 파일을 사용하여 서로 통신할 수 있습니다:

```javascript
const fs = require('fs');
const path = require('path');

// 공유 데이터 파일 경로
const sharedFile = path.join(process.env.TOAST_TEMP_PATH, 'script-shared-data.json');

// 다른 스크립트에서 데이터 읽기
function getSharedData() {
  try {
    if (fs.existsSync(sharedFile)) {
      return JSON.parse(fs.readFileSync(sharedFile, 'utf8'));
    }
    return null;
  } catch (error) {
    return { error: error.message };
  }
}

// 다른 스크립트를 위한 데이터 쓰기
function setSharedData(data) {
  fs.writeFileSync(sharedFile, JSON.stringify(data, null, 2));
}

// 사용 예시: 스크립트 간 상태 토글
const data = getSharedData() || { state: 'off' };
data.state = data.state === 'on' ? 'off' : 'on';
setSharedData(data);

return `공유 상태를 다음으로 토글: ${data.state}`;
```

## 보안 고려사항

사용자 정의 스크립트 작업 시 다음 보안 가이드라인을 고려하세요:

1. **신뢰할 수 없는 소스의 스크립트를 실행하지 마세요** (검토 없이)
2. **정화되지 않은 입력으로 시스템 명령을 실행하지 마세요**
3. **민감한 정보를 저장하지 마세요** (비밀번호, API 키) 평문 스크립트에
4. **파일 작업 시 주의하세요** 의도하지 않은 데이터 손실을 피하기 위해
5. **네트워크 요청을 하는 스크립트의 보안 영향을 고려하세요**
6. **스크립트가 사용자 권한으로 실행되며** 파일에 액세스할 수 있음을 이해하세요
7. **보안 API 엔드포인트를 사용하세요** (HTTP보다 HTTPS)
8. **모든 외부 데이터를 검증하고 정화하세요** 처리하기 전에
9. **JavaScript 스크립트가 Node.js API에 액세스할 수 있음을 기억하세요** 및 관련 기능
10. **환경이 변경될 때 스크립트를 정기적으로 검토하세요** 잠재적인 보안 문제에 대해
