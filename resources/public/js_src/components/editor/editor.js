function EditorService($rootScope, $q, $state, $mdDialog, authService, FoodManager) {
    this.q_ = $q;
    this.state_ = $state;
    this.mdDialog_ = $mdDialog;
    this.authService_ = authService;
    this.FoodManager_ = FoodManager;

    this.useDialog = !util.isMobile();
    this.deferred = undefined;
}

EditorService.prototype.create = function() {
    var now = moment().startOf("day");
    var food = {
        "name": "New Food",
        "created": util.momentToIsoString(now),
        "expires": util.momentToIsoString(now),
        "owner": this.authService_.getUserEmail(),
        "quantity": 1,
        "status": "active",
        "frozen?": false,
        "price": 0
    };
    return this.FoodManager_.add(food);
};

EditorService.prototype.edit = function(food) {
    if (this.useDialog) {
        return this.editWithDialog(food.id);
    } else {
        return this.editWithPage(food.id);
    }
};

EditorService.prototype.editWithDialog = function(id) {
    return this.mdDialog_.show({
        clickOutsideToClose: true,
        templateUrl: "partials/editor-dialog.html",
        controller: "EditorController",
        controllerAs: "editorCtrl",
        parent: angular.element(document.body),
        locals: {
            id: id
        },
        bindToController: true
    }).then(
      function() {
        return this.FoodManager_.save(id);
      }.bind(this));
};

EditorService.prototype.beginAsyncEdit_ = function() {
  if (!this.deferred) {
    this.deferred = this.q_.defer();
  }
  return this.deferred.promise;
};

EditorService.prototype.editWithPage = function(id) {
    console.log('Transferring to editor page.');
    this.state_.go('app.foods.edit', {id: id});
    return this.beginAsyncEdit_();
};

EditorService.prototype.cancelEdit = function(id) {
    console.log("Canceled editing");
    if (this.useDialog) {
        this.mdDialog_.cancel();
    } else {
        this.deferred.reject({id: id, reason: "Canceled"});
        this.state_.go('app.foods');
    }
};

EditorService.prototype.finishEdit = function(id) {
  var food = this.FoodManager_.save(id);
  if (this.useDialog) {
    this.mdDialog_.hide(food);
  } else {
    this.deferred.resolve(food);
    this.deferred = null;
    console.log("[es] Done editing:", food);
    this.state_.go('app.foods');
  }
};
