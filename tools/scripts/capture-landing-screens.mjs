import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIRECTORY = join(REPO_ROOT, 'apps/web/public/landing/screens');
const DEMO_PROFILE = join(
  REPO_ROOT,
  'apps/api/tools/demo-dataset/vendor-profile.ts',
);
const BASE_URL = argument('--url') ?? 'http://localhost:4200';
const ONLY = argument('--only')?.split(',') ?? null;
const LAYOUTS = argument('--layout')?.split(',') ?? [
  'desktop',
  'mobile',
  'close-up',
];

const CAPTURE_SCALE = 2;
const WEBP_QUALITY = 86;
const SETTLE_MS = 1200;
const SECTOR = 'RAILWAY';
const GIFT_CODE = 'BIENVENUE-2026';
const XSRF_COOKIE = 'XSRF-TOKEN';
const XSRF_HEADER = 'X-XSRF-TOKEN';
const PERFECT_SCORE = 100;
const REACTIVITY_TARGET_PHASE = 2;
const REACTIVITY_TARGET_STIMULUS = 'BLUE';
const REACTIVITY_CENTER_SHARE = 0.5;
const REACTIVITY_WAIT_MS = 150000;
const GAME_WAIT_MS = 60000;
const LOGIC_ANSWERED_BEFORE_CAPTURE = 13;
const MEMORY_SEQUENCES_BEFORE_CAPTURE = 2;
const MOTRICITY_HARDEST_COURSE_INDEX = 2;
const MOTRICITY_COURSE_SHARE_BEFORE_CAPTURE = 0.5;
const MOTRICITY_SEGMENT_MIDPOINT = 0.5;
const KEY_DELAY_MS = 180;
const DISCRIMINATION_SUBTLE_PAIRS = ['B8', 'S5', 'Z2'];
const DISCRIMINATION_LENGTH_TOLERANCE = 1;
const MOTION_TICK_MS = 16;
const MOTION_TURNS_PER_SECOND = 0.85;
const MOTION_HANDLE_SWEEP_TURNS = 5 / 6;
const MOTION_VERTICAL_SPEED_RATIO = 0.85;
const MOTION_START_SHARE = 0.15;
const MOTION_FLUSH_MS = 1;
const CONTROLLER_COMPONENT = 'app-manette';
const CONTROLLER_MOTION_MS = 2400;
const CONTROLLER_CAPTURE_DELAY_MS = 1000;
const WEAK_AXIS = 'VISUAL_DISCRIMINATION';
const WEAK_AXIS_BEST_SCORE = 59;
const WEAK_AXIS_LAST_EXAM_SCORE = 57;

const HOUR_MS = 3600000;
const CAPTURE_HOUR = 10;
const CAPTURE_MINUTE = 30;
const RELAY_TRANSPORT_QUERY = 'transport=relay';
const PHONE_WIFI_DELAY_MS = 14;
const DEMO_BADGE_FEED = [
  { label: 'Nathan', badgeId: 'EXAM_FAVORABLE', hoursAgo: 2 },
  { label: 'Inès', badgeId: 'LOGIC_EXCELLENCE', hoursAgo: 3 },
  { label: 'Un candidat', badgeId: 'DISCRIMINATION_PROGRESSION', hoursAgo: 5 },
  { label: 'Sofia', badgeId: 'MEMORY_EXCELLENCE', hoursAgo: 6 },
  { label: 'Karim', badgeId: 'REACTIVITY_PERFECTION', hoursAgo: 8 },
  { label: 'Léa', badgeId: 'EXAM_FIRST', hoursAgo: 11 },
];

const HIDE_SCROLLBARS_CSS =
  'html{scrollbar-gutter:auto!important;scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}';

const VIEWPORT = {
  dashboard: { width: 1226, height: 780 },
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 819 },
  controller: { width: 844, height: 390 },
  mobile: { width: 390, height: 844 },
  closeUp: { width: 390, height: 547 },
  closeUpLogic: { width: 390, height: 600 },
  closeUpMemory: { width: 390, height: 720 },
  closeUpMotricity: { width: 390, height: 600 },
};

