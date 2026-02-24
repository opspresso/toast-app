/**
 * 꽃가루 애니메이션 효과
 * Toast 앱 특별 효과 - 전체 화면 버전
 */

// 컨테이너를 한 번만 생성하기 위한 변수
let confettiContainer = null;

// 애니메이션 진행 중인지 추적
let isAnimationActive = false;

// 꽃가루 색상 배열 - 더 화려한 색상으로 확장
const COLORS = ['red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange', 'cyan', 'magenta', 'lime', 'gold', 'violet', 'coral', 'turquoise'];

// 꽃가루 크기 배열
const SIZES = ['small', 'medium', 'large', 'xlarge'];

// 꽃가루 모양 배열
const SHAPES = ['circle', 'square', 'triangle', 'heart', 'star', 'petal'];

/**
 * 꽃가루 컨테이너 생성 및 초기화
 * @returns {HTMLElement} 꽃가루 컨테이너 요소
 */
function createConfettiContainer() {
  // 이미 있으면 재사용
  if (confettiContainer) {
    confettiContainer.innerHTML = '';
    return confettiContainer;
  }

  // 새로 생성
  confettiContainer = document.createElement('div');
  confettiContainer.className = 'confetti-container';

  // 전체 화면을 덮기 위한 설정
  confettiContainer.style.position = 'fixed';
  confettiContainer.style.top = '0';
  confettiContainer.style.left = '0';
  confettiContainer.style.width = '100vw';
  confettiContainer.style.height = '100vh';
  confettiContainer.style.zIndex = '9999';
  confettiContainer.style.pointerEvents = 'none';
  confettiContainer.style.overflow = 'hidden';

  document.body.appendChild(confettiContainer);

  return confettiContainer;
}

/**
 * 랜덤한 숫자 생성 (최소, 최대 사이)
 * @param {number} min 최소값
 * @param {number} max 최대값
 * @returns {number} 랜덤한 숫자
 */
