const introLoader = document.querySelector('[data-intro-loader]');
const introSeenKey = 'portfolio:intro-seen';
const activePageKey = 'portfolio:active-page';
const clock = document.querySelector('[data-clock]');
if (clock) {
  const indiaTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  const updateClock = () => { clock.textContent = indiaTime.format(new Date()); };
  updateClock();
  setInterval(updateClock, 30_000);
}

function cleanPathname(p) {
  return p ? p.replace(/\/+$/, '') || '/' : '';
}

function checkIsReload() {
  try {
    const navEntries = performance.getEntriesByType?.('navigation');
    if (navEntries && navEntries.length > 0) {
      return navEntries[0].type === 'reload';
    }
    if (performance.navigation) {
      return performance.navigation.type === 1;
    }
  } catch {}
  return false;
}

function checkIsPageHop() {
  const current = cleanPathname(location.pathname);
  if (document.referrer) {
    try {
      const ref = new URL(document.referrer);
      if (ref.origin === location.origin && cleanPathname(ref.pathname) !== current) {
        return true;
      }
    } catch {}
  }
  try {
    const last = sessionStorage.getItem(activePageKey);
    if (last && cleanPathname(last) !== current) {
      return true;
    }
  } catch {}
  return false;
}

const isReloading = checkIsReload();
const isPageHopping = !isReloading && checkIsPageHop();

let introAlreadySeen = false;
try {
  if (isReloading) {
    sessionStorage.removeItem(introSeenKey);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  } else if (isPageHopping) {
    introAlreadySeen = sessionStorage.getItem(introSeenKey) === '1';
  } else {
    sessionStorage.removeItem(introSeenKey);
  }
  sessionStorage.setItem(activePageKey, location.pathname);
  if (!introLoader) sessionStorage.setItem(introSeenKey, '1');
} catch {}

function markIntroSeen() {
  try {
    sessionStorage.setItem(introSeenKey, '1');
    sessionStorage.setItem(activePageKey, location.pathname);
  } catch {}
}

window.addEventListener('pagehide', () => {
  try { sessionStorage.setItem(activePageKey, location.pathname); } catch {}
});