const OUTPUT_SIZE = {
  dashboard: { width: 1616, height: 1028 },
  desktop: { width: 1180, height: 738 },
  phone: { width: 440, height: 924 },
  controller: { width: 456, height: 211 },
  mobile: { width: 532, height: 1151 },
  closeUp: { width: 532, height: 746 },
};

const MOBILE_DEVICE = { isMobile: true, hasTouch: true };

const AXIS_ROUTE = {
  LOGIC: 'logique',
  MEMORY: 'memoire',
  VISUAL_DISCRIMINATION: 'discrimination-visuelle',
  REACTIVITY: 'reactivite',
  MOTOR_SKILLS: 'motricite',
};

const ACCOUNT_SCREENS = [
  'accueil',
  'entrainements-cible',
  'bilan-examen-blanc',
  'resultat-reactivite',
  'progression',
];

const GAME_SCREENS = [
  'matrices-distribution',
  'triangles',
  'memoire',
  'discrimination',
  'motricite',
  'reactivite',
  'dominos-mobile',
];

const LAYOUT = {
  desktop: {
    name: 'desktop',
    viewport: VIEWPORT.desktop,
    size: OUTPUT_SIZE.desktop,
    device: {},
    directory: '',
    screens: [...ACCOUNT_SCREENS, ...GAME_SCREENS],
  },
  mobile: {
    name: 'mobile',
    viewport: VIEWPORT.mobile,
    size: OUTPUT_SIZE.mobile,
    device: MOBILE_DEVICE,
    directory: 'mobile',
    screens: [
      'entrainements-cible',
      'bilan-examen-blanc',
      'resultat-reactivite',
      'progression',
      'matrices-distribution',
      'motricite',
    ],
  },
  'close-up': {
    name: 'close-up',
    viewport: VIEWPORT.closeUp,
    size: OUTPUT_SIZE.closeUp,
    device: MOBILE_DEVICE,
    directory: 'mobile-close-up',
    viewports: {
      triangles: VIEWPORT.closeUpLogic,
      memoire: VIEWPORT.closeUpMemory,
      motricite: VIEWPORT.closeUpMotricity,
    },
    motricityInMotion: true,
    screens: [
      'triangles',
      'memoire',
      'discrimination',
      'reactivite',
      'motricite',
    ],
  },
};

const LOGIC_CAPTURES = [
  {
    name: 'matrices-distribution',
    family: 'MATRIX',
    target: 'DISTRIBUTION',
    elapsed: '06:48',
  },
  {
    name: 'triangles',
    family: 'NUMERIC',
    target: 'TRIANGLE',
    elapsed: '04:30',
  },
  {
    name: 'dominos-mobile',
    family: 'DOMINO',
    target: 'DOMINO',
    elapsed: '05:47',
    viewport: VIEWPORT.phone,
    size: OUTPUT_SIZE.phone,
    device: MOBILE_DEVICE,
  },
];

const PLAY_COMPONENT = {
  LOGIC: 'app-logic-play',
  MEMORY: 'app-memory-play',
  VISUAL_DISCRIMINATION: 'app-discrimination-play',
  REACTIVITY: 'app-reactivity-play',
  MOTOR_SKILLS: 'app-motricity-play',
};

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function wanted(name, layout) {
  return (
    (ONLY === null || ONLY.includes(name)) && layout.screens.includes(name)
  );
}

function viewportFor(name, layout) {
  return layout.viewports?.[name] ?? layout.viewport;
}

function outputSizeFor(name, layout) {
  const viewport = viewportFor(name, layout);
  return {
    width: layout.size.width,
    height: Math.round((viewport.height * layout.size.width) / viewport.width),
  };
}

function demoCredentials() {
  const profile = readFileSync(DEMO_PROFILE, 'utf8');
  return {
    email: profile.match(/DEMO_EMAIL = '([^']+)'/)[1],
    password: profile.match(/DEMO_PASSWORD = '([^']+)'/)[1],
  };
}

