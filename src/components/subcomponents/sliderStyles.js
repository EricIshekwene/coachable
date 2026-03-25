export const BRAND_SLIDER_SX = {
  width: "100%",
  color: "#FF7A18",
  height: 3,
  padding: "8px 0",
  "& .MuiSlider-thumb": {
    width: 14,
    height: 14,
    backgroundColor: "#FF7A18",
    border: "none",
    boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
    transition: "box-shadow 0.2s ease",
    "&::before": {
      boxShadow: "none",
    },
    "&:hover, &.Mui-focusVisible": {
      boxShadow: "0 0 0 6px rgba(255, 122, 24, 0.15)",
    },
    "&.Mui-active": {
      boxShadow: "0 0 0 8px rgba(255, 122, 24, 0.2)",
    },
  },
  "& .MuiSlider-track": {
    background: "linear-gradient(90deg, #FF7A18, #FF9F4A)",
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
