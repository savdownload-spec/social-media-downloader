import { createNavigation } from 'next-intl/navigation';
import { locales } from './config/locales';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation({ locales });
