import React from "react";
import { SketchPicker } from "react-color";

export const ColorPickerPopover = ({ color, onChange }) => {
    const presetColors = ["#D0021B", "#F5A623", "#F8E71C", "#8B572A", "#7ED321", "#561ecb", "#F8E71C", "#8B572A"];

    return (
        <div
            className="
        ml-2 rounded-md
        bg-BrandBlack
        p-3 sm:p-4
        w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[240px]
        shadow-lg
      "
        >
            <style>{`
        /* ===== Root picker panel ===== */
        .sketch-picker {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          width: 100% !important;
        }

        /* The "card" around the picker in SketchPicker */
        .sketch-picker > div {
          background: transparent !important;
        }

        /* Saturation area rounding */
        .sketch-picker .saturation-white,
        .sketch-picker .saturation-black {
          
        }

        /* Hue / Alpha bars */
        .sketch-picker .hue-horizontal,
        .sketch-picker .alpha-horizontal {
          border-radius: 9999px !important;
          height: 10px !important;
        }

        /* Labels (hex / r g b a) */
        .sketch-picker label {
          color: #FF7A18 !important; /* BrandOrange */
          font-size: 0.75rem !important;
        }

        /* ===== The input WRAPPERS are often where the border is ===== */
        .sketch-picker .flexbox-fix {
          border-top: 1px solid rgba(154,160,166,0.25) !important; /* subtle divider */
          margin-top: 10px !important;
          padding-top: 10px !important;
        }

        /* Each input block wrapper */
        .sketch-picker .flexbox-fix > div {
          background: transparent !important;
        }

        /* Wrapper around the actual input */
        .sketch-picker input {
          background: #121212 !important; /* BrandBlack */
          border: none !important;        /* kill borders */
          outline: none !important;
          box-shadow: none !important;
          color: #F5F7FA !important;      /* BrandWhite */
          border-radius: 0.375rem !important;
          font-size: 0.75rem !important;
          padding: 0.35rem 0.5rem !important;
          width: 100% !important;
        }

        /* Some versions put a border on the div around the input */
        .sketch-picker input + span,
        .sketch-picker input:focus,
        .sketch-picker input:active {
          border: none !important;
          outline: none !important;
          box-shadow: 0 0 0 1px rgba(255,122,24,0.55) !important; /* orange focus ring */
        }

        /* The HEX box container sometimes has inline border */
        .sketch-picker .flexbox-fix div[style*="border"] {
          border: none !important;
        }

        /* Preset color swatches section divider */
        .sketch-picker > div:last-child {
          border-top: 1px solid rgba(154,160,166,0.25) !important;
          margin-top: 10px !important;
          padding-top: 10px !important;
        }
      `}</style>

            <SketchPicker
                color={color}
                onChange={onChange}
                onChangeComplete={onChange}
                disableAlpha={true}
                presetColors={presetColors}
                width={220}
            />
        </div>
    );
};
