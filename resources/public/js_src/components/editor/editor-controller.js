function EditorController($scope, $mdDialog, $stateParams, EditorService) {
    this.EditorService_ = EditorService;

    this.food = this.food ? this.food : JSON.parse($stateParams.food);
    this.now = moment().startOf("day");
    this.original = this.copyTo(this.food, {});
    this.daysToExpiry = moment(this.food.expires).diff(this.now, 'days');
}

EditorController.prototype.copyTo = function(source, dest) {
    for (var property in source) {
        if (source.hasOwnProperty(property) &&
            property.indexOf('$') < 0) {
            dest[property] = source[property];
        }
    }
    return dest;
};

EditorController.prototype.cancel = function() {
    this.copyTo(this.original, this.food);
    this.EditorService_.cancelEdit();
};

EditorController.prototype.done = function() {
    this.EditorService_.finishEdit(this.food);
};

EditorController.prototype.onDaysToExpiryChanged = function () {
    this.food.expires = momentToIsoString(
        this.now.clone().add('days', this.daysToExpiry));
};

EditorController.prototype.onFrozenStatusChanged = function () {
    if (this.food['frozen?']) {
        this.food['thaw-ttl-days'] = moment(this.food.expires).diff(this.now, "days");
        this.food.expires = momentToIsoString(
            this.now.clone().add("days", FREEZING_EXTENSION));
        console.log("Food frozen", this.food);
    } else {
        this.food.expires = momentToIsoString(
            this.now.clone().add("days", this.food["thaw-ttl-days"]));
        console.log("Food thawed", this.food);
    }
};
