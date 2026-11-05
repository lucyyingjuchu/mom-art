// The Reels that have gone out, newest first, for reels.html and Exhibitions & News.
// Reels go out at 19:00 Taiwan time: counting back 19 hours makes the day turn over then.
window.postedReels = function (reels) {
    const today = new Date(Date.now() - 19 * 3600e3).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });   // YYYY-MM-DD
    return reels.filter(r => r.date <= today);
};
