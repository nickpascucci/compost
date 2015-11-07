function isMobile() {
    return window.matchMedia("only screen and (max-width: 760px)").matches;
}

function momentFromIsoString(s) {
    return moment(s);
}

function momentToIsoString(m) {
    return m.format("YYYY-MM-DD");
}

function getDaysUntil(begin, end) {
    return end.diff(begin, "days");
}
