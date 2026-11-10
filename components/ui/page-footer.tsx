export default function PageFooter() {
  return (
    <footer className="w-full border-t">
      <div className="container py-3 text-sm text-muted-foreground">
        © {new Date().getFullYear()} Shamiri Institute Inc.
      </div>
    </footer>
  );
}