async function xsrfHeaders(context) {
  const cookies = await context.cookies(BASE_URL);
  const token = cookies.find((cookie) => cookie.name === XSRF_COOKIE)?.value;
  return token ? { [XSRF_HEADER]: token } : {};
}

async function api(context, method, path, data) {
  const response = await context.request.fetch(`${BASE_URL}/api${path}`, {
    method,
    data,
    headers: method === 'GET' ? {} : await xsrfHeaders(context),
  });
  if (!response.ok()) {
    throw new Error(`${method} ${path} -> ${response.status()}`);
  }
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

async function listSessions(context, query) {
  const sessions = [];
  let cursor = null;
  do {
    const search = new URLSearchParams({
      ...query,
      ...(cursor ? { cursor } : {}),
    });
    const page = await api(context, 'GET', `/sessions?${search}`);
    sessions.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return sessions;
}

async function openContext(browser, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: CAPTURE_SCALE,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    ...options,
  });
  await context.addInitScript((css) => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.append(style);
    });
  }, HIDE_SCROLLBARS_CSS);
  return context;
}

async function save(page, name, size, directory = '') {
  const shot = await page.screenshot({ type: 'png' });
  const target = join(OUTPUT_DIRECTORY, directory);
  mkdirSync(target, { recursive: true });
  const info = await sharp(shot)
    .resize({ ...size, fit: 'cover', position: 'top', kernel: 'lanczos3' })
    .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
    .toFile(join(target, `${name}.webp`));
  console.log(
    `${join(directory, name)}.webp ${info.width}x${info.height} ${info.size} o`,
  );
}

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page
    .locator('ui-skeleton')
    .first()
    .waitFor({ state: 'detached', timeout: 15000 })
    .catch(() => undefined);
  await page.waitForTimeout(SETTLE_MS);
}

async function dismissCelebrations(page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    if ((await page.locator('ui-badge-celebration-modal').count()) === 0) {
      return;
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

function captureMorning() {
  const morning = new Date();
  morning.setHours(CAPTURE_HOUR, CAPTURE_MINUTE, 0, 0);
  return morning;
}

async function serveDemoBadgeFeed(context, now) {
  await context.route('**/api/me/badges/feed', (route) =>
    route.fulfill({
      json: {
        visible: true,
        entries: DEMO_BADGE_FEED.map(({ label, badgeId, hoursAgo }) => ({
          label,
          badgeId,
          sector: SECTOR,
          earnedAt: new Date(now.getTime() - hoursAgo * HOUR_MS).toISOString(),
        })),
      },
    }),
  );
}

async function patchResponse(page, pattern, patch) {
  await page.route(pattern, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: patch(await response.json()) });
  });
}

async function lowerWeakAxis(page) {
  await patchResponse(page, '**/api/me/trainings/overview*', (overview) => ({
    ...overview,
    axes: overview.axes.map((entry) =>
      entry.axis === WEAK_AXIS
        ? { ...entry, bestScore: WEAK_AXIS_BEST_SCORE }
        : entry,
    ),
  }));
  await patchResponse(page, '**/api/me/progression*', (progression) => ({
    ...progression,
    radar: {
      ...progression.radar,
      last: progression.radar.last.map((entry) =>
        entry.axis === WEAK_AXIS
          ? { ...entry, score: WEAK_AXIS_LAST_EXAM_SCORE }
          : entry,
      ),
    },
  }));
}

