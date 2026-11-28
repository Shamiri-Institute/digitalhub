import Link from "next/link";

import { MissingPagesTable } from "#/components/common/survey/scan-pages/missing-pages-table";
import {
  MissingPagesFilterBar,
  UnplacedPagesFilterBar,
} from "#/components/common/survey/scan-pages/scan-pages-filters";
import { SetAsidePageCard } from "#/components/common/survey/scan-pages/set-aside-page-card";
import { UnidentifiedPageCard } from "#/components/common/survey/scan-pages/unidentified-page-card";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { type SurveyPagesView, surveyPagesHref } from "#/lib/survey/copy/paths";
import { type FilterOption, searchParamValue } from "#/lib/survey/filter-options";
import {
  fetchMissingPages,
  fetchMissingPagesFilterOptions,
  type MissingPagesFilterOptions,
  type MissingPagesFilters,
} from "#/lib/survey/scan-pages/missing";
import {
  fetchSetAsidePages,
  fetchUnidentifiedPages,
  fetchUnplacedPageHubs,
  type UnidentifiedPagesFilters,
  type UnplacedPageHubs,
} from "#/lib/survey/scan-pages/unidentified";
import { cn } from "#/lib/utils";

export type PagesSearchParams = Partial<
  Record<"view" | "survey" | "hub" | "school" | "upload" | "page", string | string[]>
>;

const countOf = (options: readonly FilterOption[]) =>
  options.reduce((total, option) => total + option.count, 0);

/**
 * Scanned pages that need a person: pages whose QR couldn't be read, to place on their copy by the
 * code printed under it or set aside, and copies still missing pages.
 */
export async function SurveyPages({
  viewer,
  searchParams,
  timeZone,
}: {
  viewer: SurveyViewer;
  searchParams: PagesSearchParams;
  timeZone: string | null;
}) {
  const view = viewOf(searchParamValue(searchParams.view));
  // A hub coordinator's pages are their hub's already.
  const filterHubId = viewer.kind === "project" ? searchParamValue(searchParams.hub) : undefined;
  const [unidentifiedHubs, setAsideHubs, missingOptions] = await Promise.all([
    fetchUnplacedPageHubs(viewer, "unidentified"),
    fetchUnplacedPageHubs(viewer, "set-aside"),
    fetchMissingPagesFilterOptions(viewer),
  ]);
  const unplacedFilters = { hubId: filterHubId, uploadId: searchParamValue(searchParams.upload) };
  return (
    <div className="space-y-6">
      <nav
        aria-label="Pages to sort"
        className="inline-flex gap-1 rounded-lg border border-grey-border bg-white p-1"
      >
        <ViewLink
          viewerKind={viewer.kind}
          view="unidentified"
          current={view}
          count={countOf(unidentifiedHubs)}
        >
          Unidentified
        </ViewLink>
        <ViewLink
          viewerKind={viewer.kind}
          view="missing"
          current={view}
          count={countOf(missingOptions.surveys)}
        >
          Missing pages
        </ViewLink>
        <ViewLink
          viewerKind={viewer.kind}
          view="set-aside"
          current={view}
          count={countOf(setAsideHubs)}
        >
          Set aside
        </ViewLink>
      </nav>
      {view === "unidentified" && (
        <UnidentifiedView
          viewer={viewer}
          filters={unplacedFilters}
          requestedPage={listPageOf(searchParams.page)}
          hubOptions={viewer.kind === "project" ? unidentifiedHubs : undefined}
          timeZone={timeZone}
        />
      )}
      {view === "set-aside" && (
        <SetAsideView
          viewer={viewer}
          filters={unplacedFilters}
          requestedPage={listPageOf(searchParams.page)}
          hubOptions={viewer.kind === "project" ? setAsideHubs : undefined}
          timeZone={timeZone}
        />
      )}
      {view === "missing" && (
        <MissingView
          viewer={viewer}
          filters={{
            surveyId: searchParamValue(searchParams.survey),
            hubId: filterHubId,
            schoolId: searchParamValue(searchParams.school),
          }}
          options={missingOptions}
          timeZone={timeZone}
        />
      )}
    </div>
  );
}

function viewOf(value: string | undefined): SurveyPagesView {
  return value === "missing" || value === "set-aside" ? value : "unidentified";
}

function ViewLink({
  viewerKind,
  view,
  current,
  count,
  children,
}: {
  viewerKind: SurveyViewer["kind"];
  view: SurveyPagesView;
  current: SurveyPagesView;
  count: number;
  children: string;
}) {
  const isCurrent = view === current;
  return (
    <Link
      href={surveyPagesHref(viewerKind, { view })}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-shamiri-new-blue focus-visible:outline-none",
        isCurrent
          ? "bg-shamiri-new-blue text-white"
          : "text-shamiri-text-grey hover:bg-muted hover:text-shamiri-black",
      )}
    >
      {children} <span className="tabular-nums">{count}</span>
    </Link>
  );
}

