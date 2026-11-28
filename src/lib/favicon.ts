/**
 * The browser tab mirrors the parcel. While packing, the favicon turns green when every check
 * passes and red when something is wrong, so a seller can glance at the tab from across the table.
 */
export type TabState = "brand" | "pass" | "fail";

const TICK =
  '<polygon points="14.2,31.8 31.1,48.6 22.6,57.0 5.8,40.2" opacity="0.9"/><polygon points="19.4,46.2 49.4,10.2 50.1,14.0 55.0,12.9 54.7,17.8 58.6,17.8 28.6,53.8" opacity="0.9"/>';
const CROSS = '<path d="M20 20L44 44M44 20L20 44" stroke="#fff" stroke-width="8" stroke-linecap="round"/>';

function svg(state: TabState): string {
  const bg = state === "pass" ? "#1E7A4E" : state === "fail" ? "#C8102E" : "#161311";
  const mark = state === "fail" ? CROSS : `<g fill="${state === "pass" ? "#fff" : "#FF5B1F"}">${TICK}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${bg}"/>${mark}</svg>`;
}

let current: TabState = "brand";

export function setTabState(state: TabState, title?: string) {
  if (title) document.title = title;
  if (state === current) return;
  current = state;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = `data:image/svg+xml,${encodeURIComponent(svg(state))}`;
}

export function resetTab() {
  setTabState("brand", "Vouch: every promise deserves proof");
}