async function captureAccountScreens(browser, layout) {
  const context = await openContext(browser, layout.viewport, {
    ...layout.device,
    reducedMotion: 'reduce',
  });
  const morning = captureMorning();
  await context.clock.install({ time: morning });
  await serveDemoBadgeFeed(context, morning);
  await api(context, 'POST', '/auth/login', demoCredentials());
  const [lastExam] = await listSessions(context, { mode: 'FULL' });
  const reactivitySessions = (
    await listSessions(context, { mode: 'TARGETED', axis: 'REACTIVITY' })
  ).filter((session) => session.status === 'COMPLETED');
  const reactivityResult =
    reactivitySessions.find((session) => session.score < PERFECT_SCORE) ??
    reactivitySessions[0];

  const screens = [
    {
      name: 'accueil',
      path: '/dashboard',
      viewport: VIEWPORT.dashboard,
      size: OUTPUT_SIZE.dashboard,
      prepare: lowerWeakAxis,
    },
    { name: 'entrainements-cible', path: '/entrainements?panel=cible' },
    { name: 'bilan-examen-blanc', path: `/sessions/${lastExam.id}/resultat` },
    {
      name: 'resultat-reactivite',
      path: `/entrainements/cible/${AXIS_ROUTE.REACTIVITY}/session/${reactivityResult.id}/resultat`,
    },
    { name: 'progression', path: '/progression' },
  ];

  for (const screen of screens.filter(({ name }) => wanted(name, layout))) {
    const page = await context.newPage();
    await screen.prepare?.(page);
    await page.setViewportSize(screen.viewport ?? layout.viewport);
    await page.goto(`${BASE_URL}${screen.path}`);
    await settle(page);
    await dismissCelebrations(page);
    await save(page, screen.name, screen.size ?? layout.size, layout.directory);
    await page.close();
  }
  await context.close();
}

async function registerCaptureAccount(context) {
  await api(context, 'POST', '/auth/register', {
    email: `capture.landing.${Date.now().toString(36)}@example.com`,
    password: randomBytes(18).toString('base64url'),
    firstName: 'Capture',
    lastName: 'Landing',
    currentSector: SECTOR,
    locale: 'fr',
    timezone: 'Europe/Paris',
  });
  await api(context, 'GET', '/me');
  await api(context, 'POST', '/me/energy/gift-codes', { code: GIFT_CODE });
}

async function openTargetedSession(
  context,
  page,
  axis,
  logicFamily = null,
  query = '',
) {
  const session = await api(context, 'POST', '/sessions', {
    mode: 'TARGETED',
    sector: SECTOR,
    axis,
    options: { enabledOptions: [], logicFamily },
  });
  await page.goto(
    `${BASE_URL}/entrainements/cible/${AXIS_ROUTE[axis]}/session/${session.id}${query}`,
  );
  await page.waitForLoadState('networkidle');
  const countdown = page.locator('ui-axis-countdown');
  await countdown.waitFor({ state: 'attached', timeout: GAME_WAIT_MS });
  await countdown.waitFor({ state: 'detached', timeout: GAME_WAIT_MS });
}

async function captureLogic(browser, storageState, capture, layout) {
  const context = await openContext(
    browser,
    capture.viewport ?? viewportFor(capture.name, layout),
    {
      ...(capture.device ?? layout.device),
      storageState,
    },
  );
  await context.clock.install();
  const page = await context.newPage();
  await openTargetedSession(context, page, 'LOGIC', capture.family);
  await page.clock.fastForward(capture.elapsed);
  await page.evaluate(
    ({ selector, answered, target }) => {
      const play = window.ng.getComponent(document.querySelector(selector));
      const matches = (item) =>
        target === 'DISTRIBUTION'
          ? item.matrix?.structure === 'DISTRIBUTION'
          : target === 'TRIANGLE'
            ? item.structure === 'TRIANGLE'
            : item.family === 'DOMINO';
      const items = play.items();
      const matching = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => matches(item))
        .map(({ index }) => index);
      const targetIndex =
        matching.find((index) => index >= answered) ??
        matching.at(-1) ??
        answered;
      for (let index = 0; index < targetIndex; index++) {
        const item = items[play.currentIndex()];
        if (item.family === 'DOMINO') {
          play.selectFace('top');
          play.enterDominoDigit(item.domino.answer?.top ?? 3);
          play.enterDominoDigit(item.domino.answer?.bottom ?? 5);
        } else {
          play.select(item.answerIndex ?? 0);
        }
        play.confirmNext();
      }
    },
    {
      selector: PLAY_COMPONENT.LOGIC,
      answered: LOGIC_ANSWERED_BEFORE_CAPTURE,
      target: capture.target,
    },
  );
  await page.waitForTimeout(SETTLE_MS);
  await save(
    page,
    capture.name,
    capture.size ?? outputSizeFor(capture.name, layout),
    layout.directory,
  );
  await context.close();
}

