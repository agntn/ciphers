import type { ContentNavigationItem } from "@nuxt/content";
import { CIPHERS } from "../utils/ciphers";

const NAV_ICONS: Record<string, string> = {
  "/guide": "i-lucide-book-open",
  "/guide/transform": "i-lucide-arrow-right-left",
  "/guide/analysis": "i-lucide-chart-column",
  "/guide/cli": "i-lucide-terminal",
  "/guide/agents": "i-lucide-bot",
  "/guide/custom": "i-lucide-plus",
  "/guide/playground": "i-lucide-flask-conical",
  "/ciphers": "i-lucide-library",
  "/ciphers/classical": "i-lucide-scroll-text",
  "/ciphers/block": "i-lucide-blocks",
  "/ciphers/stream": "i-lucide-waves",
  "/playground": "i-lucide-flask-conical",
  ...Object.fromEntries(CIPHERS.map((cipher) => [cipher.to, cipher.icon])),
};

function withIcons(items: readonly ContentNavigationItem[]): ContentNavigationItem[] {
  return items.map((item) => ({
    ...item,
    icon: NAV_ICONS[item.path] ?? item.icon,
    /** Leaf pages match exactly, so /guide isn't highlighted together with /guide/cli. */
    exact: !item.children?.length,
    children: item.children ? withIcons(item.children) : item.children,
  }));
}

/**
 * The first page under a section, which is where its tab in the header leads.
 *
 * @param {ContentNavigationItem} item - A section of the tree.
 * @returns {string} The path of its first page.
 */
function firstPagePath(item: ContentNavigationItem): string {
  let current = item;
  while (current.children?.length) current = current.children[0]!;
  return current.path;
}

/** The cipher tabs: one per category, each opening on its own overview page. */
const CATEGORY_SECTIONS = [
  { category: "classical", title: "Classical" },
  { category: "block", title: "Block" },
  { category: "stream", title: "Stream" },
] as const;

/**
 * The tree with `/ciphers` split by category: a Classical, a Block and a Stream section, each holding its
 * overview page and its ciphers, with the all-ciphers overview as a shared `All` lead. The pages keep
 * their `/ciphers/<name>` paths; only the menu is regrouped, so it stays short as the registry grows.
 *
 * @param {readonly ContentNavigationItem[]} items - The content navigation.
 * @returns {ContentNavigationItem[]} The same tree, the cipher section replaced by one per category.
 */
function byCategory(items: readonly ContentNavigationItem[]): ContentNavigationItem[] {
  return items.flatMap((item) => {
    if (item.path !== "/ciphers") return [item];
    const pages = item.children ?? [];
    const overview = pages.find((page) => page.path === "/ciphers");
    return CATEGORY_SECTIONS.map(({ category, title }) => {
      const path = `/ciphers/${category}`;
      const index = pages.find((page) => page.path === path);
      const members = pages.filter((page) =>
        CIPHERS.some((cipher) => cipher.to === page.path && cipher.info.category === category),
      );
      return {
        ...item,
        title,
        path,
        children: [
          ...(index ? [index] : []),
          ...(overview ? [{ ...overview, title: "Every cipher", lead: "All" }] : []),
          ...members,
        ],
      };
    });
  });
}

/**
 * Whether the route is inside a section: on one of its pages, or under its path.
 *
 * @param {ContentNavigationItem} section - A section of the tree.
 * @param {string} path - The route path.
 * @returns {boolean} Whether the section owns the page.
 */
function owns(section: ContentNavigationItem, path: string): boolean {
  return (
    path === section.path ||
    path.startsWith(`${section.path}/`) ||
    (section.children ?? []).some((page) => page.path === path && !("lead" in page && page.lead))
  );
}

/**
 * The navigation with this site's icons. With sub-navigation in the header the sidebar holds the
 * current section only, title included; `sections` feeds the header's tabs and `fullNavigation` the
 * mobile menu, which has no tabs and needs every section.
 *
 * @returns {object} `sidebarNavigation`, `fullNavigation` and `sections`.
 */
export function useSubNavigation() {
  const route = useRoute();
  const appConfig = useAppConfig();
  const navigation = inject<Ref<ContentNavigationItem[]>>("navigation");

  const subNavigationMode = computed(() =>
    route.meta.layout === "docs"
      ? (appConfig.navigation as { sub?: "header" | "aside" } | undefined)?.sub
      : undefined,
  );

  const fullNavigation = computed(() => withIcons(byCategory(navigation?.value ?? [])));

  /** The all-ciphers overview belongs to no tab, so its sidebar is the first cipher section. */
  const currentSection = computed(() => {
    if (!subNavigationMode.value) return undefined;
    const path = route.path.replace(/\/$/, "") || "/";
    return (
      fullNavigation.value.find((section) => owns(section, path)) ??
      fullNavigation.value.find((section) =>
        (section.children ?? []).some((page) => page.path === path),
      )
    );
  });

  const sidebarNavigation = computed(() =>
    subNavigationMode.value === "header" && currentSection.value
      ? [currentSection.value]
      : fullNavigation.value,
  );

  const sections = computed(() => {
    const path = route.path.replace(/\/$/, "") || "/";
    return fullNavigation.value.map((item) => ({
      title: item.title,
      icon: item.icon,
      to: item.path === "/guide" ? firstPagePath(item) : item.path,
      active: owns(item, path),
    }));
  });

  return { sidebarNavigation, fullNavigation, sections };
}