/** The page of the list the address asks for; the list's fetch clamps it to the last. */
function listPageOf(value: string | string[] | undefined) {
  const page = Number(searchParamValue(value));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

type UnplacedViewProps = {
  viewer: SurveyViewer;
  filters: UnidentifiedPagesFilters;
  requestedPage: number;
  hubOptions: UnplacedPageHubs | undefined;
  timeZone: string | null;
};

async function UnidentifiedView({
  viewer,
  filters,
  requestedPage,
  hubOptions,
  timeZone,
}: UnplacedViewProps) {
  const listed = await fetchUnidentifiedPages(viewer, filters, requestedPage);
  return (
    <section className="space-y-4">
      <p className="max-w-prose text-sm text-shamiri-text-grey">
        Scanned pages whose QR code couldn&apos;t be read. Type the code printed under the QR to
        place each one on its copy. Set aside a blank back or a cover sheet as not a survey page.
      </p>
      <UnplacedPagesFilterBar
        filterHubId={filters.hubId}
        hubOptions={hubOptions}
        upload={
          listed.upload && {
            fileName: listed.upload.fileName,
            clearHref: surveyPagesHref(viewer.kind, { hub: filters.hubId }),
          }
        }
        total={listed.total}
        totalNoun="to place"
        emptyHubLabel="Nothing waiting here"
      />
      {listed.pages.length === 0 ? (
        <EmptyList>No unidentified pages.</EmptyList>
      ) : (
        <ul className="grid gap-6 lg:grid-cols-2">
          {listed.pages.map((page) => (
            <UnidentifiedPageCard
              key={page.id}
              page={page}
              showHub={viewer.kind === "project"}
              timeZone={timeZone}
            />
          ))}
        </ul>
      )}
      <ListPager
        listPage={listed.page}
        listPageCount={listed.pageCount}
        href={(listPage) =>
          surveyPagesHref(viewer.kind, {
            hub: filters.hubId,
            upload: listed.upload?.id,
            page: listPage > 1 ? String(listPage) : undefined,
          })
        }
      />
    </section>
  );
}

async function SetAsideView({
  viewer,
  filters,
  requestedPage,
  hubOptions,
  timeZone,
}: UnplacedViewProps) {
  const listed = await fetchSetAsidePages(viewer, filters, requestedPage);
  return (
    <section className="space-y-4">
      <p className="max-w-prose text-sm text-shamiri-text-grey">
        Scanned pages set aside as not survey pages. Put one back to place it on its copy.
      </p>
      <UnplacedPagesFilterBar
        filterHubId={filters.hubId}
        hubOptions={hubOptions}
        upload={
          listed.upload && {
            fileName: listed.upload.fileName,
            clearHref: surveyPagesHref(viewer.kind, { view: "set-aside", hub: filters.hubId }),
          }
        }
        total={listed.total}
        totalNoun="set aside"
        emptyHubLabel="None set aside here"
      />
      {listed.pages.length === 0 ? (
        <EmptyList>No pages set aside.</EmptyList>
      ) : (
        <ul className="grid gap-6 lg:grid-cols-2">
          {listed.pages.map((page) => (
            <SetAsidePageCard
              key={page.id}
              page={page}
              showHub={viewer.kind === "project"}
              timeZone={timeZone}
            />
          ))}
        </ul>
      )}
      <ListPager
        listPage={listed.page}
        listPageCount={listed.pageCount}
        href={(listPage) =>
          surveyPagesHref(viewer.kind, {
            view: "set-aside",
            hub: filters.hubId,
            upload: listed.upload?.id,
            page: listPage > 1 ? String(listPage) : undefined,
          })
        }
      />
    </section>
  );
}

function EmptyList({ children }: { children: string }) {
  return (
    <p className="rounded-lg bg-muted px-4 py-8 text-center text-sm text-shamiri-text-grey">
      {children}
    </p>
  );
}

function ListPager({
  listPage,
  listPageCount,
  href,
}: {
  listPage: number;
  listPageCount: number;
  href: (listPage: number) => string;
}) {
  if (listPageCount <= 1) {
    return null;
  }
  return (
    <nav aria-label="Pages of the list" className="flex items-center justify-end gap-4 text-sm">
      {listPage > 1 && (
        <Link href={href(listPage - 1)} className="text-shamiri-new-blue">
          Previous
        </Link>
      )}
      <span className="text-shamiri-text-grey">
        Page {listPage} of {listPageCount}
      </span>
      {listPage < listPageCount && (
        <Link href={href(listPage + 1)} className="text-shamiri-new-blue">
          Next
        </Link>
      )}
    </nav>
  );
}

async function MissingView({
  viewer,
  filters,
  options,
  timeZone,
}: {
  viewer: SurveyViewer;
  filters: MissingPagesFilters;
  options: MissingPagesFilterOptions;
  timeZone: string | null;
}) {
  const { copies, total, limit } = await fetchMissingPages(viewer, filters);
  return (
    <section className="space-y-4">
      <p className="max-w-prose text-sm text-shamiri-text-grey">
        Copies with some pages scanned and others not yet.
      </p>
      <MissingPagesFilterBar filters={filters} options={options} total={total} />
      <MissingPagesTable copies={copies} viewerKind={viewer.kind} timeZone={timeZone} />
      {total > copies.length && (
        <p className="text-sm text-shamiri-text-grey">
          Showing the first {limit} of {total} copies. Filter to narrow the list.
        </p>
      )}
    </section>
  );
}
