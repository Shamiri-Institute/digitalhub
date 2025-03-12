export default function PageFooter() {
  return (
    <footer className="w-full border-t bg-background-secondary">
      <div className="container py-2">
        <div className="flex flex-col-reverse gap-4 text-sm font-medium text-shamiri-text-grey lg:flex-row lg:items-center lg:justify-between lg:gap-2">
          <div className="col-span-2">
            <p>
              © Copyright {new Date().getFullYear()} Shamiri Institute Inc.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 lg:flex">
            <span>Terms of Use</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