async function captureMemory(context, page, layout) {
  await page.setViewportSize(viewportFor('memoire', layout));
  await openTargetedSession(context, page, 'MEMORY');
  const readDigits = () =>
    page.evaluate((selector) => {
      const play = window.ng.getComponent(document.querySelector(selector));
      const sequence = play.currentSequence();
      return Object.values(sequence).find(
        (value) =>
          Array.isArray(value) && value.every((d) => typeof d === 'number'),
      );
    }, PLAY_COMPONENT.MEMORY);
  const waitForRestitution = () =>
    page.waitForFunction(
      (selector) =>
        window.ng.getComponent(document.querySelector(selector)).stage() ===
        'RESTITUTION',
      PLAY_COMPONENT.MEMORY,
      { timeout: GAME_WAIT_MS },
    );
  for (let done = 0; done <= MEMORY_SEQUENCES_BEFORE_CAPTURE; done++) {
    await waitForRestitution();
    const digits = await readDigits();
    const typed =
      done < MEMORY_SEQUENCES_BEFORE_CAPTURE ? digits : digits.slice(0, -1);
    for (const digit of typed) {
      await page.keyboard.press(String(digit));
      await page.waitForTimeout(KEY_DELAY_MS);
    }
    if (done < MEMORY_SEQUENCES_BEFORE_CAPTURE) {
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        (selector) =>
          window.ng.getComponent(document.querySelector(selector)).stage() !==
          'RESTITUTION',
        PLAY_COMPONENT.MEMORY,
        { timeout: GAME_WAIT_MS },
      );
    }
  }
  await page.waitForTimeout(SETTLE_MS);
  await save(
    page,
    'memoire',
    outputSizeFor('memoire', layout),
    layout.directory,
  );
}

async function captureDiscrimination(context, page, layout) {
  await page.setViewportSize(viewportFor('discrimination', layout));
  await openTargetedSession(context, page, 'VISUAL_DISCRIMINATION');
  await page.evaluate(
    ({ selector, subtlePairs, lengthTolerance }) => {
      const play = window.ng.getComponent(document.querySelector(selector));
      const trials = play.trials().map((trial, index) => ({ trial, index }));
      const longest = Math.max(...trials.map(({ trial }) => trial.a.length));
      const shapesIn = (trial) =>
        trial.a.filter((element) => element.kind === 'SHAPE').length;
      const legibleDifference = (trial) => {
        const position = trial.a.findIndex(
          (element, index) =>
            JSON.stringify(element) !== JSON.stringify(trial.b[index]),
        );
        const before = trial.a[position];
        const after = trial.b[position];
        return before.kind === 'CHAR' &&
          after.kind === 'CHAR' &&
          !subtlePairs.some(
            (pair) => pair.includes(before.value) && pair.includes(after.value),
          )
          ? 1
          : 0;
      };
      const [target] = trials
        .filter(
          ({ trial, index }) =>
            index >= play.currentIndex() &&
            !trial.identical &&
            trial.a.length >= longest - lengthTolerance,
        )
        .sort(
          (left, right) =>
            legibleDifference(right.trial) - legibleDifference(left.trial) ||
            shapesIn(left.trial) - shapesIn(right.trial) ||
            right.trial.a.length - left.trial.a.length,
        );
      while (play.currentIndex() < target.index) {
        play.answer('IDENTICAL');
      }
    },
    {
      selector: PLAY_COMPONENT.VISUAL_DISCRIMINATION,
      subtlePairs: DISCRIMINATION_SUBTLE_PAIRS,
      lengthTolerance: DISCRIMINATION_LENGTH_TOLERANCE,
    },
  );
  await page.waitForTimeout(SETTLE_MS);
  await save(
    page,
    'discrimination',
    outputSizeFor('discrimination', layout),
    layout.directory,
  );
}

