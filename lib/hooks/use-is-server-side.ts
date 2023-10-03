import * as React from "react";

export function useIsServerSide() {
  const [isServerSide, setIsServerSide] = React.useState(true);

  React.useEffect(() => {
    setIsServerSide(false);
  }, [setIsServerSide]);

  return isServerSide;
}