const menuButton = document.querySelector('.rail-menu');
const menuIconLower = menuButton?.querySelector('[data-menu-icon-bar="lower"]');
const menuIconUpper = menuButton?.querySelector('[data-menu-icon-bar="upper"]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const reducedMenuMotion = matchMedia('(prefers-reduced-motion: reduce)');

let menuIconAnimFrame = 0;

function easePower2Out(t) {
  return 1 - (1 - t) * (1 - t);
}

function easePower2InOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function cancelMenuIconAnimation() {
  if (menuIconAnimFrame) {
    cancelAnimationFrame(menuIconAnimFrame);
    menuIconAnimFrame = 0;
  }
}

function getMenuIconValues() {
  const lowerW = Number(menuIconLower?.getAttribute('width') ?? 32);
  const upperX = Number(menuIconUpper?.getAttribute('x') ?? 0);
  const upperW = Number(menuIconUpper?.getAttribute('width') ?? 32);
  return { lowerW, upperX, upperW };
}

function setMenuIconImmediate(state) {
  cancelMenuIconAnimation();
  if (!menuIconLower || !menuIconUpper) return;
  if (state === 'half') {
    menuIconLower.setAttribute('width', '16');
    menuIconUpper.setAttribute('x', '16');
    menuIconUpper.setAttribute('width', '16');
  } else if (state === 'open') {
    menuIconLower.setAttribute('width', '0');
    menuIconUpper.setAttribute('x', '32');
    menuIconUpper.setAttribute('width', '0');
  } else {
    menuIconLower.setAttribute('width', '32');
    menuIconUpper.setAttribute('x', '0');
    menuIconUpper.setAttribute('width', '32');
  }
}

function animateMenuIconTo(targetState, duration, easeFn, onComplete) {
  cancelMenuIconAnimation();
  if (!menuIconLower || !menuIconUpper) {
    onComplete?.();
    return;
  }
  if (reducedMotion) {
    setMenuIconImmediate(targetState);
    onComplete?.();
    return;
  }

  const { lowerW: startLowerW, upperX: startUpperX, upperW: startUpperW } = getMenuIconValues();
  let targetLowerW = 32;
  let targetUpperX = 0;
  let targetUpperW = 32;

  if (targetState === 'open') {
    targetLowerW = 0;
    targetUpperX = 32;
    targetUpperW = 0;
  } else if (targetState === 'half') {
    targetLowerW = 16;
    targetUpperX = 16;
    targetUpperW = 16;
  }

  const startTime = performance.now();

  function step(now) {
    const elapsed = Math.min(now - startTime, duration);
    const progress = duration > 0 ? elapsed / duration : 1;
    const eased = easeFn(progress);

    const curLowerW = startLowerW + (targetLowerW - startLowerW) * eased;
    const curUpperX = startUpperX + (targetUpperX - startUpperX) * eased;
    const curUpperW = startUpperW + (targetUpperW - startUpperW) * eased;

    menuIconLower.setAttribute('width', curLowerW.toFixed(2));
    menuIconUpper.setAttribute('x', curUpperX.toFixed(2));
    menuIconUpper.setAttribute('width', curUpperW.toFixed(2));

    if (elapsed < duration) {
      menuIconAnimFrame = requestAnimationFrame(step);
    } else {
      menuIconAnimFrame = 0;
      menuIconLower.setAttribute('width', String(targetLowerW));
      menuIconUpper.setAttribute('x', String(targetUpperX));
      menuIconUpper.setAttribute('width', String(targetUpperW));
      onComplete?.();
    }
  }

  menuIconAnimFrame = requestAnimationFrame(step);
}

function resetMenuIconToHalf() {
  setMenuIconImmediate('half');
}

function setMenuIconToFull(animate = false, onComplete) {
  if (animate) {
    animateMenuIconTo('full', 2000, easePower2Out, onComplete);
  } else {
    setMenuIconImmediate('full');
    onComplete?.();
  }
}

function setMenuIconState(open) {
  animateMenuIconTo(open ? 'open' : 'full', 700, easePower2InOut);
}

if (introLoader) {
  const endYear = new Date().getFullYear();
  const suppliedYear = Number.parseInt(introLoader.dataset.startYear, 10);
  const startYear = Number.isInteger(suppliedYear) && suppliedYear >= 1900 && suppliedYear <= endYear ? suppliedYear : endYear;
  const reel = introLoader.querySelector('.intro-loader__years');
  const progressLine = introLoader.querySelector('.intro-loader__progress');
  const introContent = introLoader.querySelector('.intro-loader__content');
  const loadingContent = document.querySelector('.page');

  if (reducedMotion || introAlreadySeen) {
    introLoader.remove();
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    if (introAlreadySeen) document.body.classList.add('is-returning');
    setMenuIconToFull(false);
    if (menuButton) menuButton.disabled = false;
    markIntroSeen();
  } else {
    loadingContent?.setAttribute('inert', '');
    if (menuButton) menuButton.disabled = true;
    resetMenuIconToHalf();
    for (let year = startYear; year <= endYear; year++) {
      const item = document.createElement('span');
      const suffix = String(year % 100).padStart(2, '0');
      if (year === startYear) {
        item.className = 'intro-loader__first-year';
        for (const digit of suffix) {
          const shell = document.createElement('span');
          shell.className = 'intro-loader__digit-shell';
          const character = document.createElement('span');
          character.className = 'intro-loader__digit';
          character.textContent = digit;
          shell.appendChild(character);
          item.appendChild(shell);
        }
      } else {
        item.textContent = suffix;
      }
      reel.appendChild(item);
    }
    function finishLoader() {
      introLoader.remove();
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      loadingContent?.removeAttribute('inert');
      markIntroSeen();
      window.dispatchEvent(new Event('portfolio:ready'));
      setMenuIconToFull(true, () => {
        if (menuButton) menuButton.disabled = false;
      });
    }

    function exitLoader() {
      introLoader.classList.add('is-complete');
      const options = { duration: 1100, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' };
      const contentExit = introContent.animate([
        { transform: 'translate3d(0,0,0)' },
        { transform: 'translate3d(0,calc(-100% + 8px),0)' }
      ], options);
      const separatorExit = progressLine.animate([
        { transform: 'translate3d(0,calc(100% - 8px),0) scaleX(1)' },
        { transform: 'translate3d(0,0,0) scaleX(1)' }
      ], options);
      const exitStart = document.timeline.currentTime;
      contentExit.startTime = separatorExit.startTime = exitStart;
      Promise.all([contentExit.finished, separatorExit.finished]).then(finishLoader);
    }

    function startLoader() {
      introLoader.classList.add('is-started');
      let distance;
      const measureReel = () => {
        distance = reel.lastElementChild.offsetTop - reel.firstElementChild.offsetTop;
      };
      measureReel();
      window.addEventListener('resize', measureReel);
      const leadIn = 1900;
      const rollTime = 2850;
      const totalTime = leadIn + rollTime;
      let startTime;
      function animateLoader(now) {
        if (startTime === undefined) startTime = now;
        const elapsed = Math.min(now - startTime, totalTime);
        const raw = Math.max(0, Math.min(1, (elapsed - leadIn) / rollTime));
        const eased = raw < 0.5 ? 8 * Math.pow(raw, 4) : 1 - 8 * Math.pow(1 - raw, 4);
        reel.style.transform = `translate3d(0,${-distance * eased}px,0)`;
        progressLine.style.transform = `translate3d(0,calc(100% - 8px),0) scaleX(${eased})`;
        if (elapsed < totalTime) requestAnimationFrame(animateLoader);
        else {
          window.removeEventListener('resize', measureReel);
          exitLoader();
        }
      }
      requestAnimationFrame(animateLoader);
    }
    (document.fonts?.ready ?? Promise.resolve()).then(startLoader);
  }
} else {
  setMenuIconToFull(false);
  if (menuButton) menuButton.disabled = false;
}

const heroDescriptor = document.querySelector('.hero__descriptor');
if (heroDescriptor) {
  const sentence = heroDescriptor.textContent.trim().replace(/\s+/g, ' ');
  let lineFrame = 0;

  function splitDescriptorLines(settle = document.body.classList.contains('is-ready')) {
    heroDescriptor.classList.toggle('is-settled', settle);
    heroDescriptor.textContent = '';
    const measure = document.createElement('span');
    measure.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;width:max-content;pointer-events:none';
    heroDescriptor.appendChild(measure);
    const availableWidth = heroDescriptor.getBoundingClientRect().width;
    const lines = [];
    let currentLine = '';
    for (const word of sentence.split(' ')) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      measure.textContent = candidate;
      if (currentLine && measure.getBoundingClientRect().width > availableWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }
    if (currentLine) lines.push(currentLine);
    heroDescriptor.replaceChildren(...lines.map((line, index) => {
      const row = document.createElement('span');
      row.className = 'hero__descriptor-line';
      row.style.setProperty('--line-delay', `${index * 0.172}s`);
      const text = document.createElement('span');
      text.className = 'hero__descriptor-line-text';
      text.textContent = line;
      row.appendChild(text);
      return row;
    }));
  }

  splitDescriptorLines();
  document.fonts?.ready.then(() => splitDescriptorLines(document.body.classList.contains('is-ready')));
  window.addEventListener('portfolio:ready', () => splitDescriptorLines(false));
  window.addEventListener('resize', () => {
    cancelAnimationFrame(lineFrame);
    lineFrame = requestAnimationFrame(splitDescriptorLines);
  });
}

const menu = document.querySelector('.menu-overlay');
let menuCloseTimer;
const mainContent = document.querySelector('.page');

if (menu && menuButton) {
  menu.inert = true;

  menu.querySelectorAll('.menu-links a').forEach((link, index) => {
    const number = link.querySelector('span')?.textContent || String(index + 1).padStart(2, '0');
    const label = link.textContent.replace(number, '').trim();
    const indexElement = document.createElement('span');
    indexElement.className = 'menu-link__index';
    indexElement.textContent = number;
    const clip = document.createElement('span');
    clip.className = 'menu-link__label-clip';
    const labelElement = document.createElement('span');
    labelElement.className = 'menu-link__label';
    labelElement.textContent = label;
    clip.append(labelElement);
    link.replaceChildren(indexElement, clip);
    link.style.setProperty('--menu-index', index);
    const url = new URL(link.href);
    const isCurrent = !url.hash && (url.pathname === location.pathname || (url.pathname === '/works/' && location.pathname.startsWith('/works/')));
    if (isCurrent && index < 3) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function setMenu(open) {
  if (!menu || !menuButton) return;
  clearTimeout(menuCloseTimer);
  if (open) {
    menu.classList.remove('is-closing');
    menu.inert = false;
    menu.setAttribute('aria-hidden', 'false');
    menu.classList.add('is-open');
    mainContent?.setAttribute('inert', '');
    document.body.classList.add('menu-open');
    menuButton.focus({ preventScroll: true });
  } else {
    menu.classList.remove('is-open');
    menu.classList.add('is-closing');
    menu.inert = true;
    menu.setAttribute('aria-hidden', 'true');
    menuButton.focus({ preventScroll: true });
    menuCloseTimer = setTimeout(() => {
      menu.classList.remove('is-closing');
      document.body.classList.remove('menu-open');
      if (!document.body.classList.contains('is-loading')) mainContent?.removeAttribute('inert');
    }, reducedMenuMotion.matches ? 0 : 670);
  }
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  setMenuIconState(open);
}

function preventBackgroundScroll(event) {
  if (menu && menu.classList.contains('is-open')) {
    if (menu.contains(event.target) && menu.scrollHeight > menu.clientHeight) {
      return;
    }
    event.preventDefault();
  }
}
window.addEventListener('wheel', preventBackgroundScroll, { passive: false });
window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });

menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  const destination = new URL(link.href);
  if (destination.pathname === location.pathname) {
    setMenu(false);
    if (!destination.hash && !destination.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu?.classList.contains('is-open')) {
    setMenu(false);
    return;
  }
  if (menu?.classList.contains('is-open')) {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
      if (!menu.contains(event.target) || menu.scrollHeight <= menu.clientHeight) {
        event.preventDefault();
      }
    }
  }
});

let navigating = false;
window.addEventListener('pageshow', () => {
  navigating = false;
  document.querySelectorAll('.page-dissolve').forEach(canvas => canvas.remove());
});
function transitionColor(pathname) {
  if (pathname === '/') return [38, 34, 32];
  if (pathname.startsWith('/works/') && pathname !== '/works/') return [250, 248, 242];
  return [242, 240, 235];
}

function createDissolve(canvas, color) {
  const vertexSource = `
    attribute vec2 position;
    varying vec2 point;
    void main() {
      point = (position + 1.0) * 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec2 point;
    uniform float amount;
    uniform vec3 tint;

    float randomCell(vec2 cell) {
      return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
    }
    float cloudyNoise(vec2 coordinate) {
      vec2 cell = floor(coordinate);
      vec2 fraction = fract(coordinate);
      fraction = fraction * fraction * (3.0 - 2.0 * fraction);
      float bottom = mix(randomCell(cell), randomCell(cell + vec2(1.0, 0.0)), fraction.x);
      float top = mix(randomCell(cell + vec2(0.0, 1.0)), randomCell(cell + vec2(1.0, 1.0)), fraction.x);
      return pow(mix(bottom, top, fraction.y), 1.8);
    }
    void main() {
      float field = cloudyNoise(point * 5.0);
      float boundary = 1.0 - amount;
      float opacity = 1.0 - smoothstep(boundary - 0.17, boundary + 0.17, field);
      gl_FragColor = vec4(tint, opacity);
    }
  `;
  try {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL unavailable');
    function compile(type, source) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader unavailable');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      return shader;
    }
    const program = gl.createProgram();
    if (!program) throw new Error('Program unavailable');
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program linking failed');
    gl.useProgram(program);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const amount = gl.getUniformLocation(program, 'amount');
    const tint = gl.getUniformLocation(program, 'tint');
    if (!amount || !tint) throw new Error('Shader uniforms unavailable');
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * scale);
    canvas.height = Math.round(innerHeight * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform3f(tint, color[0] / 255, color[1] / 255, color[2] / 255);
    return progress => {
      gl.uniform1f(amount, progress);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
  } catch {
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.className = canvas.className;
    fallbackCanvas.setAttribute('aria-hidden', 'true');
    canvas.replaceWith(fallbackCanvas);
    canvas = fallbackCanvas;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const step = 4;
    const width = Math.ceil(innerWidth / step);
    const height = Math.ceil(innerHeight / step);
    canvas.width = width;
    canvas.height = height;
    const frame = context.createImageData(width, height);
    const field = new Float32Array(width * height);
    const grid = Array.from({ length: 7 * 7 }, () => Math.random());
    const smooth = value => value * value * (3 - 2 * value);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gx = x / width * 5;
        const gy = y / height * 5;
        const cx = Math.floor(gx);
        const cy = Math.floor(gy);
        const fx = smooth(gx - cx);
        const fy = smooth(gy - cy);
        const bottom = grid[cy * 7 + cx] * (1 - fx) + grid[cy * 7 + cx + 1] * fx;
        const top = grid[(cy + 1) * 7 + cx] * (1 - fx) + grid[(cy + 1) * 7 + cx + 1] * fx;
        field[y * width + x] = Math.pow(bottom * (1 - fy) + top * fy, 1.8);
      }
    }
    return progress => {
      const boundary = 1 - progress;
      for (let i = 0; i < field.length; i++) {
        const relative = Math.max(0, Math.min(1, (field[i] - boundary + .17) / .34));
        const blended = relative * relative * (3 - 2 * relative);
        const offset = i * 4;
        frame.data[offset] = color[0];
        frame.data[offset + 1] = color[1];
        frame.data[offset + 2] = color[2];
        frame.data[offset + 3] = Math.round((1 - blended) * 255);
      }
      context.putImageData(frame, 0, 0);
    };
  }
}

