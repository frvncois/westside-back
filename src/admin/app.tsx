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
 * Also hides the `heroDirector` / `heroPhotographer` fields unless the open
 * repertory has BOTH disciplines (native conditional fields can't key off a
 * relation) — see toggleConditionalHeroes().
 *
 * Everything is best-effort: if Strapi's admin DOM changes, decoration
 * silently does nothing.
 */

const THUMB = 28;

let docData: any = null;
let scheduled = false;
/** Discipline names per repertory documentId, captured from the relation input's fetch. */
const disciplinesByDoc: Record<string, string[]> = {};

type Thumb = { kind: 'image' | 'video'; url: string };

const thumbOf = (media: any): Thumb | null => {
  if (!media) return null;
  if ((media.mime ?? '').startsWith('video/')) {
    return media.url ? { kind: 'video', url: media.url } : null;
  }
  const url = media.formats?.thumbnail?.url ?? media.url ?? null;
  return url ? { kind: 'image', url } : null;
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

function makeStrip(thumbs: (Thumb | null)[]): HTMLElement | null {
  const usable = thumbs.filter(Boolean).slice(0, 8) as Thumb[];
  if (!usable.length) return null;
  const strip = document.createElement('span');
  strip.setAttribute('data-ws-thumbs', '');
  strip.style.cssText = `display:inline-flex;gap:4px;align-items:center;margin-left:auto;padding:0 12px;flex:none`;
  const box = `width:${THUMB}px;height:${THUMB}px;object-fit:cover;border-radius:3px;flex:none;background:#32324d`;
  for (const t of usable) {
    if (t.kind === 'video') {
      // Real first-frame preview: #t=0.1 makes metadata preload paint a frame.
      const video = document.createElement('video');
      video.src = `${t.url}#t=0.1`;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.style.cssText = box + ';pointer-events:none';
      strip.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = t.url;
      img.loading = 'lazy';
      img.style.cssText = box;
      strip.appendChild(img);
    }
  }
  return strip;
}

/**
 * The Director/Photographer hero fields only apply to dual-discipline artists —
 * hide them otherwise. Strapi's native conditional fields can't key off a
 * relation, so the toggle lives here, fed by the disciplines the relation input
 * fetches for the open document. Unknown disciplines on an existing entry hide
 * the fields (they reveal once the data arrives); the create form shows them.
 */
function toggleConditionalHeroes() {
  const m = location.pathname.match(/api::repertory\.repertory\/([^/?]+)/);
  if (!m) return;
  const isCreate = m[1] === 'create';
  const names = disciplinesByDoc[m[1]];
  const show = isCreate || (!!names && names.includes('Director') && names.includes('Photographer'));

  const labels = [...document.querySelectorAll<HTMLLabelElement>('main label')];
  for (const field of ['heroDirector', 'heroPhotographer']) {
    const label = labels.find((l) => (l.textContent ?? '').trim() === field);
    if (!label) continue;
    // Field root = the ancestor sitting directly in the edit view's grid layout.
    let root: HTMLElement | null = label;
    while (root?.parentElement && getComputedStyle(root.parentElement).display !== 'grid') {
      root = root.parentElement;
    }
    if (root?.parentElement) root.style.display = show ? '' : 'none';
  }
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
    let thumbs: (Thumb | null)[] = [];

    if (field === 'gallery') {
      thumbs = (docData.gallery?.[index]?.items ?? []).map((it: any) => thumbOf(it.image));
    } else if (field === 'items') {
      // Nested gallery item — find which row's entry contains this list. The
      // :not([role="region"]) skips Radix's Accordion.Content (it also carries
      // data-state) so we land on the row's Accordion.Item.
      const rowEntry = list.parentElement?.closest?.('div[data-state]:not([role="region"])');
      const rowList = rowEntry?.parentElement;
      if (rowEntry && rowList && fieldNameFor(rowList) === 'gallery') {
        const rowIndex = entriesOf(rowList).indexOf(rowEntry as Element);
        thumbs = [thumbOf(docData.gallery?.[rowIndex]?.items?.[index]?.image)];
      }
    } else if (field === 'slides') {
      thumbs = [thumbOf(docData.slides?.[index]?.media)];
    } else {
      continue;
    }

    const strip = makeStrip(thumbs);
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
    try {
      toggleConditionalHeroes();
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
        // Disciplines for the open repertory — the relation input fetches them as
        // /content-manager/relations/api::repertory.repertory/<docId>/disciplines
        const rel = url.match(
          /\/content-manager\/relations\/api::repertory\.repertory\/([^/?]+)\/disciplines/
        );
        if (rel && res.ok) {
          res
            .clone()
            .json()
            .then((json) => {
              if (Array.isArray(json?.results)) {
                disciplinesByDoc[rel[1]] = json.results
                  .map((r: any) => r.name)
                  .filter(Boolean);
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
