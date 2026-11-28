import Link from "next/link";

import { MissingPagesTable } from "#/components/common/survey/scan-pages/missing-pages-table";
import {
  MissingPagesFilterBar,
  UnidentifiedPagesFilterBar,
} from "#/components/common/survey/scan-pages/scan-pages-filters";
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
  fetchUnidentifiedPageHubs,
  fetchUnidentifiedPages,
  type UnidentifiedPageHubs,
  type UnidentifiedPagesFilters,
} from "#/lib/survey/scan-pages/unidentified";
import { cn } from "#/lib/utils";

export type PagesSearchParams = Partial<
  Record<"view" | "survey" | "hub" | "school" | "upload" | "page", string | string[]>
>;

const countOf = (options: readonly FilterOption[]) =>
  options.reduce((total, option) => total + option.count, 0);

/**
 * Scanned pages that need a person: pages whose QR couldn't be read, to place on their copy by the
 * code printed under it, and copies still missing pages.
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
  const view: SurveyPagesView =
    searchParamValue(searchParams.view) === "missing" ? "missing" : "unidentified";
  // A hub coordinator's pages are their hub's already.
  const filterHubId = viewer.kind === "project" ? searchParamValue(searchParams.hub) : undefined;
  const [unidentifiedHubs, missingOptions] = await Promise.all([
    fetchUnidentifiedPageHubs(viewer),
    fetchMissingPagesFilterOptions(viewer),
  ]);
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
      </nav>
      {view === "unidentified" ? (
        <UnidentifiedView
          viewer={viewer}
          filters={{ hubId: filterHubId, uploadId: searchParamValue(searchParams.upload) }}
          requestedPage={listPageOf(searchParams.page)}
          hubOptions={viewer.kind === "project" ? unidentifiedHubs : undefined}
          timeZone={timeZone}
        />
      ) : (
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

/** The page of the list the address asks for; fetchUnidentifiedPages clamps it to the last. */
function listPageOf(value: string | string[] | undefined) {
  const page = Number(searchParamValue(value));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

async function UnidentifiedView({
  viewer,
  filters,
  requestedPage,
  hubOptions,
  timeZone,
}: {
  viewer: SurveyViewer;
  filters: UnidentifiedPagesFilters;
  requestedPage: number;
  hubOptions: UnidentifiedPageHubs | undefined;
  timeZone: string | null;
}) {
  const {
    pages,
    upload,
    total,
    page: shownListPage,
    pageCount: listPageCount,
  } = await fetchUnidentifiedPages(viewer, filters, requestedPage);
  const listPageHref = (listPage: number) =>
    surveyPagesHref(viewer.kind, {
      hub: filters.hubId,
      upload: upload?.id,
      page: listPage > 1 ? String(listPage) : undefined,
    });
  return (
    <section className="space-y-4">
      <p className="max-w-prose text-sm text-shamiri-text-grey">
        Scanned pages whose QR code couldn&apos;t be read. Type the code printed under the QR to
        place each one on its copy.
      </p>
      <UnidentifiedPagesFilterBar
        hubId={filters.hubId}
        hubOptions={hubOptions}
        upload={
          upload && {
            fileName: upload.fileName,
            clearHref: surveyPagesHref(viewer.kind, { hub: filters.hubId }),
          }
        }
        total={total}
      />
      {pages.length === 0 ? (
        <p className="rounded-lg bg-muted px-4 py-8 text-center text-sm text-shamiri-text-grey">
          No unidentified pages.
        </p>
      ) : (
        <ul className="grid gap-6 lg:grid-cols-2">
          {pages.map((page) => (
            <UnidentifiedPageCard
              key={page.id}
              page={page}
              showHub={viewer.kind === "project"}
              timeZone={timeZone}
            />
          ))}
        </ul>
      )}
      {listPageCount > 1 && (
        <nav aria-label="Pages of the list" className="flex items-center justify-end gap-4 text-sm">
          {shownListPage > 1 && (
            <Link href={listPageHref(shownListPage - 1)} className="text-shamiri-new-blue">
              Previous
            </Link>
          )}
          <span className="text-shamiri-text-grey">
            Page {shownListPage} of {listPageCount}
          </span>
          {shownListPage < listPageCount && (
            <Link href={listPageHref(shownListPage + 1)} className="text-shamiri-new-blue">
              Next
            </Link>
          )}
        </nav>
      )}
    </section>
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
