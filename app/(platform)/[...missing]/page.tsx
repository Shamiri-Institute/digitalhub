import { notFound } from "next/navigation";

// Next renders an unmatched URL with the root not-found, outside this layout. Matching it here
// shows the platform not-found with the header and tabs.
export default function MissingPlatformPage() {
  notFound();
}
