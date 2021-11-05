import type { AppProps } from "next/app";
import { ThemeProvider } from "wa-ui";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
