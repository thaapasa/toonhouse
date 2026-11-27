import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import { z } from 'zod';

import { CrashPage } from './components/CrashPage.tsx';
import { EditorPage } from './pages/EditorPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { PlayerPage } from './pages/PlayerPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const LoginSearch = z.object({
  // Only paths in the app, so that a link to the login page can't send the
  // user to another site after the login.
  redirect: z
    .string()
    .regex(/^\/(?![/\\])/)
    .optional()
    .catch(undefined),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: LoginSearch,
  component: LoginPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

const playerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cartoons/$cartoonId',
  component: PlayerPage,
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cartoons/$cartoonId/edit',
  component: EditorPage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    homeRoute,
    loginRoute,
    profileRoute,
    playerRoute,
    editorRoute,
  ]),
  defaultErrorComponent: CrashPage,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
