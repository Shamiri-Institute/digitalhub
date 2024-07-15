export default function PageFooter() {
  return (
    <footer className="w-full border-t bg-background-secondary">
      <div className="container py-2">
        <div className="flex items-center justify-between text-sm font-medium text-shamiri-text-grey">
          <div>
            <p className="">
              © Copyright {new Date().getFullYear()} Shamiri Institute Inc.
            </p>
          </div>
          <div className="flex gap-x-6">
            <span>Terms of Use</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
