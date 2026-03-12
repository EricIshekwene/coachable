export const BRAND_SLIDER_SX = {
  width: "100%",
  color: "#FF7A18",
  height: 6,
  padding: "6px 0",
  "& .MuiSlider-thumb": {
    width: 12,
    height: 12,
    backgroundColor: "#FF7A18",
    border: "none",
    boxShadow: "none",
    "&::before": {
      boxShadow: "none",
    },
    "&:hover, &.Mui-focusVisible, &.Mui-active": {
      boxShadow: "0 0 0 5px rgba(255, 122, 24, 0.22)",
    },
  },
  "& .MuiSlider-track": {
    backgroundColor: "#FF7A18",
    height: 6,
    border: "none",
    borderRadius: 999,
  },
  "& .MuiSlider-rail": {
    backgroundColor: "rgba(75, 81, 87, 0.55)",
    height: 6,
    borderRadius: 999,
    opacity: 1,
  },
};
