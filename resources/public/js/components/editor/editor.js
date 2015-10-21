var editorModule = angular.module("editorModule", [
    "ngMaterial"
]);

var FREEZING_EXTENSION = 60; // Freezing adds 60 days to food life

function momentToIsoString(m) {
    return m.format("YYYY-MM-DD");
}

editorModule.controller("EditorCtrl", function($scope, $mdDialog, food) {
    this.copyTo = function(source, dest) {
        for (property in source) {
            if (source.hasOwnProperty(property)
                && property.indexOf('$') < 0) {
                dest[property] = source[property];
            }
        }
        return dest;
    };

    this.now = moment().startOf("day");
    this.original = this.copyTo(food, {});
    this.food = food;
    this.daysToExpiry = moment(food['expires']).diff(this.now, 'days');
    this.cancel = function() {
        this.copyTo(this.original, this.food);
        $mdDialog.cancel();
    };
    this.done = function() {
        $mdDialog.hide(this.food);
    }.bind(this);

    this.onDaysToExpiryChanged = function () {
        this.food["expires"] = momentToIsoString(
            this.now.clone().add('days', this.daysToExpiry));
    }.bind(this);

    this.onFrozenStatusChanged = function () {
        if (this.food['frozen?']) {
            this.food["thaw-ttl-days"] = moment(this.food["expires"]).diff(this.now, "days");
            this.food["expires"] = momentToIsoString(
                this.now.clone().add("days", FREEZING_EXTENSION));
            console.log("Food frozen", this.food);
        } else {
            this.food["expires"] = momentToIsoString(
                this.now.clone().add("days", this.food["thaw-ttl-days"]));
            console.log("Food thawed", this.food);
        }
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
                "quantity": 1,
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
                parent: angular.element(document.body),
                locals: {
                    food: food
                }
            });
        }
    };

    return service;
})
