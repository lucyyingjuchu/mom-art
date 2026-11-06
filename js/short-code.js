// Short artwork links: xiaoranart.com/w/<code>, where the code is the end of the artwork id.
// Usually the last 5 characters. If an older artwork already ends the same way, the newer
// one takes 6 (or more), so a code never changes once it has gone out in a caption.
// Artwork ids start with their creation time, so the smaller id is the older artwork.
// Used by js/lightbox.js (share link) and functions/short-link.js (the redirect).
(function (root) {
    function shortCode(id, allIds) {
        const older = allIds.filter((other) => other < id);
        for (let n = 5; n < id.length; n++) {
            const code = id.slice(-n);
            if (!older.some((other) => other.endsWith(code))) return code;
        }
        return id;
    }

    // The artwork a code belongs to: the oldest id ending with it
    function findByCode(code, artworks) {
        const matches = artworks.filter((a) => a.id.toLowerCase().endsWith(code.toLowerCase()));
        return matches.sort((a, b) => (a.id < b.id ? -1 : 1))[0] || null;
    }

    const api = { shortCode, findByCode };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.ShortCode = api;
})(this);
