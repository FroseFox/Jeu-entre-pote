'use strict';
const glyphs={
 pause:'<path d="M8 5v14m8-14v14" stroke-width="3.5"/>',play:'<path d="m8 5 11 7-11 7z" fill="currentColor"/>',
 sound:'<path d="m11 5-5 4H3v6h3l5 4zm4 3q4 4 0 8m3-11q7 7 0 14"/>',mute:'<path d="m11 5-5 4H3v6h3l5 4zm5 4 6 6m0-6-6 6"/>',
 gear:'<path d="m10 2 4 .1.7 2.7 2 .9 2.4-1.4 2 3.4-2 2 .2 2.5 2.1 1.9-1.9 3.5-2.7-.6-2 1.3-.4 2.7h-4l-.6-2.7-2.2-1-2.5 1.2-2-3.5 2-1.9-.1-2.4L2.8 9l2-3.5 2.6 1L9.4 5z"/><circle cx="12" cy="12" r="3"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2c0-6 12-6 12 0v2m0-15c4 0 4 6 1 6m2 3q4 0 4 5"/>',activity:'<path d="M2 13h5l3-8 4 14 3-7h5"/>',flag:'<path d="M5 21V3m1 2c5-4 9 4 14 0v9c-5 4-9-4-14 0"/>',chevron:'<path d="m9 5 7 7-7 7"/>',
 store:'<path d="m3 10 2-6h14l2 6q-2 4-5 1-4 4-7 0-3 3-6-1Zm2 3v7h14v-7m-9 7v-6h4v6M8 5l-1 5m8-5 1 5"/>',rotate:'<path d="M20 10a8 8 0 1 0-1 7M20 4v6h-6"/>',minus:'<path d="M5 12h14"/>',plus:'<path d="M5 12h14m-7-7v14"/>',
 sliders:'<path d="M3 7h4m6 0h8M3 17h10m6 0h2"/><circle cx="10" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
 save:'<path d="M4 3h12l4 4v14H4zM8 3v6h8V4M8 21v-8h8v8"/>',mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 3v5"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 0 1 5 .8c0 2-2.5 2-2.5 4M12 16.5v.2"/>',close:'<path d="m6 6 12 12m0-12L6 18"/>',
 promo:'<path d="m4 9 5-.5L18 4v15l-9-4-5-.5z" fill="currentColor"/><path d="m6 15 1.5 5H11l-2-5m12-6 1-1m-1 4h2"/>',
 fly:'<circle cx="12" cy="12" r="8.8"/><circle cx="12" cy="12" r="2.4"/><path d="m12 3 1 6m8 3-6 1m-3 8-1-6m-8-3 6-1m9-4-3 3m-9 9 4-4"/>',
 bolt:'<path d="m14 2-10 12h7l-1 8 10-13h-7z" fill="currentColor"/>',expand:'<path d="M9 3H3v6m12-6h6v6m0 6v6h-6m-6 0H3v-6m0-12 6 6m12-6-6 6m6 12-6-6M3 21l6-6"/>',
 blade:'<circle cx="12" cy="12" r="2"/><path d="M12 10c-1-5-5-6-7-5m9 7c5-1 6-5 5-7m-7 9c1 5 5 6 7 5m-9-7c-5 1-6 5-5 7" stroke-width="2.8"/>',
 ticket:'<path d="M3 7h18v4a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zm6 1v2m0 2v2m0 2v1"/>',bus:'<rect x="4" y="3" width="16" height="16" rx="3"/><path d="M4 12h16M8 6h8M7 16h1m8 0h1m-11 4v1m12-1v1"/>',
 award:'<circle cx="12" cy="9" r="6"/><path d="m8 14-2 7 4-2 2 2 1-6m2-1 3 7"/>',check:'<path d="m4 12 5 5L20 6"/>',keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h1m3 0h1m3 0h1m3 0h.1M6 12h1m3 0h1m3 0h1m-6 4h8"/>',book:'<path d="M5 3h13v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 13h13M8 7h7"/>',
 settings:'<path d="m9.5 3 .5-1h4l.7 2.5 2 .9 2.5-.8 2 3.4-1.8 1.8.2 2.4 1.8 2.1-2 3.5-2.5-.6-2.1 1.2-.6 2.5h-4l-.6-2.6-2.2-1-2.3.8L3 14.7l1.8-2v-2.4L3 8.3l2-3.4 2.6.7 1.6-1.1z"/><circle cx="12" cy="11.6" r="3"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyphs[name]||'')+'</svg>'}
function fillIcons(root=document){root.querySelectorAll('[data-i]').forEach(el=>el.innerHTML=icon(el.dataset.i))}
