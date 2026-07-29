tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            "colors": {
                // Brand Colors
                "primary": "#2563eb",             // Blue
                "secondary": "#10b981",           // Green
                "tertiary": "#f59e0b",            // Orange/Amber
                "neutral": "#64748b",             // Slate/Neutral
                
                // Primary variations
                "primary-container": "#dbeafe",
                "on-primary-container": "#1e40af",
                "on-primary": "#ffffff",
                "inverse-primary": "#93c5fd",
                
                // Secondary variations
                "secondary-container": "#d1fae5",
                "on-secondary-container": "#065f46",
                "on-secondary": "#ffffff",
                
                // Tertiary variations
                "tertiary-container": "#fef3c7",
                "on-tertiary-container": "#92400e",
                "on-tertiary": "#ffffff",
                
                // Surface & Background (Slate-based theme)
                "background": "#f8fafc",          // Slate 50
                "on-background": "#0f172a",       // Slate 900
                "surface": "#ffffff",
                "on-surface": "#0f172a",          // Slate 900
                "surface-variant": "#f1f5f9",     // Slate 100
                "on-surface-variant": "#475569",   // Slate 600
                
                // Surface Containers (Material 3 style mappings to Slate)
                "surface-container-lowest": "#ffffff",
                "surface-container-low": "#f8fafc",
                "surface-container": "#f1f5f9",
                "surface-container-high": "#e2e8f0",
                "surface-container-highest": "#cbd5e1",
                
                // Inverse
                "inverse-surface": "#1e293b",
                "inverse-on-surface": "#f8fafc",
                
                // Outlines & Borders
                "outline": "#94a3b8",             // Slate 400
                "outline-variant": "#e2e8f0",     // Slate 200
                
                // Error states
                "error": "#ef4444",
                "error-container": "#fee2e2",
                "on-error": "#ffffff",
                "on-error-container": "#991b1b"
            },
            "borderRadius": {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
            "spacing": {
                "lg": "40px",
                "margin-mobile": "16px",
                "base": "4px",
                "max-width": "1280px",
                "margin-desktop": "auto",
                "sm": "16px",
                "xs": "8px",
                "gutter": "24px",
                "md": "24px",
                "xl": "64px"
            },
            "fontFamily": {
                "label-sm": ["Be Vietnam Pro", "sans-serif"],
                "display": ["Be Vietnam Pro", "sans-serif"],
                "headline-lg-mobile": ["Be Vietnam Pro", "sans-serif"],
                "body-md": ["Be Vietnam Pro", "sans-serif"],
                "headline-lg": ["Be Vietnam Pro", "sans-serif"],
                "body-lg": ["Be Vietnam Pro", "sans-serif"],
                "headline-md": ["Be Vietnam Pro", "sans-serif"],
                "label-md": ["Be Vietnam Pro", "sans-serif"]
            },
            "fontSize": {
                "label-sm": ["11px", { "lineHeight": "16px", "fontWeight": "500" }],
                "display": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                "headline-lg-mobile": ["24px", { "lineHeight": "32px", "fontWeight": "700" }],
                "body-md": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
                "headline-lg": ["28px", { "lineHeight": "36px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
                "body-lg": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
                "headline-md": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
                "label-md": ["13px", { "lineHeight": "18px", "letterSpacing": "0.01em", "fontWeight": "600" }]
            }
        }
    },
    plugins: [
        tailwind.plugin(function({ addComponents }) {
            addComponents({
                '.status-pill': {
                    '@apply text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded-full text-white inline-block shadow-sm whitespace-nowrap': {}
                },
                '.status-chuanbikhoicong': {
                    '@apply bg-error': {}
                },
                '.status-dangxaydung': {
                    '@apply bg-tertiary': {}
                },
                '.status-chuanbithuhoso': {
                    '@apply bg-inverse-primary': {}
                },
                '.status-dangthuhoso': {
                    '@apply bg-primary': {}
                },
                '.status-hoanthien': {
                    '@apply bg-secondary': {}
                }
            });
        })
    ]
};

