function EditorController($scope, $mdDialog, $stateParams, EditorService, FoodManager) {
  this.EditorService_ = EditorService;
  this.FoodManager_ = FoodManager;

  this.id = this.id ? this.id : $stateParams.id;

  this.EditorService_.beginAsyncEdit_();
  this.FoodManager_.get(this.id).then(
    function(food) {
      this.food = food;
      this.now = moment().startOf("day");
      this.original = util.copyTo(food, {});
      this.daysToExpiry = moment(food.expires).diff(this.now, 'days');
      return food;
    }.bind(this));
}

EditorController.prototype.cancel = function() {
  util.copyTo(this.original, this.food);
  this.EditorService_.cancelEdit(this.id);
};

EditorController.prototype.done = function() {
  this.EditorService_.finishEdit(this.id);
};

EditorController.prototype.onDaysToExpiryChanged = function () {
  this.food = this.FoodManager_.setDaysToExpiry(this.food, this.daysToExpiry);
};

EditorController.prototype.onFrozenStatusChanged = function () {
  this.food = this.FoodManager_.setFrozenStatus(this.food, this.food['frozen?']);
};
