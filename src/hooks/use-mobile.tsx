import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false); // Default to false
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(mql.matches);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches); // Set initial value on client based on current media query state
    return () => mql.removeEventListener("change", onChange);
  }, []);

  if (!hasMounted) {
    // On the server, and on the client before hydration (useEffect runs),
    // return the default value (false) to ensure consistency with server render.
    return false;
  }
  return isMobile;
}
