import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Suspense } from "react";

import { MonitoringCardView } from "#/components/common/monitoring/monitoring-card-view";
import { MonitoringFilterBar } from "#/components/common/monitoring/monitoring-filter-bar";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { supervisorCardScope } from "#/lib/monitoring/supervisor-view";
import { monitoringTabs } from "#/lib/monitoring/tabs";
import type { MonitoringCard, MonitoringFilters, MonitoringTab } from "#/lib/monitoring/types";
import {
  type MonitoringSearchParams,
  type MonitoringViewer,
  resolveMonitoringFilters,
} from "#/lib/monitoring/viewer-filters";
import { cn } from "#/lib/utils";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

const CARD_WIDTH_CLASSES: Record<MonitoringCard["width"], string> = {
  8: "lg:col-span-8",
  12: "lg:col-span-12",
  24: "lg:col-span-24",
};

function loadCard(card: MonitoringCard, filters: MonitoringFilters) {
  return card.load(filters).catch((error: unknown) => {
    Sentry.captureException(error);
    return null;
  });
}

async function LoadedCardBody({
  card,
  filters,
  viewer,
}: {
  card: MonitoringCard;
  filters: MonitoringFilters;
  viewer: MonitoringViewer;
}) {
  const ownFilters =
    viewer.role === "supervisor" ? { ...filters, supervisorId: viewer.supervisorId } : filters;
  const scope = viewer.role === "supervisor" ? supervisorCardScope(card) : "hub";
  const [rows, ownRows] = await Promise.all([
    loadCard(card, scope === "own-rows" ? ownFilters : filters),
    scope === "you-vs-hub" ? loadCard(card, ownFilters) : undefined,
  ]);
  if (!rows || ownRows === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>This card could not load. Reload the page to try again.</AlertTitle>
      </Alert>
    );
  }
  const emphasis =
    viewer.role === "supervisor" && scope !== "own-rows"
      ? { ownSupervisorName: viewer.supervisorName, ownRows }
      : undefined;
  return <MonitoringCardView title={card.title} rows={rows} view={card.view} emphasis={emphasis} />;
}

function MonitoringCardPanel({
  card,
  filters,
  viewer,
}: {
  card: MonitoringCard;
  filters: MonitoringFilters;
  viewer: MonitoringViewer;
}) {
  const showsOwnRowsOnly = viewer.role === "supervisor" && supervisorCardScope(card) === "own-rows";
  return (
    <Card className={cn("min-w-0", CARD_WIDTH_CLASSES[card.width])}>
      <CardHeader>
        <CardTitle className="text-base">{card.title}</CardTitle>
        {card.description && <CardDescription>{card.description}</CardDescription>}
        {showsOwnRowsOnly && <CardDescription>Shows your own rows only.</CardDescription>}
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <LoadedCardBody card={card} filters={filters} viewer={viewer} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

function tabHref(tab: MonitoringTab, searchParams: MonitoringSearchParams) {
  const tabParams = new URLSearchParams({ tab: tab.slug });
  if (searchParams.school) tabParams.set("school", searchParams.school);
  if (searchParams.supervisor) tabParams.set("supervisor", searchParams.supervisor);
  if (searchParams.fellow) tabParams.set("fellow", searchParams.fellow);
  return `?${tabParams.toString()}`;
}

export async function MonitoringDashboard({
  viewer,
  searchParams,
}: {
  viewer: MonitoringViewer;
  searchParams: MonitoringSearchParams;
}) {
  const timeZone = await viewerTimeZone();
  if (!timeZone) {
    return <ViewerTimeZoneCookie serverTimeZone={timeZone} />;
  }

  const { filters, options, projectVisibleId } = await resolveMonitoringFilters(
    viewer,
    searchParams,
    timeZone,
  );
  const selectedTab =
    monitoringTabs.find((tab) => tab.slug === searchParams.tab) ?? monitoringTabs[0];
  if (!selectedTab) return null;

  return (
    <div className="flex flex-col gap-6 p-4">
      <ViewerTimeZoneCookie serverTimeZone={timeZone} />
      <MonitoringFilterBar
        hubName={viewer.hubName}
        ownSupervisorName={viewer.role === "supervisor" ? viewer.supervisorName : null}
        schoolOptions={options.schoolOptions}
        supervisorOptions={options.supervisorOptions}
        fellowOptions={options.fellowOptions}
        selectedSchoolId={filters.schoolId}
        selectedSupervisorId={filters.supervisorId}
        selectedFellowId={filters.fellowId}
      />
      <nav aria-label="Dashboard tabs" className="flex flex-wrap gap-2 border-b pb-2">
        {monitoringTabs.map((tab) => (
          <Link
            key={tab.slug}
            href={tabHref(tab, searchParams)}
            aria-current={tab.slug === selectedTab.slug ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-shamiri-text-dark-grey",
              tab.slug === selectedTab.slug && "bg-shamiri-new-light-blue text-shamiri-new-blue",
            )}
          >
            {tab.title}
          </Link>
        ))}
      </nav>
      {selectedTab.sections.map((section, sectionIndex) => {
        const visibleCards = section.cards.filter(
          (card) =>
            !card.onlyForProjectVisibleId || card.onlyForProjectVisibleId === projectVisibleId,
        );
        if (visibleCards.length === 0) return null;
        return (
          <section key={section.heading ?? sectionIndex} className="flex flex-col gap-4">
            {section.heading && <h2 className="text-lg font-semibold">{section.heading}</h2>}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-24">
              {visibleCards.map((card) => (
                <MonitoringCardPanel
                  key={card.metabaseCardId}
                  card={card}
                  filters={filters}
                  viewer={viewer}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