async function captureReactivity(context, page, layout) {
  await page.setViewportSize(viewportFor('reactivite', layout));
  await openTargetedSession(context, page, 'REACTIVITY');
  await page.waitForFunction(
    ({ selector, phase, stimulus, centerShare }) => {
      const play = window.ng.getComponent(document.querySelector(selector));
      const active = play.activeStimulus();
      return (
        play.phase() >= phase &&
        play.transitionCard() === null &&
        active?.stimulus.type === stimulus &&
        Math.abs(active.stimulus.position.fx) <= centerShare &&
        Math.abs(active.stimulus.position.fy) <= centerShare
      );
    },
    {
      selector: PLAY_COMPONENT.REACTIVITY,
      phase: REACTIVITY_TARGET_PHASE,
      stimulus: REACTIVITY_TARGET_STIMULUS,
      centerShare: REACTIVITY_CENTER_SHARE,
    },
    { timeout: REACTIVITY_WAIT_MS, polling: 16 },
  );
  await save(
    page,
    'reactivite',
    outputSizeFor('reactivite', layout),
    layout.directory,
  );
}

async function pairGamepad(browser, page) {
  const token = await page
    .waitForFunction(
      (selector) =>
        window.ng
          .getComponent(document.querySelector(selector))
          .gamepadPairing()?.token ?? null,
      PLAY_COMPONENT.MOTOR_SKILLS,
      { timeout: GAME_WAIT_MS },
    )
    .then((handle) => handle.jsonValue());
  const phone = await openContext(browser, VIEWPORT.controller, {
    isMobile: true,
    hasTouch: true,
  });
  await phone.addInitScript((delayMs) => {
    const send = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      setTimeout(() => send.call(this, data), delayMs);
    };
  }, PHONE_WIFI_DELAY_MS);
  const controller = await phone.newPage();
  await controller.goto(
    `${BASE_URL}/manette?t=${token}&${RELAY_TRANSPORT_QUERY}`,
  );
  await page.waitForFunction(
    (selector) => {
      const play = window.ng.getComponent(document.querySelector(selector));
      return play.gamepadConnected() && play.gamepadLatency() !== null;
    },
    PLAY_COMPONENT.MOTOR_SKILLS,
    { timeout: GAME_WAIT_MS },
  );
  return phone;
}

