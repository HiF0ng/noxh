try {
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "tertiary-container": "#996100",
                        "tertiary": "#784b00",
                        "on-error": "#ffffff",
                        "primary-container": "#2563eb",
                        "on-primary": "#ffffff",
                        "surface-bright": "#f8f9ff",
                        "surface": "#f8f9ff",
                        "surface-container": "#e5eeff",
                        "on-tertiary": "#ffffff",
                        "on-surface-variant": "#434655",
                        "inverse-surface": "#213145",
                        "inverse-primary": "#b4c5ff",
                        "primary": "#004ac6",
                        "primary-fixed": "#dbe1ff",
                        "tertiary-fixed": "#ffddb8",
                        "secondary-container": "#6cf8bb",
                        "on-secondary": "#ffffff",
                        "inverse-on-surface": "#eaf1ff",
                        "secondary": "#006c49",
                        "on-surface": "#0b1c30",
                        "outline": "#737686",
                        "on-secondary-container": "#00714d",
                        "background": "#f8f9ff",
                        "surface-container-lowest": "#ffffff",
                        "surface-container-low": "#eff4ff",
                        "surface-tint": "#0053db",
                        "error": "#ba1a1a",
                        "surface-container-highest": "#d3e4fe",
                        "surface-dim": "#cbdbf5",
                        "on-error-container": "#93000a",
                        "on-background": "#0b1c30",
                        "surface-container-high": "#dce9ff",
                        "surface-variant": "#d3e4fe",
                        "error-container": "#ffdad6",
                        "on-primary-container": "#eeefff",
                        "outline-variant": "#c3c6d7"
                    },
                    borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
                    spacing: { base: "4px", xl: "64px", sm: "16px", xs: "8px", md: "24px", "margin-mobile": "16px", gutter: "24px", "max-width": "1280px", "margin-desktop": "auto", lg: "40px" },
                    fontFamily: {
                        "label-sm": ["Be Vietnam Pro"], "body-lg": ["Be Vietnam Pro"],
                        "body-md": ["Be Vietnam Pro"], "headline-md": ["Be Vietnam Pro"],
                        "label-md": ["Be Vietnam Pro"], "display": ["Be Vietnam Pro"],
                        "headline-lg": ["Be Vietnam Pro"], "headline-lg-mobile": ["Be Vietnam Pro"]
                    },
                    fontSize: {
                        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],
                        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
                        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
                        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
                        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "600" }],
                        "display": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
                        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "700" }],
                        "headline-lg-mobile": ["28px", { lineHeight: "36px", fontWeight: "700" }]
                    }
                }
            }
        };
    } catch(e) {}