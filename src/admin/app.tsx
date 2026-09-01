/**
 * Admin QoL: thumbnail previews on collapsed component accordions.
 *
 * Strapi's collapsed repeatable-component entries only show a text label, so
 * galleries and hero slides are unidentifiable without expanding each one.
 * This extension decorates accordion headers with the media they contain:
 *   - repertory `gallery` rows  → a strip of their items' thumbnails
 *   - gallery items (row open)  → their own image thumbnail
 *   - hero `slides`             → the slide's media thumbnail
 *
 * How it works (no extra requests, no auth handling):
 *   1. window.fetch is wrapped to capture the edit view's own document GET
 *      (`/content-manager/(collection|single)-types/...`) — that response
 *      already contains every media URL, in the same order the accordions
 *      render.
 *   2. A MutationObserver decorates new accordion triggers by index-matching
 *      them to the captured data.
 * Everything is best-effort: if Strapi's admin DOM changes, decoration
 * silently does nothing.
 */

const THUMB = 28;

let docData: any = null;
let scheduled = false;

const thumbUrl = (media: any): string | null => {
  if (!media) return null;
  if ((media.mime ?? '').startsWith('video/')) return 'video';
  return media.formats?.thumbnail?.url ?? media.url ?? null;
};

/** The accordion-entry container elements (rows/items/slides) inside a list. */
const entriesOf = (list: Element) =>
  [...list.children].filter((c) => c.querySelector(':scope > * > h3 > button, :scope h3 > button'));

/** Climb from an accordion list to the repeatable field's label ("gallery (4)"). */
function fieldNameFor(list: Element | null): string | null {
  let el: Element | null = list;
  for (let i = 0; i < 12 && el; i++) {
    let sib = el.previousElementSibling;
    while (sib) {
      const text = (sib.textContent ?? '').trim().toLowerCase();
      const m = text.match(/^(gallery|slides|items|links|seo)\s*\(?/);
      if (m) return m[1];
      sib = sib.previousElementSibling;
    }
    el = el.parentElement;
  }
  return null;
}

function makeStrip(urls: (string | null)[]): HTMLElement | null {
  const usable = urls.filter(Boolean).slice(0, 8) as string[];
  if (!usable.length) return null;
  const strip = document.createElement('span');
  strip.setAttribute('data-ws-thumbs', '');
  strip.style.cssText = `display:inline-flex;gap:4px;align-items:center;margin-left:auto;padding:0 12px;flex:none`;
  for (const u of usable) {
    if (u === 'video') {
      const badge = document.createElement('span');
      badge.textContent = '▶';
      badge.style.cssText = `width:${THUMB}px;height:${THUMB}px;border-radius:3px;background:#32324d;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;flex:none`;
      strip.appendChild(badge);
    } else {
      const img = document.createElement('img');
      img.src = u;
      img.loading = 'lazy';
      img.style.cssText = `width:${THUMB}px;height:${THUMB}px;object-fit:cover;border-radius:3px;flex:none`;
      strip.appendChild(img);
    }
  }
  return strip;
}

function decorate() {
  if (!docData) return;
  const triggers = document.querySelectorAll<HTMLButtonElement>(
    'main h3 > button[aria-expanded]:not([data-ws-thumbed])'
  );
  for (const btn of triggers) {
    const entry = btn.closest('div[data-state]');
    const list = entry?.parentElement ?? null;
    if (!entry || !list) continue;
    const entries = entriesOf(list);
    const index = entries.indexOf(entry as Element);
    if (index < 0) continue;

    const field = fieldNameFor(list);
    let urls: (string | null)[] = [];

    if (field === 'gallery') {
      urls = (docData.gallery?.[index]?.items ?? []).map((it: any) => thumbUrl(it.image));
    } else if (field === 'items') {
      // Nested gallery item — find which row's entry contains this list. The
      // :not([role="region"]) skips Radix's Accordion.Content (it also carries
      // data-state) so we land on the row's Accordion.Item.
      const rowEntry = list.parentElement?.closest?.('div[data-state]:not([role="region"])');
      const rowList = rowEntry?.parentElement;
      if (rowEntry && rowList && fieldNameFor(rowList) === 'gallery') {
        const rowIndex = entriesOf(rowList).indexOf(rowEntry as Element);
        urls = [thumbUrl(docData.gallery?.[rowIndex]?.items?.[index]?.image)];
      }
    } else if (field === 'slides') {
      urls = [thumbUrl(docData.slides?.[index]?.media)];
    } else {
      continue;
    }

    const strip = makeStrip(urls);
    if (!strip) continue;
    btn.setAttribute('data-ws-thumbed', '1');
    // Insert before the chevron (last child) so the strip right-aligns with it.
    btn.insertBefore(strip, btn.lastElementChild);
  }
}

function scheduleDecorate() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    try {
      decorate();
    } catch {
      /* never break the admin */
    }
  });
}

export default {
  config: {},
  bootstrap() {
    const orig = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await orig(...args);
      try {
        const input = args[0] as any;
        const url: string = typeof input === 'string' ? input : input?.url ?? '';
        if (
          /\/content-manager\/(collection|single)-types\/[^?]+/.test(url) &&
          !/\/actions\//.test(url) && // e.g. countDraftRelations also returns {data: object}
          res.ok
        ) {
          res
            .clone()
            .json()
            .then((json) => {
              // Only a real document (never an action payload) carries a documentId.
              if (json?.data?.documentId) {
                docData = json.data;
                scheduleDecorate();
              }
            })
            .catch(() => {});
        }
      } catch {
        /* pass through untouched */
      }
      return res;
    };

    const observer = new MutationObserver(scheduleDecorate);
    observer.observe(document.body, { childList: true, subtree: true });
  },
};
