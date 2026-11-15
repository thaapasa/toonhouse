import { queryOptions } from '@tanstack/react-query';
import {
  Cartoon,
  Group,
  type LoginRequest,
  MeResponse,
  Profile,
  ResetPasswordResponse,
  User,
} from '@toonhouse/api';
import { z } from 'zod';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.status = status;
  }
}

/** Calls the API and checks the response with `schema`. */
async function request<T>(
  schema: z.ZodType<T>,
  path: string,
  init?: { method: string; body?: unknown },
): Promise<T> {
  const res = await fetch(`/api/app${path}`, {
    method: init?.method ?? 'GET',
    ...(init?.body !== undefined && {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(init.body),
    }),
  });
  if (!res.ok) throw new ApiError(res.status);
  return schema.parse(res.status === 204 ? undefined : await res.json());
}

const NoContent = z.undefined();

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => request(MeResponse, '/auth/me'),
});

export const login = (input: LoginRequest) =>
  request(User, '/auth/login', { method: 'POST', body: input });

export const logout = () =>
  request(NoContent, '/auth/logout', { method: 'POST' });

export const profileQuery = queryOptions({
  queryKey: ['profile'],
  queryFn: () => request(Profile, '/profile'),
});

export const updateDisplayName = (displayName: string) =>
  request(User, '/profile', { method: 'PATCH', body: { displayName } });

/** Gives the user a new password and returns it. */
export const resetPassword = async (currentPassword: string) =>
  (
    await request(ResetPasswordResponse, '/profile/password', {
      method: 'POST',
      body: { currentPassword },
    })
  ).password;

export const groupsQuery = queryOptions({
  queryKey: ['groups'],
  queryFn: () => request(z.array(Group), '/groups'),
});

export const cartoonsQuery = queryOptions({
  queryKey: ['cartoons'],
  queryFn: () => request(z.array(Cartoon), '/cartoons'),
});

export const cartoonQuery = (id: string) =>
  queryOptions({
    queryKey: ['cartoons', id],
    queryFn: () => request(Cartoon, `/cartoons/${id}`),
  });

export const createCartoon = (title: string) =>
  request(Cartoon, '/cartoons', { method: 'POST', body: { title } });

export const renameCartoon = (id: string, title: string) =>
  request(Cartoon, `/cartoons/${id}`, { method: 'PATCH', body: { title } });
