export const BUILDING_KINDS=Object.freeze(['tower','barracks','ancient','fountain','filler']);
export const building=e=>BUILDING_KINDS.includes(e?.kind);
