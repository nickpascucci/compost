function EditorService($rootScope, $q, $state, $mdDialog, authService) {
    this.q_ = $q;
    this.state_ = $state;
    this.mdDialog_ = $mdDialog;
    this.authService_ = authService;

    this.useDialog = !isMobile();
    this.deferred = undefined;
}

EditorService.prototype.create = function() {
    var now = moment().startOf("day");
    var food = {
        "name": "New Food",
        "created": momentToIsoString(now),
        "expires": momentToIsoString(now),
        "owner": this.authService_.getUserEmail(),
        "quantity": 1,
        "status": "active",
        "frozen?": false,
    };
    return this.edit(food);
};

EditorService.prototype.edit = function(food) {
    if (this.useDialog) {
        return this.editWithDialog(food);
    } else {
        return this.editWithPage(food);
    }
};

EditorService.prototype.editWithDialog = function(food) {
    return this.mdDialog_.show({
        clickOutsideToClose: true,
        templateUrl: "partials/editor-dialog.html",
        controller: "EditorController",
        controllerAs: "editorCtrl",
        parent: angular.element(document.body),
        locals: {
            food: food
        },
        bindToController: true
    });
};

EditorService.prototype.editWithPage = function(food) {
    this.deferred = this.q_.defer();
    console.log('Transferring to editor page.');
    this.state_.go('app.foods.edit', {foodId: food.id,
                                 food: JSON.stringify(food)});
    return this.deferred.promise;
};

EditorService.prototype.cancelEdit = function() {
    console.log("Canceled editing");
    if (this.useDialog) {
        this.mdDialog_.cancel();
    } else {
        this.deferred.reject("Canceled");
        this.state_.go('app.foods');
    }
};

EditorService.prototype.finishEdit = function(food) {
    if (this.useDialog) {
        this.mdDialog_.hide(food);
    } else {
        this.deferred.resolve(food);
        console.log("Done editing:", food);
        this.state_.go('app.foods');
    }
};
