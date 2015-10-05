var editorModule = angular.module("editorModule", [
    "ngMaterial"
]);

editorModule.controller("EditorCtrl", function($scope, $mdDialog, food) {
    this.now = moment().startOf("day");
    this.food = food;
    this.daysToExpiry = moment(food['expires']).diff(this.now, 'days');
    this.cancel = function() {
        $mdDialog.cancel();
    };
    this.done = function() {
        $mdDialog.hide(this.food);
    }.bind(this);

    this.onDaysToExpiryChanged = function () {
        this.food["expires"] = momentToIsoString(
            this.now.clone().add('days', this.daysToExpiry));
    }.bind(this);
})

editorModule.factory("editorService", function($rootScope, $mdDialog, authService) {
    var service = {
        create: function() {
            var now = moment().startOf("day");
            var food = {
                "name": "New Food",
                "created": momentToIsoString(now),
                "expires": momentToIsoString(now),
                "owner": authService.getUserEmail(),
                "status": "active",
                "frozen?": false,
            };
            return service.edit(food);
        },
        edit: function(food) {
            return $mdDialog.show({
                clickOutsideToClose: true,
                templateUrl: "js/components/editor/editor.html",
                controller: "EditorCtrl",
                controllerAs: "editorCtrl",
                locals: {
                    food: food
                }
            });
        }
    };

    return service;
})
