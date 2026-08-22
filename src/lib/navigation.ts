export type NavigationItem = {
  label: string;
  href: string;
  exact?: boolean;
  primary?: boolean;
};

// Main TripSync navigation
export const mainNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    exact: true,
  },
  {
    label: "Groups",
    href: "/groups",
  },
  {
    label: "Create trip",
    href: "/trips/new",
    primary: true,
  },
];

// Check if navigation item is active
export function isNavigationItemActive(
  pathname: string,
  item: NavigationItem
) {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname.startsWith(item.href);
}