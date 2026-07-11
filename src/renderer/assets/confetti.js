/**
 * Confetti animation effect
 * Toast app special effect - full screen version
 */

// Variable to create the container only once
let confettiContainer = null;

// Track whether an animation is in progress
let isAnimationActive = false;

// Confetti color array - expanded with more vivid colors
const COLORS = ['red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange', 'cyan', 'magenta', 'lime', 'gold', 'violet', 'coral', 'turquoise'];

// Confetti size array
const SIZES = ['small', 'medium', 'large', 'xlarge'];

// Confetti shape array
const SHAPES = ['circle', 'square', 'triangle', 'heart', 'star', 'petal'];

/**
 * Create and initialize the confetti container
 * @returns {HTMLElement} Confetti container element
 */
function createConfettiContainer() {
  // Reuse if it already exists
  if (confettiContainer) {
    confettiContainer.innerHTML = '';
    return confettiContainer;
  }

  // Create a new one
  confettiContainer = document.createElement('div');
  confettiContainer.className = 'confetti-container';

  // Settings to cover the full screen
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
 * Generate a random number (between min and max)
 * @param {number} min Minimum value
 * @param {number} max Maximum value
 * @returns {number} Random number
 */
function random(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Generate a random integer (between min and max)
 * @param {number} min Minimum value
 * @param {number} max Maximum value
 * @returns {number} Random integer
 */
function randomInt(min, max) {
  return Math.floor(random(min, max));
}

/**
 * Get a random item
 * @param {Array} array Array
 * @returns {*} Randomly selected item from the array
 */
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Create confetti of a special shape
 * @param {string} shape Shape name
 * @returns {string} CSS class name
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
 * Create a confetti element
 * @param {HTMLElement} container Parent container element
 * @param {Object} position Start position (optional)
 */
function createConfetti(container, position = null) {
  // Create the confetti element
  const confetti = document.createElement('div');
  confetti.className = 'confetti';

  // Assign random properties
  const size = randomItem(SIZES);
  const color = randomItem(COLORS);
  const shape = randomItem(SHAPES);

  // Add classes
  confetti.classList.add(`size-${size}`);
  confetti.classList.add(`color-${color}`);
  confetti.classList.add(createShapeClass(shape));

  // Random start position
  let left;
  if (position) {
    left = position.x;
  }
  else {
    // Distribute evenly across the full screen
    left = `${random(0, 100)}%`;
  }

  // Random start height (starts at the top of the screen)
  const startY = position ? position.y : -20;

  // Random animation properties
  const initialDelay = random(0, 4); // 0-4s initial delay
  const fallDuration = random(4, 12); // 4-12s fall duration (longer)

  // Assign styles
  confetti.style.left = left;
  confetti.style.top = `${startY}px`;
  confetti.style.animationDelay = `${initialDelay}s`;
  confetti.style.animationDuration = `${fallDuration}s`;

  // Add rotation and swing
  const rotate = random(0, 360);
  const swing = random(-50, 50); // Larger swing range
  const scale = random(0.8, 1.5); // Add size variation

  confetti.style.transform = `
    rotate(${rotate}deg)
    translateX(${swing}px)
    scale(${scale})
  `;

  // Randomly assign the animation type
  const animationTypes = ['fall', 'fallSpin', 'fallSwing'];
  const animation = randomItem(animationTypes);
  confetti.style.animationName = animation;

  // Add to the container
  container.appendChild(confetti);

  // Remove after the animation completes
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
 * Start the confetti animation - full screen
 * @param {Object} options Animation options
 * @param {number} options.duration Duration (seconds)
 * @param {number} options.density Density (count)
 * @param {Function} options.onComplete Completion callback
 */
function startConfetti(options = {}) {
  // Ignore if already running
  if (isAnimationActive) {
    return;
  }

  // Set default option values - higher density and longer duration for full screen
  const duration = options.duration || 8; // Extended to 8s by default
  const density = options.density || 200; // Default density greatly increased
  const onComplete = options.onComplete || (() => {});

  // Create the container
  const container = createConfettiContainer();
  isAnimationActive = true;

  // Start from multiple positions so confetti appears evenly across the whole screen
  const startPositions = [];
  for (let i = 0; i < 9; i++) {
    startPositions.push({
      x: `${i * 12}%`,
      y: -20,
    });
  }

  // Additional random positions
  for (let i = 0; i < 6; i++) {
    startPositions.push({
      x: `${random(0, 100)}%`,
      y: -20,
    });
  }

  // Confetti generation interval - set shorter to create many at once
  const interval = 1000 / (density / 5); // Generate density/5 per second
  let count = 0;

  // Generate confetti periodically
  const generator = setInterval(() => {
    // Generate multiple confetti at once (richer effect)
    for (let i = 0; i < 5; i++) {
      const position = randomItem(startPositions);
      createConfetti(container, position);
      count++;
    }

    // Stop generating once density is reached
    if (count >= density) {
      clearInterval(generator);
    }
  }, interval);

  // Clean up after the animation ends
  setTimeout(() => {
    clearInterval(generator);

    // Wait additionally for all confetti to fall
    setTimeout(() => {
      // Remove all confetti from the container
      container.innerHTML = '';
      isAnimationActive = false;

      // Invoke the completion callback
      onComplete();
    }, 13000); // Wait an extra 13s (time for the slowest confetti to fall)
  }, duration * 1000);
}

/**
 * Stop the confetti animation
 */
function stopConfetti() {
  if (confettiContainer) {
    confettiContainer.innerHTML = '';
  }
  isAnimationActive = false;
}

// Export module
window.confetti = {
  start: startConfetti,
  stop: stopConfetti,
};

// Animation test function (registered on the window object)
window.startConfettiAnimation = function (options) {
  startConfetti(options);
};