async function captureControllerInMotion(page, controller, direction, layout) {
  const radiansPerMs =
    (MOTION_TURNS_PER_SECOND * 2 * Math.PI) /
    1000 /
    Math.max(Math.abs(direction.unitX), Math.abs(direction.unitY));
  const motion = controller.evaluate(
    ({ selector, horizontalStep, verticalStep, durationMs }) =>
      new Promise((resolve) => {
        const manette = window.ng.getComponent(
          document.querySelector(selector),
        );
        const [horizontal, vertical] = [
          ...document.querySelectorAll('ui-crank'),
        ].map((element) => window.ng.getComponent(element));
        const start = performance.now();
        let previous = start;
        const turn = (now) => {
          const elapsed = now - previous;
          previous = now;
          manette.onLeftRotate(horizontalStep * elapsed);
          manette.onRightRotate(verticalStep * elapsed);
          horizontal.handleAngle.update(
            (angle) => angle + horizontalStep * elapsed,
          );
          vertical.handleAngle.update(
            (angle) => angle + verticalStep * elapsed,
          );
          if (now - start < durationMs) {
            requestAnimationFrame(turn);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(turn);
      }),
    {
      selector: CONTROLLER_COMPONENT,
      horizontalStep: radiansPerMs * direction.unitX,
      verticalStep:
        radiansPerMs * direction.unitY * MOTION_VERTICAL_SPEED_RATIO,
      durationMs: CONTROLLER_MOTION_MS,
    },
  );
  await controller.waitForTimeout(CONTROLLER_CAPTURE_DELAY_MS);
  await save(
    controller,
    'manette-paysage',
    OUTPUT_SIZE.controller,
    layout.directory,
  );
  await save(
    page,
    'motricite',
    outputSizeFor('motricite', layout),
    layout.directory,
  );
  await motion;
}

async function captureMotricity(browser, context, page, layout) {
  const paired = layout === LAYOUT.desktop;
  await page.setViewportSize(viewportFor('motricite', layout));
  await openTargetedSession(
    context,
    page,
    'MOTOR_SKILLS',
    null,
    paired ? `?${RELAY_TRANSPORT_QUERY}` : '',
  );
  const phone = paired ? await pairGamepad(browser, page) : null;
  const direction = await page.evaluate(
    ({ selector, courseIndex, courseShare, segmentShare }) => {
      const play = window.ng.getComponent(document.querySelector(selector));
      play.beginCourse(courseIndex);
      const { segments } = play.course();
      const widthOf = (segment) => segment.end.x - segment.start.x;
      const heightOf = (segment) => segment.end.y - segment.start.y;
      const lengths = segments.map((segment) =>
        Math.hypot(widthOf(segment), heightOf(segment)),
      );
      const total = lengths.reduce((sum, length) => sum + length, 0);
      let walked = 0;
      const [candidate] = segments
        .map((segment, index) => {
          const share = (walked + lengths[index] / 2) / total;
          walked += lengths[index];
          return { segment, share, length: lengths[index] };
        })
        .filter(
          ({ segment }) =>
            Math.abs(widthOf(segment)) > 1 && Math.abs(heightOf(segment)) > 1,
        )
        .sort(
          (left, right) =>
            Number(widthOf(right.segment) * heightOf(right.segment) < 0) -
              Number(widthOf(left.segment) * heightOf(left.segment) < 0) ||
            Math.abs(left.share - courseShare) -
              Math.abs(right.share - courseShare),
        );
      const target =
        candidate?.segment ?? segments[Math.floor(segments.length / 2)];
      const length = Math.hypot(widthOf(target), heightOf(target));
      const point = {
        x: target.start.x + widthOf(target) * segmentShare,
        y: target.start.y + heightOf(target) * segmentShare,
      };
      play.position = point;
      play.cursorX.set(point.x);
      play.cursorY.set(point.y);
      return {
        unitX: widthOf(target) / length,
        unitY: heightOf(target) / length,
      };
    },
    {
      selector: PLAY_COMPONENT.MOTOR_SKILLS,
      courseIndex: MOTRICITY_HARDEST_COURSE_INDEX,
      courseShare: MOTRICITY_COURSE_SHARE_BEFORE_CAPTURE,
      segmentShare: paired ? MOTION_START_SHARE : MOTRICITY_SEGMENT_MIDPOINT,
    },
  );
  if (phone) {
    await captureControllerInMotion(page, phone.pages()[0], direction, layout);
    await phone.close();
    return;
  }
  await page.waitForTimeout(SETTLE_MS);
  await save(
    page,
    'motricite',
    outputSizeFor('motricite', layout),
    layout.directory,
  );
}

async function captureMotricityInMotion(browser, storageState, layout) {
  const context = await openContext(browser, viewportFor('motricite', layout), {
    ...layout.device,
    storageState,
  });
  await context.clock.install();
  const page = await context.newPage();
  await openTargetedSession(context, page, 'MOTOR_SKILLS');
  const direction = await page.evaluate(
    ({ selector, courseIndex, startShare }) => {
      const play = window.ng.getComponent(document.querySelector(selector));
      play.beginCourse(courseIndex);
      const widthOf = (segment) => segment.end.x - segment.start.x;
      const heightOf = (segment) => segment.end.y - segment.start.y;
      const lengthOf = (segment) =>
        Math.hypot(widthOf(segment), heightOf(segment));
      const diagonals = play
        .course()
        .segments.filter(
          (segment) =>
            Math.abs(widthOf(segment)) > 1 && Math.abs(heightOf(segment)) > 1,
        )
        .sort((left, right) => lengthOf(right) - lengthOf(left));
      const target =
        diagonals.find((segment) => widthOf(segment) * heightOf(segment) < 0) ??
        diagonals[0];
      const length = lengthOf(target);
      const unitX = widthOf(target) / length;
      const unitY = heightOf(target) / length;
      const point = {
        x: target.start.x + unitX * length * startShare,
        y: target.start.y + unitY * length * startShare,
      };
      play.position = point;
      play.cursorX.set(point.x);
      play.cursorY.set(point.y);
      return { unitX, unitY };
    },
    {
      selector: PLAY_COMPONENT.MOTOR_SKILLS,
      courseIndex: MOTRICITY_HARDEST_COURSE_INDEX,
      startShare: MOTION_START_SHARE,
    },
  );
  const handleStep =
    (MOTION_TURNS_PER_SECOND * 2 * Math.PI * MOTION_TICK_MS) / 1000;
  const radiansPerTick =
    handleStep / Math.max(Math.abs(direction.unitX), Math.abs(direction.unitY));
  const ticks = Math.round(
    (MOTION_HANDLE_SWEEP_TURNS * 2 * Math.PI) / handleStep,
  );
  await page.clock.pauseAt(
    (await page.evaluate(() => Date.now())) + MOTION_TICK_MS,
  );
  for (let tick = 0; tick < ticks; tick++) {
    await page.evaluate(
      ({ selector, deltaX, deltaY }) => {
        const play = window.ng.getComponent(document.querySelector(selector));
        const [horizontal, vertical] = [
          ...document.querySelectorAll('ui-crank'),
        ].map((element) => window.ng.getComponent(element));
        play.onCrankRotate('x', deltaX);
        play.onCrankRotate('y', deltaY);
        horizontal.handleAngle.update((angle) => angle + deltaX);
        vertical.handleAngle.update((angle) => angle + deltaY);
      },
      {
        selector: PLAY_COMPONENT.MOTOR_SKILLS,
        deltaX: radiansPerTick * direction.unitX,
        deltaY: radiansPerTick * direction.unitY * MOTION_VERTICAL_SPEED_RATIO,
      },
    );
    await page.clock.runFor(MOTION_TICK_MS);
  }
  await page.clock.runFor(MOTION_FLUSH_MS);
  await save(
    page,
    'motricite',
    outputSizeFor('motricite', layout),
    layout.directory,
  );
  await context.close();
}

async function captureGameScreens(browser, layout) {
  const context = await openContext(browser, layout.viewport, layout.device);
  await registerCaptureAccount(context);
  const storageState = await context.storageState();
  const page = await context.newPage();

  for (const capture of LOGIC_CAPTURES.filter(({ name }) =>
    wanted(name, layout),
  )) {
    await captureLogic(browser, storageState, capture, layout);
  }
  if (wanted('memoire', layout)) {
    await captureMemory(context, page, layout);
  }
  if (wanted('discrimination', layout)) {
    await captureDiscrimination(context, page, layout);
  }
  if (wanted('motricite', layout)) {
    await (layout.motricityInMotion
      ? captureMotricityInMotion(browser, storageState, layout)
      : captureMotricity(browser, context, page, layout));
  }
  if (wanted('reactivite', layout)) {
    await captureReactivity(context, page, layout);
  }
  await context.close();
}

const browser = await chromium.launch();
try {
  for (const layout of LAYOUTS.map((name) => LAYOUT[name])) {
    if (ACCOUNT_SCREENS.some((name) => wanted(name, layout))) {
      await captureAccountScreens(browser, layout);
    }
    if (GAME_SCREENS.some((name) => wanted(name, layout))) {
      await captureGameScreens(browser, layout);
    }
  }
} finally {
  await browser.close();
}