function dissolveTo(href) {
  if (navigating) return;
  navigating = true;
  try { sessionStorage.setItem(activePageKey, location.pathname); } catch {}
  if (reducedMenuMotion.matches) {
    location.assign(href);
    return;
  }
  const destination = new URL(href);
  const color = transitionColor(destination.pathname);
  const canvas = document.createElement('canvas');
  canvas.className = 'page-dissolve';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const paint = createDissolve(canvas, color);
  if (!paint) {
    location.assign(href);
    return;
  }
  const duration = 850;
  const start = performance.now();
  paint(1.5);
  function animate(now) {
    const progress = Math.min(1, (now - start) / duration);
    paint(1.5 - 2.25 * progress * progress);
    if (progress < 1) requestAnimationFrame(animate);
    else location.assign(href);
  }
  requestAnimationFrame(animate);
}

document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest?.('a[href]');
  if (!link || link.target && link.target !== '_self' || link.hasAttribute('download')) return;
  if (link.matches('[data-works-open]') || link.matches('.case-hero .back-link')) return;
  const destination = new URL(link.href);
  if (destination.origin !== location.origin || !['http:', 'https:'].includes(destination.protocol)) return;
  if (destination.pathname === location.pathname && destination.search === location.search && (destination.hash || destination.href === location.href)) return;
  event.preventDefault();
  dissolveTo(destination.href);
}, true);

