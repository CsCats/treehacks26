import Script from 'next/script';

const themeScript = `
(function() {
  var key = 'robo-data-theme';
  var stored = localStorage.getItem(key);
  var theme = stored === 'light' || stored === 'dark' ? stored : 'system';
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.add(dark ? 'dark' : 'light');
})();
`;

export default function ThemeScript() {
  return <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
