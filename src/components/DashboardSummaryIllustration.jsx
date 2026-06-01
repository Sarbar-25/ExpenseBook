import { useId } from "react";

/**
 * Decorative illustration for Dashboard Summary Cards.
 * - Decorative only (aria-hidden)
 * - Lightweight SVG
 * - Opacity controlled via CSS
 */
export default function DashboardSummaryIllustration({
    variant,
    className = "",
}) {
    const v = String(variant || "").toLowerCase();
    const svgId = useId().replace(/:/g, "");

    const stroke = "rgba(79, 70, 229, 0.55)";
    const fillA = "rgba(59, 130, 246, 0.75)";
    const fillB = "rgba(139, 92, 246, 0.75)";
    const glow = "rgba(99, 102, 241, 0.22)";
    const gradientA = `summary-grad-a-${svgId}`;
    const gradientB = `summary-grad-b-${svgId}`;
    const gradientC = `summary-grad-c-${svgId}`;

    // Keep SVG viewBox 0 0 64 64 so sizing is consistent.
    const common = {
        width: "100%",
        height: "100%",
        viewBox: "0 0 64 64",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        className,
        "aria-hidden": true,
        focusable: "false",
    };

    const GradientDefs = (
        <defs>
            <linearGradient id={gradientA} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={fillA} stopOpacity="0.95" />
                <stop offset="1" stopColor={fillB} stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id={gradientB} x1="64" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={fillB} stopOpacity="0.95" />
                <stop offset="1" stopColor={fillA} stopOpacity="0.95" />
            </linearGradient>
            <radialGradient id={gradientC} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(46 18) rotate(135) scale(28)">
                <stop offset="0" stopColor={glow} stopOpacity="0.85" />
                <stop offset="1" stopColor={glow} stopOpacity="0" />
            </radialGradient>
        </defs>
    );

    const NetWorth = (
        <>
            {GradientDefs}
            <circle cx="46" cy="18" r="18" fill={`url(#${gradientC})`} />
            <path d="M32 10l12 5v9c0 10-6.8 16.6-12 19-5.2-2.4-12-9-12-19v-9l12-5z" fill={`url(#${gradientA})`} fillOpacity="0.18" />
            <path d="M32 10l12 5v9c0 10-6.8 16.6-12 19-5.2-2.4-12-9-12-19v-9l12-5z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
            <rect x="23" y="26" width="18" height="12" rx="5" stroke={stroke} strokeWidth="2" />
            <path d="M27 26.5c.6-2.7 2.8-4.5 5-4.5s4.4 1.8 5 4.5" stroke={`url(#${gradientA})`} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M28 32h8" stroke={`url(#${gradientB})`} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="37" cy="32" r="1.8" fill={`url(#${gradientA})`} />
        </>
    );

    const TotalBalance = (
        <>
            {GradientDefs}
            <circle cx="46" cy="18" r="18" fill={`url(#${gradientC})`} />
            <rect x="15" y="20" width="34" height="24" rx="8" fill={`url(#${gradientA})`} fillOpacity="0.16" />
            <rect x="15" y="20" width="34" height="24" rx="8" stroke={stroke} strokeWidth="2" />
            <path d="M15 28h34" stroke={`url(#${gradientA})`} strokeWidth="2.5" />
            <rect x="38" y="33" width="7" height="4" rx="2" fill={`url(#${gradientB})`} />
            <path d="M21 40h12" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            <path d="M21 16c1.8-3.3 5.4-5 10.8-5 5.4 0 9.5 1.7 12.2 5.2" stroke={`url(#${gradientB})`} strokeWidth="3" strokeLinecap="round" />
            <rect x="20" y="22" width="24" height="22" rx="8" stroke={stroke} strokeWidth="2" />
            <path d="M32 28v10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            <path d="M27 33h10" stroke={`url(#${gradientB})`} strokeWidth="3" strokeLinecap="round" />
        </>
    );

    const LentOut = (
        <>
            {GradientDefs}
            <circle cx="46" cy="18" r="18" fill={`url(#${gradientC})`} />
            <rect x="16" y="28" width="22" height="14" rx="7" stroke={stroke} strokeWidth="2" />
            <path d="M22 35h10" stroke={`url(#${gradientB})`} strokeWidth="3" strokeLinecap="round" />
            <circle cx="21" cy="33" r="2" fill={`url(#${gradientA})`} />
            <path d="M26 19h18" stroke={`url(#${gradientA})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M38 14l8 5-8 5" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 23c4-3 8-4.2 12.2-4.2" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </>
    );

    const Borrowed = (
        <>
            {GradientDefs}
            <circle cx="46" cy="18" r="18" fill={`url(#${gradientC})`} />
            <rect x="26" y="28" width="22" height="14" rx="7" stroke={stroke} strokeWidth="2" />
            <path d="M32 35h10" stroke={`url(#${gradientA})`} strokeWidth="3" strokeLinecap="round" />
            <circle cx="43" cy="33" r="2" fill={`url(#${gradientB})`} />
            <path d="M20 19h18" stroke={`url(#${gradientB})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M26 14l-8 5 8 5" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44 23c-4-3-8-4.2-12.2-4.2" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </>
    );

    const Senders = (
        <>
            {GradientDefs}
            <circle cx="46" cy="18" r="18" fill={`url(#${gradientC})`} />
            <circle cx="32" cy="22" r="8" fill={`url(#${gradientA})`} fillOpacity="0.2" stroke={stroke} strokeWidth="2" />
            <circle cx="20" cy="28" r="5.5" fill={`url(#${gradientB})`} fillOpacity="0.14" stroke={stroke} strokeWidth="1.8" />
            <circle cx="44" cy="28" r="5.5" fill={`url(#${gradientA})`} fillOpacity="0.14" stroke={stroke} strokeWidth="1.8" />
            <path d="M19 45c1.6-7.5 6.8-12 13-12s11.4 4.5 13 12" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            <path d="M12.5 43c1.1-5.3 4.4-8.4 8.8-9.6" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M42.7 33.4c4.4 1.2 7.7 4.3 8.8 9.6" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        </>
    );

    const Receivers = (
        <>
            {GradientDefs}
            <circle cx="46" cy="18" r="18" fill={`url(#${gradientC})`} />
            <circle cx="27" cy="23" r="8.5" fill={`url(#${gradientB})`} fillOpacity="0.18" stroke={stroke} strokeWidth="2" />
            <path d="M15 45c1.8-7.8 6.8-12.4 12-12.4 3.1 0 5.9 1 8.3 3.1" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            <path d="M40 18v20" stroke={`url(#${gradientA})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M34 32l6 6 6-6" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="35" y="14" width="10" height="10" rx="5" fill={`url(#${gradientA})`} fillOpacity="0.16" stroke={stroke} strokeWidth="1.8" />
        </>
    );

    const Sent = (
        <>
            {GradientDefs}
            <circle cx="46" cy="18" r="18" fill={`url(#${gradientC})`} />
            <rect x="14" y="24" width="24" height="16" rx="8" stroke={stroke} strokeWidth="2" />
            <path d="M20 32h10" stroke={`url(#${gradientB})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M24 18h18" stroke={`url(#${gradientA})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M36 13l8 5-8 5" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 22c4-2.3 7.7-3.7 11.6-4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </>
    );

    const Received = (
        <>
            {GradientDefs}
            <circle cx="46" cy="18" r="18" fill={`url(#${gradientC})`} />
            <rect x="26" y="24" width="24" height="16" rx="8" stroke={stroke} strokeWidth="2" />
            <path d="M32 32h10" stroke={`url(#${gradientA})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M22 18h18" stroke={`url(#${gradientB})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M28 13l-8 5 8 5" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M45 22c-4-2.3-7.7-3.7-11.6-4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </>
    );

    let body = null;
    switch (v) {
        case "networth":
            body = NetWorth;
            break;
        case "totalbalance":
            body = TotalBalance;
            break;
        case "lentout":
            body = LentOut;
            break;
        case "borrowed":
            body = Borrowed;
            break;
        case "senders":
            body = Senders;
            break;
        case "receivers":
            body = Receivers;
            break;
        case "sent":
            body = Sent;
            break;
        case "received":
            body = Received;
            break;
        default:
            body = TotalBalance;
    }

    return (
        <svg {...common}>
            {/* opacity set in CSS; keep gradient shapes fully opaque here */}
            {body}
        </svg>
    );
}