const revealTargets = [...document.querySelectorAll('[data-reveal]')].filter(target => !target.closest('.about-scroll'));
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.08, rootMargin: '0px 0px 80px 0px' });
  revealTargets.forEach(target => observer.observe(target));
} else {
  revealTargets.forEach(target => target.classList.add('is-visible'));
}

const worksPage = document.querySelector('.works-page');
if (worksPage && !reducedMotion) {
  const cards = [...worksPage.querySelectorAll('.works-all__card')];
  const viewport = worksPage.querySelector('[data-works-viewport]');
  const revealTimers = [];
  let cardObserver;
  let revealGeneration = 0;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const resetWorks = () => {
    revealGeneration++;
    cardObserver?.disconnect();
    revealTimers.splice(0).forEach(clearTimeout);
    worksPage.classList.remove('is-ready', 'is-restoring-project');
    cards.forEach(card => card.classList.remove('is-revealed'));
    if (viewport) viewport.scrollLeft = 0;
  };
  const startWorks = () => {
    resetWorks();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      void worksPage.offsetWidth;
      worksPage.classList.add('is-ready');
      const startedAt = performance.now();
      const generation = revealGeneration;
      const revealCard = (card, index) => revealTimers.push(setTimeout(
        () => {
          const image = card.querySelector?.('img');
          const ready = image?.decode ? image.decode().catch(() => {}) : Promise.resolve();
          ready.then(() => {
            if (generation === revealGeneration && worksPage.classList.contains('is-ready')) {
              card.classList.add('is-revealed');
            }
          });
        },
        Math.max(0, 700 + index * 200 - (performance.now() - startedAt))
      ));
      if (innerWidth < 768 && 'IntersectionObserver' in window) {
        cardObserver = new IntersectionObserver(entries => {
          entries.filter(entry => entry.isIntersecting).forEach(entry => {
            cardObserver.unobserve(entry.target);
            revealCard(entry.target, cards.indexOf(entry.target));
          });
        }, { threshold: .08, rootMargin: '0px 0px 80px 0px' });
        cards.forEach(card => cardObserver.observe(card));
      } else cards.forEach(revealCard);
    });
  };
  if (document.fonts?.ready) document.fonts.ready.then(startWorks);
  else startWorks();
  window.addEventListener('pagehide', event => { if (event.persisted) resetWorks(); });
  window.addEventListener('pageshow', event => { if (event.persisted) startWorks(); });
  viewport?.addEventListener('wheel', event => {
    if (innerWidth < 768 || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    viewport.scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });
}

