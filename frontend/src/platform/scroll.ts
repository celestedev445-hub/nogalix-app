/**
 * Défilement après navigation :
 * - retour / avance : position mémorisée restaurée ;
 * - nouvelle page : si le haut du segment qui change n'est pas visible, on
 *   remonte en haut de page (puis `scrollIntoView` si nécessaire) ;
 * - ancre (#id) : l'élément est amené à l'écran ;
 * - `scroll: false` : aucune modification.
 */

/** Élément de mise en page qui reçoit les pages enfants (balisé `data-app-outlet`). */
const OUTLET_SELECTOR = "[data-app-outlet]";

function isSkipped(element: HTMLElement) {
  const position = getComputedStyle(element).position;
  return position === "sticky" || position === "fixed";
}

function topOfElementInViewport(element: HTMLElement, viewportHeight: number) {
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.top <= viewportHeight;
}

function hashTarget(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return null;
  if (id === "top") return document.body;
  return document.getElementById(id) ?? document.getElementsByName(id)[0] ?? null;
}

/**
 * @param changedDepth profondeur (0 = racine, 1 = mise en page de groupe, …) du
 * premier segment de route qui diffère entre l'ancienne et la nouvelle page.
 */
export function scrollToChangedSegment(changedDepth: number, hash: string) {
  const html = document.documentElement;

  if (hash) {
    const target = hashTarget(hash);
    if (target) {
      if (target === document.body) window.scrollTo(0, 0);
      else target.scrollIntoView();
      return;
    }
  }

  let container: Element | null = null;
  if (changedDepth >= 2) {
    const outlets = document.querySelectorAll(OUTLET_SELECTOR);
    container = outlets[changedDepth - 2] ?? outlets[outlets.length - 1] ?? null;
  }
  if (!container) container = document.getElementById("root");

  let node = container?.firstElementChild ?? null;
  while (node && (!(node instanceof HTMLElement) || isSkipped(node))) {
    node = node.nextElementSibling;
  }
  if (!(node instanceof HTMLElement)) {
    window.scrollTo(0, 0);
    return;
  }

  const viewportHeight = html.clientHeight;
  if (topOfElementInViewport(node, viewportHeight)) return;

  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  html.scrollTop = 0;
  if (!topOfElementInViewport(node, viewportHeight)) node.scrollIntoView();
  html.style.scrollBehavior = previous;
}
