var editorModule = angular.module("editorModule", [
    "ngMaterial"
]);

var FREEZING_EXTENSION = 60; // Freezing adds 60 days to food life

function momentToIsoString(m) {
    return m.format("YYYY-MM-DD");
}

editorModule.controller("EditorCtrl", function(
    $scope, $mdDialog, $stateParams, editorService) {

    this.copyTo = function(source, dest) {
        for (var property in source) {
            if (source.hasOwnProperty(property) &&
                property.indexOf('$') < 0) {
                dest[property] = source[property];
            }
        }
        return dest;
    };

    console.log("Food:", JSON.parse($stateParams.food));
    console.log("this.food:", this.food);
    this.food = this.food ? this.food : JSON.parse($stateParams.food);
    console.log("this.food:", this.food);
    this.now = moment().startOf("day");
    this.original = this.copyTo(this.food, {});
    this.daysToExpiry = moment(this.food.expires).diff(this.now, 'days');

    this.cancel = function() {
        this.copyTo(this.original, this.food);
        editorService.cancelEdit();
    };

    this.done = function() {
        editorService.finishEdit(this.food);
    };

    this.onDaysToExpiryChanged = function () {
        this.food.expires = momentToIsoString(
            this.now.clone().add('days', this.daysToExpiry));
    };

    this.onFrozenStatusChanged = function () {
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
});

editorModule.factory("editorService", function(
    $rootScope, $q, $state, $mdDialog, authService) {
    var service = {
        useDialog: !isMobile,
        deferred: undefined,
        create: function() {
            var now = moment().startOf("day");
            var food = {
                "name": "New Food",
                "created": momentToIsoString(now),
                "expires": momentToIsoString(now),
                "owner": authService.getUserEmail(),
                "quantity": 1,
                "status": "active",
                "frozen?": false,
            };
            return service.edit(food);
        },
        edit: function(food) {
            if (service.useDialog) {
                return service.editWithDialog(food);
            } else {
                return service.editWithPage(food);
            }
        },
        editWithDialog: function(food) {
            return $mdDialog.show({
                clickOutsideToClose: true,
                templateUrl: "partials/editor-dialog.html",
                controller: "EditorCtrl",
                controllerAs: "editorCtrl",
                parent: angular.element(document.body),
                locals: {
                    food: food
                },
                bindToController: true
            });
        },
        editWithPage: function(food) {
            service.deferred = $q.defer();
            console.log('Transferring to editor page.');
            $state.go('app.foods.edit', {foodId: food.id,
                                         food: JSON.stringify(food)});
            return deferred.promise;
        },
        cancelEdit: function() {
            console.log("Canceled editing");
            if (service.useDialog) {
                $state.go('app.foods');
            } else {
                $mdDialog.cancel();
            }
        },
        finishEdit: function(food) {
            if (service.useDialog) {
                service.deferred.resolve(food);
                console.log("Done editing:", food);
                $state.go('app.foods');
            } else {
                $mdDialog.hide(food);
            }
        }
    };

    return service;
});
