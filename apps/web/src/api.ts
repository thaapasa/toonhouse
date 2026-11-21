import { queryOptions } from '@tanstack/react-query';
import {
  Cartoon,
  Group,
  type LoginRequest,
  MeResponse,
  Profile,
  ResetPasswordResponse,
  SaveContentResponse,
  SavedContent,
  User,
} from '@toonhouse/api';
import { z } from 'zod';

export class ApiError extends Error {
  readonly status: number;
  /** The JSON body of the response, if it had one. */
  readonly body: unknown;

  constructor(status: number, body?: unknown) {
    super(`Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

/** Calls the API and checks the response with `schema`. */
async function request<T>(
  schema: z.ZodType<T>,
  path: string,
  init?: {
    method: string;
    body?: unknown;
    /** The body as JSON already, instead of `body`. */
    json?: string;
    keepalive?: boolean;
  },
): Promise<T> {
  const json =
    init?.json ??
    (init?.body !== undefined ? JSON.stringify(init.body) : undefined);
  const res = await fetch(`/api/app${path}`, {
    method: init?.method ?? 'GET',
    keepalive: init?.keepalive ?? false,
    ...(json !== undefined && {
      headers: { 'content-type': 'application/json' },
      body: json,
    }),
  });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => undefined);
    throw new ApiError(res.status, body);
  }
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

/** The scenes of a cartoon with their revision. */
export const fetchContent = (id: string) =>
  request<SavedContent>(SavedContent, `/cartoons/${id}/content`);

export const contentQuery = (id: string) =>
  queryOptions({
    queryKey: ['cartoons', id, 'content'],
    queryFn: () => fetchContent(id),
    // The editor keeps its own copy while the user edits.
    refetchOnWindowFocus: false,
  });

/** The URL of the preview image, which changes when the user sets a new one. */
export const previewUrl = (cartoon: Cartoon) =>
  cartoon.previewUpdatedAt &&
  `/api/app/cartoons/${cartoon.id}/preview?v=${encodeURIComponent(cartoon.previewUpdatedAt)}`;

export async function uploadPreview(id: string, image: Blob): Promise<Cartoon> {
  const res = await fetch(`/api/app/cartoons/${id}/preview`, {
    method: 'PUT',
    headers: { 'content-type': image.type },
    body: image,
  });
  if (!res.ok) throw new ApiError(res.status);
  return Cartoon.parse(await res.json());
}

/**
 * Saves the scenes of a cartoon, the JSON of a `SavedContent`, and gives their
 * new revision. With
 * `keepalive`, the save finishes even if the page closes.
 */
export const saveContent = async (
  id: string,
  json: string,
  keepalive = false,
) =>
  (
    await request(SaveContentResponse, `/cartoons/${id}/content`, {
      method: 'PUT',
      json,
      keepalive,
    })
  ).revision;
