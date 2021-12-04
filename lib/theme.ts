import { extendTheme } from "@chakra-ui/react";

// 2. Add your color mode config
const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const anchorStyle = {
  color: "blue.300",
  _hover: {
    textDecoration: "underline",
  },
};

// 3. extend the theme
const theme = extendTheme({
  config,
  styles: {
    global: {
      a: anchorStyle,
    },
  },
  components: {
    Stat: {
      parts: ["container"],
      baseStyle: {
        container: {
          flex: "unset",
        },
      },
    },
    Breadcrumb: {
      parts: ["link"],
      baseStyle: {
        link: anchorStyle,
      },
    },
  },
  colors: {
    gray: {
      "50": "#F2F2F2",
      "100": "#DBDBDB",
      "200": "#C4C4C4",
      "300": "#ADADAD",
      "400": "#969696",
      "500": "#808080",
      "600": "#666666",
      "700": "#4D4D4D",
      "800": "#1A1A1A",
      "900": "#000000",
    },
    blue: {
      "50": "#E5E6FF",
      "100": "#B8B9FF",
      "200": "#8A8CFF",
      "300": "#5C5FFF",
      "400": "#2E32FF",
      "500": "#0005FF",
      "600": "#0004CC",
      "700": "#000399",
      "800": "#000266",
      "900": "#000133",
    },
    red: {
      "50": "#FFE5E5",
      "100": "#FFB8B8",
      "200": "#FF8A8A",
      "300": "#FF5C5C",
      "400": "#FF2E2E",
      "500": "#FF0000",
      "600": "#CC0000",
      "700": "#990000",
      "800": "#660000",
      "900": "#330000",
    },
    green: {
      "50": "#E5FFE5",
      "100": "#B8FFB8",
      "200": "#8AFF8A",
      "300": "#5CFF5C",
      "400": "#2EFF2E",
      "500": "#00FF00",
      "600": "#00CC00",
      "700": "#009900",
      "800": "#006600",
      "900": "#003300",
    },
    yellow: {
      "50": "#FFFFE5",
      "100": "#FFFFB8",
      "200": "#FFFF8A",
      "300": "#FFFF5C",
      "400": "#FFFF2E",
      "500": "#FFFF00",
      "600": "#CCCC00",
      "700": "#999900",
      "800": "#666600",
      "900": "#333300",
    },
    cyan: {
      "50": "#E5FFFF",
      "100": "#B8FFFF",
      "200": "#8AFFFF",
      "300": "#5CFFFF",
      "400": "#2EFFFF",
      "500": "#00FFFF",
      "600": "#00CCCC",
      "700": "#009999",
      "800": "#006666",
      "900": "#003333",
    },
    purple: {
      "50": "#FFE5FF",
      "100": "#FFB8FF",
      "200": "#FF8AFF",
      "300": "#FF5CFF",
      "400": "#FF2EFF",
      "500": "#FF00FF",
      "600": "#CC00CC",
      "700": "#990099",
      "800": "#660066",
      "900": "#330033",
    },
  },
});

export default theme;
