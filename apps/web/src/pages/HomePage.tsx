import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import type { Cartoon } from '@toonhouse/api';

import { cartoonQuery, cartoonsQuery, createCartoon, meQuery } from '../api.ts';
import { AppHeader } from '../components/AppHeader.tsx';
import { EditIcon, PlayIcon, PlusIcon } from '../components/icons.tsx';
import { PreviewImage } from '../components/PreviewImage.tsx';
import { PageMessage } from '../components/RequireUser.tsx';
import { useI18n } from '../i18n/index.tsx';

export function HomePage() {
  const me = useQuery(meQuery);
  const loggedIn = !!me.data?.user;
  return (
    <div className="page">
      <AppHeader actions={loggedIn && <NewCartoonButton />} />
      <main className="home">
        <CartoonLists loggedIn={loggedIn} />
      </main>
    </div>
  );
}

function NewCartoonButton() {
  const { tr } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: () => createCartoon(tr('home.newCartoonTitle')),
    onSuccess: async (cartoon) => {
      queryClient.setQueryData(cartoonQuery(cartoon.id).queryKey, cartoon);
      await queryClient.invalidateQueries(cartoonsQuery);
      await navigate({
        to: '/cartoons/$cartoonId/edit',
        params: { cartoonId: cartoon.id },
      });
    },
  });
  return (
    <button
      type="button"
      className="button primary"
      disabled={create.isPending}
      onClick={() => create.mutate()}
    >
      <PlusIcon />
      {tr('home.newCartoon')}
    </button>
  );
}

function CartoonLists({ loggedIn }: { loggedIn: boolean }) {
  const { tr } = useI18n();
  const cartoons = useQuery(cartoonsQuery);

  if (cartoons.isPending) return <PageMessage text="loading" />;
  if (cartoons.isError) return <PageMessage text="loadError" />;

  if (!loggedIn) {
    return (
      <CartoonList
        title={tr('home.publicCartoons')}
        cartoons={cartoons.data}
        empty={tr('home.noPublicCartoons')}
      />
    );
  }
  const own = cartoons.data.filter((c) => c.canEdit);
  const shared = cartoons.data.filter((c) => !c.canEdit);
  return (
    <>
      <CartoonList
        title={tr('home.myCartoons')}
        cartoons={own}
        empty={tr('home.noCartoons')}
      />
      {shared.length > 0 && (
        <CartoonList title={tr('home.sharedCartoons')} cartoons={shared} />
      )}
    </>
  );
}

function CartoonList(props: {
  title: string;
  cartoons: Cartoon[];
  empty?: string;
}) {
  return (
    <section className="cartoon-list">
      <div className="list-heading">
        <h1>{props.title}</h1>
        <span className="count">{props.cartoons.length}</span>
      </div>
      {props.cartoons.length === 0 ? (
        <p className="empty">{props.empty}</p>
      ) : (
        <div className="cartoon-grid">
          {props.cartoons.map((c) => (
            <CartoonCard key={c.id} cartoon={c} />
          ))}
        </div>
      )}
    </section>
  );
}

/** A tap on the picture plays the cartoon. The owner gets a button to edit it. */
function CartoonCard({ cartoon }: { cartoon: Cartoon }) {
  const { tr } = useI18n();
  const edited = useEditedText(cartoon.updatedAt);
  return (
    <article className="cartoon-card">
      <Link
        to="/cartoons/$cartoonId"
        params={{ cartoonId: cartoon.id }}
        aria-label={tr('home.watch', { title: cartoon.title })}
        className="preview-image"
      >
        <PreviewImage cartoon={cartoon} />
        <span className="play-badge">
          <PlayIcon size={26} />
        </span>
      </Link>
      <div className="card-row">
        <div className="card-info">
          <div className="card-title">{cartoon.title}</div>
          <div className="card-meta">
            {cartoon.canEdit
              ? edited
              : tr('home.byOwner', { name: cartoon.owner.displayName })}
          </div>
        </div>
        {cartoon.canEdit && (
          <Link
            to="/cartoons/$cartoonId/edit"
            params={{ cartoonId: cartoon.id }}
            className="icon-button"
            aria-label={tr('home.edit', { title: cartoon.title })}
            title={tr('home.edit', { title: cartoon.title })}
          >
            <EditIcon />
          </Link>
        )}
      </div>
    </article>
  );
}

/** "Edited today", "Edited yesterday" or "Edited 9.11.2026". */
function useEditedText(iso: string): string {
  const { tr, formatDate } = useI18n();
  const days = daysAgo(new Date(iso));
  if (days === 0) return tr('home.editedToday');
  if (days === 1) return tr('home.editedYesterday');
  return tr('home.editedOn', { date: formatDate(iso) });
}

function daysAgo(date: Date): number {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
}