// Gallery projects stay in this document so the image can travel in both directions.
if (worksPage) {
  const gallery = worksPage.querySelector('.works-all');
  const panels = [...worksPage.querySelectorAll('[data-project-overlay]')];
  let activePanel = null;
  let openingLink = null;
  let flight = null;
  let flightImage = null;
  let closing = false;
  let contentAnimations = [];
  const projectEase = 'cubic-bezier(.22,1,.36,1)';
  const contentEase = 'cubic-bezier(.25,.1,.25,1)';
  const projectCloseDuration = 560;
  let projectCloseStart = null;

  function animateProjectContent(panel, exiting = false) {
    const elements = [
      panel.querySelector('.project-overlay__close'),
      ...panel.querySelectorAll('.case-hero__content > h1, .case-intro, .case-facts > div'),
      panel.querySelector('.case-body')
    ].filter(Boolean);
    const current = elements.map(element => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, transform: style.transform };
    });
    const backdrop = panel.querySelector('.project-overlay__backdrop');
    const backdropOpacity = getComputedStyle(backdrop).opacity;
    contentAnimations.forEach(animation => animation.cancel());
    contentAnimations = [];
    if (reducedMotion) return;
    const backdropFrames = exiting
      ? [{ opacity: backdropOpacity }, { opacity: 0 }]
      : [{ opacity: 0 }, { opacity: 1 }];
    contentAnimations.push(backdrop.animate(backdropFrames, {
      duration: exiting ? projectCloseDuration : 160,
      easing: projectEase,
      fill: 'both'
    }));
    elements.forEach((element, index) => {
      const frames = exiting
        ? [
            current[index],
            { opacity: 0, transform: 'translateX(-24px)' }
          ]
        : [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }];
      contentAnimations.push(element.animate(frames, {
        duration: exiting ? projectCloseDuration : 560,
        delay: exiting ? 0 : 60 + Math.min(index, 4) * 35,
        easing: exiting ? projectEase : contentEase,
        fill: 'both'
      }));
    });
    if (exiting) {
      contentAnimations.forEach(animation => { animation.startTime = projectCloseStart; });
    }
  }

  function clearFlight() {
    flight?.cancel();
    flightImage?.remove();
    flight = flightImage = null;
  }

  function moveImage(fromElement, toElement, onFinish, startRect = null) {
    clearFlight();
    const image = fromElement.querySelector('img');
    const from = startRect || fromElement.getBoundingClientRect();
    const to = toElement.getBoundingClientRect();
    if (reducedMotion || !image?.animate) { onFinish(); return; }
    const clone = image.cloneNode();
    const style = getComputedStyle(image);
    clone.className = 'project-image-flight';
    clone.alt = '';
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, {
      left: `${from.left}px`, top: `${from.top}px`,
      width: `${from.width}px`, height: `${from.height}px`,
      objectFit: style.objectFit, objectPosition: style.objectPosition,
      background: getComputedStyle(fromElement).backgroundColor
    });
    document.body.append(clone);
    flightImage = clone;
    fromElement.style.visibility = 'hidden';
    toElement.style.visibility = 'hidden';
    flight = clone.animate([
      { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` },
      { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` }
    ], { duration: closing ? projectCloseDuration : 650, easing: projectEase, fill: 'forwards' });
    if (closing) flight.startTime = projectCloseStart;
    flight.onfinish = () => {
      clearFlight();
      fromElement.style.visibility = '';
      toElement.style.visibility = '';
      onFinish();
    };
  }

  function closeProject() {
    if (!activePanel || closing) return;
    closing = true;
    projectCloseStart = document.timeline.currentTime;
    const panel = activePanel;
    const visual = panel.querySelector('.project-overlay__visual');
    const thumbnail = openingLink.querySelector('.works-all__media');
    const currentRect = flightImage?.getBoundingClientRect();
    clearFlight();
    visual.style.visibility = '';
    thumbnail.style.visibility = '';
    panel.classList.add('is-closing');
    animateProjectContent(panel, true);
    moveImage(visual, thumbnail, () => {
      panel.hidden = true;
      contentAnimations.forEach(animation => animation.cancel());
      contentAnimations = [];
      panel.classList.remove('is-open', 'is-closing');
      gallery.inert = false;
      document.body.style.overflow = '';
      activePanel = null;
      closing = false;
      openingLink.focus({ preventScroll: true });
      const selected = history.state?.portfolioProject;
      if (selected) {
        const link = worksPage.querySelector(`[data-works-open="${selected}"]`);
        if (link) openProject(link);
      }
    }, currentRect);
  }

  function openProject(link) {
    const panel = panels.find(item => item.dataset.projectOverlay === link.dataset.worksOpen);
    if (!panel || activePanel) return;
    openingLink = link;
    activePanel = panel;
    panel.hidden = false;
    panel.scrollTop = 0;
    gallery.inert = true;
    document.body.style.overflow = 'hidden';
    panel.classList.add('is-open');
    animateProjectContent(panel);
    moveImage(link.querySelector('.works-all__media'), panel.querySelector('.project-overlay__visual'), () => {});
    panel.querySelector('[data-project-close]').focus({ preventScroll: true });
  }

  function requestClose() {
    if (!activePanel || closing) return;
    if (history.state?.portfolioProject) history.back();
    else closeProject();
  }

  worksPage.addEventListener('click', event => {
    if (event.target.closest('[data-project-close]')) { requestClose(); return; }
    const link = event.target.closest('[data-works-open]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || activePanel) return;
    event.preventDefault();
    history.pushState({ ...history.state, portfolioProject: link.dataset.worksOpen }, '', location.href);
    openProject(link);
  });
  window.addEventListener('popstate', () => {
    const selected = history.state?.portfolioProject;
    if (!selected) closeProject();
    else if (!activePanel) {
      const link = worksPage.querySelector(`[data-works-open="${selected}"]`);
      if (link) openProject(link);
    }
  });
  document.addEventListener('keydown', event => {
    if (!activePanel) return;
    if (event.key === 'Escape') { event.preventDefault(); requestClose(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...activePanel.querySelectorAll('button,a[href]')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}

const horizontalStage = document.querySelector('[data-horizontal-scroll]');
const aboutStage = document.querySelector('.about-scroll');
const workGateway = document.querySelector('[data-work-gateway]');
const storyRevealTargets = [...document.querySelectorAll('[data-story-reveal], [data-story-image], [data-story-list]')].filter(target => !target.closest('.home-about,.home-services__intro,.home-experience,.home-contact'));
const storyServiceCards = [...document.querySelectorAll('.home-service')];
for (const card of storyServiceCards) {
  const media = card.querySelector('.home-service__media');
  let exitAnimation;
  card.addEventListener('pointerenter', () => exitAnimation?.cancel());
  card.addEventListener('pointerleave', () => {
    if (innerWidth < 768 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    exitAnimation?.cancel();
    exitAnimation = media?.animate([{ clipPath: 'inset(0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 800, easing: 'cubic-bezier(.22,1,.36,1)' });
  });
}
const storyPreviewImages = [...document.querySelectorAll('[data-preview-image]')];
const experienceRows = [...document.querySelectorAll('.home-experience__list li')];
const experienceLogos = [...document.querySelectorAll('.home-experience__mobile-logos > span')];
const chapterRevealText = [...document.querySelectorAll('.home-about .home-kicker, .home-about__statement > p:last-child, .home-about__quote, .home-about__aside, .home-services__intro .home-kicker, .home-services__intro > div > p:last-child, .home-experience__body .home-kicker, .about-hero-meta .about-kicker, .about-hero-meta > p:last-child')].map(element => ({ element, copy: element.textContent.trim().replace(/\s+/g, ' ') }));
if (chapterRevealText.length) {
  let lineFrame = 0;
  const splitLines = () => {
    for (const { element, copy } of chapterRevealText) {
      element.textContent = '';
      const measure = document.createElement('span');
      measure.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;width:max-content;pointer-events:none';
      element.appendChild(measure);
      const width = element.getBoundingClientRect().width;
      const lines = [];
      let line = '';
      for (const word of copy.split(' ')) {
        const candidate = line ? `${line} ${word}` : word;
        measure.textContent = candidate;
        if (line && measure.getBoundingClientRect().width > width) { lines.push(line); line = word; }
        else line = candidate;
      }
      if (line) lines.push(line);
      element.replaceChildren(...lines.map((text, index) => {
        const shell = document.createElement('span');
        shell.className = 'story-line';
        shell.style.setProperty('--story-line-index', index);
        const inner = document.createElement('span');
        inner.textContent = index < lines.length - 1 ? `${text} ` : text;
        shell.appendChild(inner);
        return shell;
      }));
    }
  };
  splitLines();
  document.fonts?.ready.then(splitLines);
  window.addEventListener('resize', () => {
    cancelAnimationFrame(lineFrame);
    lineFrame = requestAnimationFrame(splitLines);
  });
}
document.querySelectorAll('.home-experience__list li > span:first-child, .home-experience__more').forEach((element, index) => {
  const line = document.createElement('span');
  line.className = 'story-line';
  const text = document.createElement('span');
  text.textContent = element.textContent.trim();
  text.style.setProperty('--story-delay', `${index * .15}s`);
  line.appendChild(text);
  element.replaceChildren(line);
});
let pointerPosition = null;
let aboutMotionReady = false;
let aboutImagePainted = false;
let aboutHeroImageReady = false;
const pendingAboutImages = new WeakSet();

function updateAboutMotion() {
  if (!aboutStage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = innerWidth >= 768 && !reduced;
  const reveal = (selector, desktopThreshold, mobileThreshold, onEnter) => {
    const element = aboutStage.querySelector(selector);
    if (!element || element.classList.contains('is-visible')) return;
    const rect = element.getBoundingClientRect();
    if (reduced || (desktop
      ? rect.left <= innerWidth * desktopThreshold && rect.right > 0
      : rect.top <= innerHeight * mobileThreshold && rect.bottom > 0)) {
      if (onEnter) onEnter(element);
      else element.classList.add('is-visible');
    }
  };
  const revealImage = (element, waitForDecode = true) => {
    if (pendingAboutImages.has(element)) return;
    pendingAboutImages.add(element);
    const image = element.querySelector('img');
    const loaded = waitForDecode && image?.decode ? image.decode().catch(() => {}) : image?.complete ? Promise.resolve() : new Promise(resolve => {
      image?.addEventListener('load', resolve, { once: true });
      image?.addEventListener('error', resolve, { once: true });
    });
    loaded.then(() => requestAnimationFrame(() => element.classList.add('is-visible')));
  };
  if (aboutImagePainted && (desktop || reduced || aboutHeroImageReady)) {
    const portrait = aboutStage.querySelector('.about-portrait');
    const portraitRect = portrait?.getBoundingClientRect();
    if (!desktop && portraitRect?.top < innerHeight && portraitRect.bottom > 0) revealImage(portrait, false);
    else reveal('.about-portrait', 1, .8, element => revealImage(element, false));
  }
  if (!aboutMotionReady) return;
  reveal('.about-display', 1, 1);
  reveal('.about-hero-meta', 1, 1);
  reveal('.about-panel--philosophy blockquote', .8, .8);
  reveal('.about-panel--journey h2', .8, .8);
  reveal('.journey-table', .5, .85);
  reveal('.about-panel--beyond > .about-lead', .8, .85);
  reveal('.about-beyond-foot', .8, .95);
  reveal('.about-beyond-image', .6, .75, revealImage);
}

if (aboutStage) {
  window.addEventListener('scroll', updateAboutMotion, { passive: true });
  window.addEventListener('resize', updateAboutMotion);
  window.addEventListener('portfolio:ready', updateAboutMotion);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    aboutImagePainted = true;
    updateAboutMotion();
  }));
  (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    aboutMotionReady = true;
    updateAboutMotion();
    setTimeout(() => {
      aboutHeroImageReady = true;
      updateAboutMotion();
    }, 1300);
  })));
}

function updateWorkGateway(progress) {
  if (!workGateway || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stage = workGateway.querySelector('.work-gateway__stage');
  const media = workGateway.querySelector('[data-work-gateway-media]');
  const first = workGateway.querySelector('[data-work-gateway-first]');
  const last = workGateway.querySelector('[data-work-gateway-last]');
  if (!stage || !media || !first || !last) return;
  const cover = Math.max((stage.clientWidth + 8) / media.offsetWidth, (stage.clientHeight + 8) / media.offsetHeight);
  media.style.transform = `scale(${(cover * progress).toFixed(4)})`;
  if (innerWidth < 768) {
    const shift = stage.clientHeight * .62 * progress;
    first.style.transform = `translate(50%, ${-shift}px)`;
    last.style.transform = `translate(-50%, ${shift}px)`;
  } else {
    const shift = stage.clientWidth * .65 * progress;
    first.style.transform = `translate3d(${-shift}px,0,0)`;
    last.style.transform = `translate3d(${shift}px,0,0)`;
  }
}

function updateStoryMotion() {
  const horizontal = !!horizontalStage && matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)').matches;

  // Chapter I: match the reference's left 80% desktop and top 80% mobile triggers.
  const aboutStatement = document.querySelector('.home-about__statement');
  if (aboutStatement && !aboutStatement.classList.contains('is-visible')) {
    const rect = aboutStatement.getBoundingClientRect();
    if (horizontal ? (rect.left <= innerWidth * 0.80 && rect.right > 64) : rect.top <= innerHeight * 0.80) {
      aboutStatement.classList.add('is-visible');
      document.querySelector('.home-about__portrait')?.classList.add('is-visible');
      document.querySelector('.home-about__quote')?.classList.add('is-visible');
      document.querySelector('.home-about__aside')?.classList.add('is-visible');
    }
  }

  // Chapter II: Work (left 50% desktop, top 85% mobile).
  const workSection = document.querySelector('[data-section="home-work"], .home-work');
  if (workSection && !workSection.classList.contains('is-visible')) {
    const rect = workSection.getBoundingClientRect();
    if (horizontal ? (rect.left <= innerWidth * 0.50 && rect.right > 64) : rect.top <= innerHeight * 0.85) {
      workSection.classList.add('is-visible');
    }
  }

  // Chapter III: Services (start: "left 60%" from khanhnguyen.design)
  const servicesIntro = document.querySelector('.home-services__intro');
  const servicesStory = servicesIntro?.querySelector('[data-story-reveal]');
  if (servicesStory && !servicesStory.classList.contains('is-visible')) {
    const rect = servicesIntro.getBoundingClientRect();
    if (horizontal ? (rect.left <= innerWidth * 0.60 && rect.right > 64) : rect.top <= innerHeight * 0.85) {
      servicesStory.classList.add('is-visible');
    }
  }

  // Chapter IV: Experiences (left 75% desktop, top 85% mobile).
  const experienceList = document.querySelector('.home-experience__list');
  if (experienceList && !experienceList.classList.contains('is-visible')) {
    const rect = experienceList.getBoundingClientRect();
    if (horizontal ? (rect.left <= innerWidth * 0.75 && rect.right > 64) : rect.top <= innerHeight * 0.85) {
      experienceList.classList.add('is-visible');
      document.querySelector('.home-experience .home-kicker')?.classList.add('is-visible');
      document.querySelector('.home-experience__more')?.classList.add('is-visible');
    }
  }

  // Footer: Next chapter (start: "left 60%" from khanhnguyen.design)
  const contactSection = document.querySelector('.home-contact');
  const contactReveals = contactSection?.querySelectorAll('[data-story-reveal]');
  if (contactSection && contactReveals && contactReveals.length > 0 && !contactReveals[0].classList.contains('is-visible')) {
    const rect = contactSection.getBoundingClientRect();
    if (horizontal ? (rect.left <= innerWidth * 0.60 && rect.right > 64) : rect.top <= innerHeight * 0.70) {
      contactReveals.forEach(el => el.classList.add('is-visible'));
    }
  }

  // Generic fallback for any other targets
  for (const element of storyRevealTargets) {
    if (element.classList.contains('is-visible')) continue;
    const rect = element.getBoundingClientRect();
    if (horizontal ? (rect.left <= innerWidth * 0.60 && rect.right > 64) : rect.top <= innerHeight * 0.80) {
      element.classList.add('is-visible');
    }
  }

  for (const card of storyServiceCards) {
    if (innerWidth >= 768) { card.classList.remove('is-visible'); continue; }
    const rect = card.getBoundingClientRect();
    card.classList.toggle('is-visible', rect.top < innerHeight && rect.bottom > 0);
  }
  if (innerWidth < 768 && experienceRows.length === experienceLogos.length) {
    const center = innerHeight / 2;
    let active = 0;
    let distance = Infinity;
    experienceRows.forEach((row, index) => {
      const rect = row.getBoundingClientRect();
      const delta = Math.abs(rect.top + rect.height / 2 - center);
      if (delta < distance) { distance = delta; active = index; }
    });
    experienceRows.forEach((row, index) => row.classList.toggle('is-active', index === active));
    experienceLogos.forEach((logo, index) => logo.classList.toggle('is-active', index === active));
  }
  if (workGateway && !horizontal) {
    const rect = workGateway.getBoundingClientRect();
    const distance = Math.max(1, rect.height - innerHeight);
    updateWorkGateway(Math.max(0, Math.min(1, -rect.top / distance)));
  }
  if (pointerPosition && innerWidth >= 768 && storyPreviewImages.length) {
    const hovered = document.elementFromPoint(...pointerPosition)?.closest('[data-preview]');
    const key = hovered?.dataset.preview;
    storyPreviewImages.forEach(image => image.classList.toggle('is-active', !!key && image.dataset.previewImage === key));
  }
}

function initChapterTwo() {
  const section = document.querySelector('[data-section="home-work"], .home-work');
  if (!section) return;

  const list = section.querySelector('[data-work-list]');
  const items = [...section.querySelectorAll('[data-work-item-index]')];
  const textWraps = [...section.querySelectorAll('[data-work-item-text-wrap]')];
  const arrows = [...section.querySelectorAll('[data-work-item-arrow]')];
  const hoverLines = [...section.querySelectorAll('[data-work-hover-line]')];
  const placeholder = section.querySelector('[data-work-placeholder]');
  const images = [...section.querySelectorAll('[data-work-image]')];

  let activeIndex = null;
  let zIndexCounter = 1;
  let mousePos = null;

  function setRowActive(idx) {
    if (idx === activeIndex) return;
    activeIndex = idx;

    if (idx !== null && window.matchMedia('(min-width: 768px)').matches) {
      list?.classList.add('has-hover');
      items.forEach((item, i) => {
        const isMatch = String(item.dataset.workItemIndex) === String(idx);
        item.classList.toggle('is-hovered', isMatch);
        if (textWraps[i]) textWraps[i].style.opacity = isMatch ? '1' : '0.25';
      });

      if (placeholder) placeholder.style.opacity = '0';
      const targetImg = images.find(img => img.dataset.workImage === String(idx));
      if (targetImg) {
        zIndexCounter++;
        targetImg.style.zIndex = String(zIndexCounter);
        targetImg.classList.add('is-active');
        images.forEach(img => {
          if (img !== targetImg) {
            setTimeout(() => {
              if (img.dataset.workImage !== String(activeIndex)) {
                img.classList.remove('is-active');
              }
            }, 450);
          }
        });
      }
    } else {
      list?.classList.remove('has-hover');
      items.forEach((item, i) => {
        item.classList.remove('is-hovered');
        if (textWraps[i]) textWraps[i].style.removeProperty('opacity');
      });

      if (placeholder) placeholder.style.opacity = '1';
      images.forEach(img => {
        img.classList.remove('is-active');
      });
    }
  }

  items.forEach(item => {
    const idx = item.dataset.workItemIndex;
    item.addEventListener('pointerenter', () => setRowActive(idx));
    item.addEventListener('focusin', () => setRowActive(idx));
  });

  list?.addEventListener('pointerleave', (e) => {
    const next = e.relatedTarget;
    if (next instanceof Node && list.contains(next)) return;
    setRowActive(null);
  });

  // Underline animation on [data-to-link-underline]
  const ctaLinks = section.querySelectorAll('[data-to-link-underline]');
  ctaLinks.forEach(link => {
    link.addEventListener('pointerenter', () => link.setAttribute('data-underline-filled', 'true'));
    link.addEventListener('pointerleave', () => link.removeAttribute('data-underline-filled'));
    link.addEventListener('focusin', () => link.setAttribute('data-underline-filled', 'true'));
    link.addEventListener('focusout', () => link.removeAttribute('data-underline-filled'));
  });
}

if (workGateway) {
  initChapterTwo();
  document.addEventListener('pointermove', event => { pointerPosition = [event.clientX, event.clientY]; }, { passive: true });
  window.addEventListener('scroll', updateStoryMotion, { passive: true });
  window.addEventListener('resize', updateStoryMotion);
  window.addEventListener('portfolio:ready', updateStoryMotion);
  updateStoryMotion();
}
const siteRail = document.querySelector('.site-rail');
let railUpdateFrame = 0;
let activeRailTheme = '';
const railPanels = [...document.querySelectorAll('[data-header-bg][data-header-text]')];

function isHiddenRailPanel(panel) {
  return panel.getAttribute('aria-hidden') === 'true';
}

function railTheme(panel) {
  if (!panel || isHiddenRailPanel(panel)) return null;
  const { headerBg, headerText, headerBorder } = panel.dataset;
  if (!headerBg || !headerText) return null;
  return { bg: headerBg, text: headerText, border: headerBorder || '#5a524d' };
}

function pointIsInside(rect, x, y) {
  return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
}

function getActiveRailPanel() {
  if (!siteRail) return null;
  const header = siteRail.getBoundingClientRect();
  const centerX = innerWidth >= 768 ? header.right + 1 : header.left + header.width / 2;
  const centerY = header.top + header.height / 2;
  const centered = railPanels.find(panel => !isHiddenRailPanel(panel) && pointIsInside(panel.getBoundingClientRect(), centerX, centerY));
  if (centered) return centered;

  let best = null;
  let overlap = 0;
  for (const panel of railPanels) {
    if (isHiddenRailPanel(panel)) continue;
    const rect = panel.getBoundingClientRect();
    if (centerY < rect.top || centerY >= rect.bottom) continue;
    const width = Math.min(rect.right, header.right) - Math.max(rect.left, header.left);
    if (width > overlap) { overlap = width; best = panel; }
  }
  return best;
}

function updateRail() {
  if (!siteRail) return;
  const progress = siteRail.querySelector('.rail-scroll-progress');
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const fraction = maxScroll ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0;
  if (progress) progress.style.transform = innerWidth < 768 ? `scaleX(${fraction})` : `scaleY(${fraction})`;

  const panel = getActiveRailPanel();
  const theme = railTheme(panel);
  if (!theme) return;
  const themeKey = `${theme.bg}|${theme.text}|${theme.border}`;
  if (themeKey === activeRailTheme) return;
  activeRailTheme = themeKey;
  siteRail.style.setProperty('--rail-bg', theme.bg);
  siteRail.style.setProperty('--rail-text', theme.text);
  siteRail.style.setProperty('--rail-border', theme.border);
}

function queueRailUpdate() {
  if (railUpdateFrame) return;
  railUpdateFrame = requestAnimationFrame(() => {
    railUpdateFrame = 0;
    updateRail();
  });
}

if (siteRail) {
  const progress = document.createElement('span');
  progress.className = 'rail-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  siteRail.prepend(progress);
  window.addEventListener('scroll', queueRailUpdate, { passive: true });
  window.addEventListener('resize', queueRailUpdate);
  window.addEventListener('portfolio:ready', queueRailUpdate);
  queueRailUpdate();
}

if (horizontalStage) {
  const track = horizontalStage.querySelector('.page');
  const desktopMotion = matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
  let travel = 0;
  let gatewayStart = 0;
  let gatewayPause = 0;
  let current = 0;
  let target = 0;
  let frame = 0;

  function measure() {
    if (!desktopMotion.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      horizontalStage.style.height = '';
      track.style.transform = '';
      current = target = 0;
      updateStoryMotion();
      updateAboutMotion();
      queueRailUpdate();
      return;
    }
    const rail = siteRail?.getBoundingClientRect().width || 0;
    travel = Math.max(0, track.scrollWidth - (innerWidth - rail));
    gatewayPause = workGateway ? innerHeight : 0;
    gatewayStart = workGateway ? Math.max(0, Math.min(travel, workGateway.offsetLeft - ((innerWidth - rail) - workGateway.offsetWidth) / 2)) : 0;
    horizontalStage.style.height = `${travel + gatewayPause + innerHeight}px`;
    updateTarget();
    queueRailUpdate();
  }

  function tick() {
    current += (target - current) * 0.16;
    if (Math.abs(target - current) < 0.3) current = target;
    track.style.transform = `translate3d(${-current}px,0,0)`;
    updateStoryMotion();
    updateAboutMotion();
    queueRailUpdate();
    frame = current === target ? 0 : requestAnimationFrame(tick);
  }

  function updateTarget() {
    if (!desktopMotion.matches) return;
    const position = Math.max(0, scrollY - horizontalStage.offsetTop);
    const gatewayProgress = gatewayPause ? Math.max(0, Math.min(1, (position - gatewayStart) / gatewayPause)) : 0;
    updateWorkGateway(gatewayProgress);
    target = Math.max(0, Math.min(travel, position < gatewayStart ? position : position < gatewayStart + gatewayPause ? gatewayStart : position - gatewayPause));
    if (!frame) frame = requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', updateTarget, { passive: true });
  window.addEventListener('resize', measure);
  desktopMotion.addEventListener('change', measure);
  document.fonts?.ready.then(measure);
  measure();

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      if (!desktopMotion.matches) return;
      const id = link.getAttribute('href').slice(1);
      const destination = document.getElementById(id);
      if (!destination || !track.contains(destination)) return;
      event.preventDefault();
      const left = destination === track ? 0 : destination.offsetLeft;
      const distance = Math.min(left, travel);
      window.scrollTo({ top: horizontalStage.offsetTop + distance + (workGateway && distance > gatewayStart ? gatewayPause : 0), behavior: 'smooth' });
    });
  });
}
