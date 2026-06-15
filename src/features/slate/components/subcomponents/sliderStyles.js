export const BRAND_SLIDER_SX = {
  width: "100%",
  color: "var(--color-BrandOrange)",
  height: 3,
  padding: "8px 0",
  "& .MuiSlider-thumb": {
    width: 14,
    height: 14,
    backgroundColor: "var(--color-BrandOrange)",
    border: "none",
    boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
    transition: "box-shadow 0.2s ease",
    "&::before": {
      boxShadow: "none",
    },
    "&:hover, &.Mui-focusVisible": {
      boxShadow: "0 0 0 6px color-mix(in srgb, var(--color-BrandOrange) 15%, transparent)",
    },
    "&.Mui-active": {
      boxShadow: "0 0 0 8px color-mix(in srgb, var(--color-BrandOrange) 20%, transparent)",
    },
  },
  "& .MuiSlider-track": {
    background: "linear-gradient(90deg, var(--color-BrandOrange), color-mix(in srgb, var(--color-BrandOrange) 75%, #fff 25%))",
    height: 3,
    border: "none",
    borderRadius: 999,
  },
  "& .MuiSlider-rail": {
    backgroundColor: "rgba(75, 81, 87, 0.3)",
    height: 3,
    borderRadius: 999,
    opacity: 1,
  },
};
