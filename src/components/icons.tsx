// Minimal stroke icons (24px grid), inherit currentColor.
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };

export const IRadar = () => (<svg {...P}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12l6-6" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>);
export const IWeek = () => (<svg {...P}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>);
export const IBoard = () => (<svg {...P}><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="11" rx="1.5" /><rect x="17" y="4" width="4" height="7" rx="1.5" /></svg>);
export const IBuilding = () => (<svg {...P}><path d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16M15 9h4a1 1 0 011 1v11M3 21h18M8 8h3M8 12h3M8 16h3" /></svg>);
export const IRuns = () => (<svg {...P}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>);
export const ISettings = () => (<svg {...P}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>);
export const IFlame = () => (<svg {...P}><path d="M12 3c1 4 5 5.5 5 10a5 5 0 01-10 0c0-2.5 1.5-3.5 2-5 .8 1.5 1.5 2 2.5 2C11 8 11 5.5 12 3z" /></svg>);
export const ISun = () => (<svg {...P}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
export const IDrop = () => (<svg {...P}><path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" /></svg>);
export const ISnow = () => (<svg {...P}><path d="M12 2v20M4 7l16 10M20 7L4 17" /></svg>);
export const IScale = () => (<svg {...P}><path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 006 0L7 7zM17 7l-3 7a3 3 0 006 0l-3-7zM8 21h8" /></svg>);
export const IPin = () => (<svg {...P}><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>);
export const IRupee = () => (<svg {...P}><path d="M7 4h11M7 9h11M14 4c3 0 3 10-3 10H7l8 7" /></svg>);
export const IClock = () => (<svg {...P}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const INews = () => (<svg {...P}><path d="M4 5h13v14a2 2 0 002 2H6a2 2 0 01-2-2V5zM17 9h3v10a2 2 0 01-2 2M8 9h5M8 13h5M8 17h3" /></svg>);
export const IExt = () => (<svg {...P}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></svg>);
export const ICheck = () => (<svg {...P}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
export const IAlert = () => (<svg {...P}><path d="M12 3l9.5 17h-19L12 3zM12 10v4M12 17.5v.01" /></svg>);
export const IPlay = () => (<svg {...P}><path d="M7 4l13 8-13 8V4z" /></svg>);
export const IMail = () => (<svg {...P}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>);
export const IUser = () => (<svg {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>);
export const ILinkedin = () => (<svg {...P}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 014 0v4M12 10v7" /></svg>);
export const ISearch = () => (<svg {...P}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>);
export const IDownload = () => (<svg {...P}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>);
export const IArrow = () => (<svg {...P}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
