var util = {};

util.isMobile = function() {
  return window.matchMedia("only screen and (max-width: 760px)").matches;
};

util.momentFromIsoString = function(s) {
  return moment(s);
};

util.momentToIsoString = function(m) {
  return m.format("YYYY-MM-DD");
};

util.getDaysUntil = function(begin, end) {
  return end.diff(begin, "days");
};

util.copyTo = function(source, dest) {
  for (var property in source) {
    if (source.hasOwnProperty(property) &&
        property.indexOf('$') < 0) {
      dest[property] = source[property];
    }
  }
  return dest;
};