function random(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * 랜덤한 정수 생성 (최소, 최대 사이)
 * @param {number} min 최소값
 * @param {number} max 최대값
 * @returns {number} 랜덤한 정수
 */
function randomInt(min, max) {
  return Math.floor(random(min, max));
}

/**
 * 랜덤한 항목 가져오기
 * @param {Array} array 배열
 * @returns {*} 배열에서 랜덤하게 선택된 항목
 */
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 특별한 모양의 꽃가루 생성
 * @param {string} shape 모양 이름
 * @returns {string} CSS 클래스 이름
 */
function createShapeClass(shape) {
  switch (shape) {
    case 'circle':
      return 'circle';
    case 'square':
      return 'square';
    case 'triangle':
      return 'triangle';
    case 'heart':
      return 'heart';
    case 'star':
      return 'star';
    case 'petal':
      return 'petal';
    default:
      return 'circle';
  }
}

/**
 * 꽃가루 요소 생성
 * @param {HTMLElement} container 부모 컨테이너 요소
 * @param {Object} position 시작 위치 (옵션)
 */
function createConfetti(container, position = null) {
  // 꽃가루 요소 생성
  const confetti = document.createElement('div');
  confetti.className = 'confetti';

  // 랜덤한 속성 지정
  const size = randomItem(SIZES);
  const color = randomItem(COLORS);
  const shape = randomItem(SHAPES);

  // 클래스 추가
  confetti.classList.add(`size-${size}`);
  confetti.classList.add(`color-${color}`);
  confetti.classList.add(createShapeClass(shape));

  // 랜덤한 시작 위치
  let left;
  if (position) {
    left = position.x;
  }
  else {
    // 전체 화면에 고르게 분포
    left = `${random(0, 100)}%`;
  }

  // 랜덤한 시작 높이 (화면 상단에서 시작)
  const startY = position ? position.y : -20;

  // 랜덤한 애니메이션 속성
  const initialDelay = random(0, 4); // 0-4초 초기 딜레이
  const fallDuration = random(4, 12); // 4-12초 낙하 시간 (더 길게)

  // 스타일 지정
  confetti.style.left = left;
  confetti.style.top = `${startY}px`;
  confetti.style.animationDelay = `${initialDelay}s`;
  confetti.style.animationDuration = `${fallDuration}s`;

  // 회전 및 흔들림 추가
  const rotate = random(0, 360);
  const swing = random(-50, 50); // 더 큰 흔들림 범위
  const scale = random(0.8, 1.5); // 크기 변화 추가

  confetti.style.transform = `
    rotate(${rotate}deg)
    translateX(${swing}px)
    scale(${scale})
  `;

  // 애니메이션 종류 랜덤 지정
  const animationTypes = ['fall', 'fallSpin', 'fallSwing'];
  const animation = randomItem(animationTypes);
  confetti.style.animationName = animation;

  // 컨테이너에 추가
  container.appendChild(confetti);

  // 애니메이션 완료 후 제거
  setTimeout(
    () => {
      if (confetti.parentNode === container) {
        container.removeChild(confetti);
      }
    },
    (initialDelay + fallDuration) * 1000,
  );
}

/**
 * 꽃가루 애니메이션 시작 - 전체 화면
 * @param {Object} options 애니메이션 옵션
 * @param {number} options.duration 지속 시간 (초)
 * @param {number} options.density 밀도 (갯수)
 * @param {Function} options.onComplete 완료 콜백
 */
function startConfetti(options = {}) {
  // 이미 실행 중이면 무시
  if (isAnimationActive) {
    return;
  }

  // 옵션 기본값 설정 - 전체 화면용으로 더 많은 밀도와 더 긴 지속 시간
  const duration = options.duration || 8; // 기본 8초로 연장
  const density = options.density || 200; // 기본 밀도 대폭 증가
  const onComplete = options.onComplete || (() => {});

  // 컨테이너 생성
  const container = createConfettiContainer();
  isAnimationActive = true;

  // 화면 전체에 골고루 꽃가루가 나타나도록 여러 위치에서 시작
  const startPositions = [];
  for (let i = 0; i < 9; i++) {
    startPositions.push({
      x: `${i * 12}%`,
      y: -20,
    });
  }

  // 추가적인 랜덤 위치
  for (let i = 0; i < 6; i++) {
    startPositions.push({
      x: `${random(0, 100)}%`,
      y: -20,
    });
  }

  // 꽃가루 생성 간격 - 더 짧게 설정하여 한꺼번에 많이 생성
  const interval = 1000 / (density / 5); // 1초 동안 밀도/5 만큼 생성
  let count = 0;

  // 주기적으로 꽃가루 생성
  const generator = setInterval(() => {
    // 한 번에 여러 개의 꽃가루 생성 (더 풍성한 효과)
    for (let i = 0; i < 5; i++) {
      const position = randomItem(startPositions);
      createConfetti(container, position);
      count++;
    }

    // 밀도에 도달하면 생성 중단
    if (count >= density) {
      clearInterval(generator);
    }
  }, interval);

  // 애니메이션 종료 후 정리
  setTimeout(() => {
    clearInterval(generator);

    // 모든 꽃가루가 떨어질 시간을 추가로 대기
    setTimeout(() => {
      // 컨테이너의 모든 꽃가루 제거
      container.innerHTML = '';
      isAnimationActive = false;

      // 완료 콜백 호출
      onComplete();
    }, 13000); // 13초 추가 대기 (가장 느린 꽃가루가 떨어질 시간)
  }, duration * 1000);
}

/**
 * 꽃가루 애니메이션 중지
 */
function stopConfetti() {
  if (confettiContainer) {
    confettiContainer.innerHTML = '';
  }
  isAnimationActive = false;
}

// 모듈 내보내기
window.confetti = {
  start: startConfetti,
  stop: stopConfetti,
};

// 애니메이션 테스트 함수 (window 객체에 등록)
window.startConfettiAnimation = function (options) {
  startConfetti(options);
};
