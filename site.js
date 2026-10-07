// The site's one script (lane 24b): the language, and on 404.html what a
// link path means. It makes no request with a code or a token: it reads the
// address the visitor already has and shows text. The patterns equal the
// app's (packages/core/src/invitations/link.ts); scripts/site.test.mjs holds
// them together.

import en from './i18n/en.js';
import lt from './i18n/lt.js';

export const STRINGS = { en, lt };

/** The invitation alphabet: no 0, O, 1, I or L (SPEC 4.1). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** A public link's code, in capitals as the link carries it. */
export const PUBLIC_CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{12}$`);
/** An invitation token: 32 random bytes, base64url without padding. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * What a path is: a public link or an invitation, valid or not, or anything
 * else. It takes the path alone (location.pathname), so a query or a fragment
 * after the code or token is ignored, as the app ignores it (the #73 review,
 * R3); nothing else is normalised.
 */
export function linkKind(path) {
  for (const [prefix, pattern] of [
    ['/l/', PUBLIC_CODE_PATTERN],
    ['/invite/', TOKEN_PATTERN],
  ]) {
    if (path.startsWith(prefix)) {
      return pattern.test(path.slice(prefix.length)) ? 'link' : 'invalid';
    }
  }
  return 'other';
}

/** The language: Lithuanian for a browser that prefers it, otherwise English. */
export function languageOf(preferred) {
  const first = (preferred ?? []).find((tag) => /^(lt|en)(?:[-_]|$)/i.test(tag));
  return first && first.toLowerCase().startsWith('lt') ? 'lt' : 'en';
}

/** A phone or a tablet, where the app can be installed. */
export function isPhone(userAgent, maxTouchPoints) {
  return (
    /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  );
}

function show(language) {
  const strings = STRINGS[language];
  document.documentElement.lang = language;
  for (const element of document.querySelectorAll('[data-text]')) {
    element.textContent = strings[element.dataset.text];
  }
  for (const element of document.querySelectorAll('[data-label]')) {
    element.setAttribute('aria-label', strings[element.dataset.label]);
  }
  for (const button of document.querySelectorAll('[data-language]')) {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  }
}

function reveal(selector) {
  for (const element of document.querySelectorAll(selector)) element.hidden = false;
}

function start() {
  let language = languageOf(navigator.languages);
  for (const button of document.querySelectorAll('[data-language]')) {
    button.addEventListener('click', () => {
      language = button.dataset.language;
      show(language);
    });
  }
  const phone = isPhone(navigator.userAgent, navigator.maxTouchPoints);
  reveal(phone ? '[data-on="phone"]' : '[data-on="computer"]');
  if (document.body.dataset.page === 'fallback') {
    const kind = linkKind(location.pathname);
    reveal(`[data-when="${kind}"]`);
    const copy = document.querySelector('[data-copy]');
    const status = document.querySelector('[data-copy-status]');
    copy?.addEventListener('click', async () => {
      try {
        // The link without a query or a fragment (a tracking parameter, #main).
        await navigator.clipboard.writeText(location.origin + location.pathname);
        status.dataset.text = 'linkCopied';
      } catch {
        status.dataset.text = 'copyFailed';
      }
      status.textContent = STRINGS[language][status.dataset.text];
    });
  }
  show(language);
}

if (typeof document !== 'undefined') start();
