"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  MailIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// Helper function to prefix paths with role
const getNavItems = (role: 'admin' | 'manager'): NavItem[] => {
  const prefix = `/${role}`;
  
  if (role === 'admin') {
    return [
      {
        icon: <GridIcon />,
        name: "Dashboard",
        path: `${prefix}/dashboard`,
      },
      {
        icon: <BoxCubeIcon />,
        name: "Banners",
        path: `${prefix}/banners`,
      },
      {
        icon: <GridIcon />,
        name: "Home Features",
        path: `${prefix}/home-features`,
      },
      {
        name: "Menu",
        icon: <ListIcon />,
        subItems: [
          { name: "Categories", path: `${prefix}/menu/categories`, pro: false },
          { name: "Items", path: `${prefix}/menu/items`, pro: false },
        ],
      },
      {
        icon: <CalenderIcon />,
        name: "Events",
        subItems: [
          { name: "All Events", path: `${prefix}/events`, pro: false },
          { name: "Tickets", path: `${prefix}/events/tickets`, pro: false },
          { name: "Scan Tickets", path: `${prefix}/events/scan`, pro: false },
        ],
      },
      {
        icon: <PageIcon />,
        name: "Gallery",
        path: `${prefix}/gallery`,
      },
      {
        icon: <PieChartIcon />,
        name: "Offers",
        path: `${prefix}/offers`,
      },
      {
        name: "Reservations",
        icon: <TableIcon />,
        subItems: [
          { name: "All Reservations", path: `${prefix}/reservations`, pro: false },
          { name: "Special Hours", path: `${prefix}/reservations/special-hours`, pro: false },
        ],
      },
      {
        icon: <TableIcon />,
        name: "Orders",
        path: `${prefix}/orders`,
      },
      {
        icon: <UserCircleIcon />,
        name: "Users",
        path: `${prefix}/users`,
      },
      {
        icon: <MailIcon />,
        name: "Contact Messages",
        path: `${prefix}/contact-messages`,
      },
      {
        icon: <MailIcon />,
        name: "Verified Emails",
        path: `${prefix}/verified-emails`,
      },
    ];
  } else {
    // Manager routes
    return [
      {
        icon: <GridIcon />,
        name: "Dashboard",
        path: `${prefix}/dashboard`,
      },
      {
        icon: <CalenderIcon />,
        name: "Events",
        subItems: [
          { name: "All Events", path: `${prefix}/events`, pro: false },
          { name: "Tickets", path: `${prefix}/events/tickets`, pro: false },
          { name: "Scan Tickets", path: `${prefix}/events/scan`, pro: false },
        ],
      },
      {
        name: "Reservations",
        icon: <TableIcon />,
        path: `${prefix}/reservations`,
      },
    ];
  }
};

const getOthersItems = (role: 'admin' | 'manager'): NavItem[] => {
  const prefix = `/${role}`;
  
  if (role === 'admin') {
    return [
      {
        icon: <PlugInIcon />,
        name: "Settings",
        path: `${prefix}/settings`,
      },
      {
        icon: <PageIcon />,
        name: "Content",
        path: `${prefix}/content`,
      },
    ];
  } else {
    return [];
  }
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  
  // Determine role from pathname - more robust detection
  // Memoize to prevent unnecessary recalculations and ensure consistency
  const role = useMemo((): 'admin' | 'manager' => {
    // Check if pathname starts with /admin (including nested routes like /admin/gallery/new)
    if (pathname.startsWith('/admin')) {
      return 'admin';
    }
    // Check if pathname starts with /manager
    if (pathname.startsWith('/manager')) {
      return 'manager';
    }
    // Check if pathname starts with /dashboard (legacy admin routes)
    if (pathname.startsWith('/dashboard')) {
      return 'admin';
    }
    // Default to admin for consistency - ensures sidebar always shows admin menu
    return 'admin';
  }, [pathname]);
  
  // Memoize nav items to prevent recreation on every render
  const navItems = useMemo(() => getNavItems(role), [role]);
  const othersItems = useMemo(() => getOthersItems(role), [role]);

  // State for submenu management
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const handleSubmenuToggle = useCallback((index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  }, []);

  // Memoize renderMenuItems to prevent recreation on every render
  const renderMenuItems = useCallback((
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group transition-all duration-300 hover:scale-105 ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  ), [isExpanded, isHovered, isMobileOpen, openSubmenu, isActive, handleSubmenuToggle, subMenuHeight, subMenuRefs]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, navItems, othersItems]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-500 ease-out z-50 border-r border-gray-200 sidebar-transition
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0 animate-slide-in-left" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-6 px-4 flex border-b border-gray-200 dark:border-gray-800 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href={`/${role}/dashboard`} className="flex items-center w-full group">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex flex-col space-y-1">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                Good Times Bar & Grill
              </h1>
              <span className="text-xs font-semibold text-brand-500 dark:text-brand-400 uppercase tracking-wider">
                {role === 'admin' ? 'Admin Panel' : 'Manager Panel'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1">
              <div className="w-10 h-10 rounded-lg bg-brand-500 dark:bg-brand-600 flex items-center justify-center">
                <span className="text-base font-bold text-white leading-none">
                  GT
                </span>
              </div>
              <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {role === 'admin' ? 'Admin' : 'Manager'}
              </span>
            </div>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
