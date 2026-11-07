import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Start each new page at the top (React Router keeps the old scroll position).
// "instant" overrides the smooth scrolling set in index.css.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

export default ScrollToTop;
