interface MetabaseDashboardEmbedProps {
  /** Signed Metabase dashboard embed URL (from buildMetabaseDashboardEmbedUrl). */
  iframeUrl: string;
  title?: string;
  className?: string;
}

export default function MetabaseDashboardEmbed({
  iframeUrl,
  title = "Monitoring and Evaluation",
  className,
}: MetabaseDashboardEmbedProps) {
  return (
    <div className={className ?? "h-full w-full"}>
      <iframe src={iframeUrl} className="h-full w-full border-0" allowTransparency title={title} />
    </div>
  );
}
