var foodListModule = angular.module("foodListModule", [
    "ngMaterial",
    "editorModule",
    "authModule",
    "compostServices"
]);

var FREEZING_EXTENSION = 60; // Freezing adds 60 days to food life

/*
  Controller for the food list view.
*/
foodListModule.controller(
    "FoodListCtrl", function ($scope, authService, editorService, UserFoods) {
        authService.checkLogIn();
        this.scope_ = $scope;

        $scope.foods = UserFoods.query();

        $scope.getActiveFoods = function (foods) {
            return foods.filter(function(e, i, a) {
                return e.status === "active";
            });
        };

        // ID of selected item.
        $scope.selectedItem = 0;

        $scope.addFood = function() {
            editorService.create()
                .then(function(food) {
                    console.log("Created", food);
                    UserFoods.save(food, function (saved) {
                        this.foods.push(saved);
                    }.bind(this));
                }.bind(this));
        };

        // When an item is clicked, switch sides.
        $scope.itemClicked = function (food) {
            if ($scope.selectedItem != food.id) {
                $scope.selectedItem = food.id;
            } else {
                $scope.selectedItem = 0;
            }
        };

        // When the "Remove" button is clicked, remove the element.
        $scope.itemConsumed = function (food) {
            console.log("Consumed one unit of", food);
            food.quantity--;
            if (food.quantity === 0) {
                food.status = "eaten";
            }
            food.$save();
        };

        // TODO: Count a "consumed" removal separately from a "trashed" removal
        $scope.itemRemoved = function (food) {
            food.status = "trashed";
            food.$save();
        };

        $scope.edit = function (food) {
            editorService.edit(food)
                .then(function(edited) {
                    console.log("Done editing", edited);
                    edited.$save();
                }.bind(this));
        };

        $scope.showNotes = function (food) {
            // TODO Handle showing notes
        };

        $scope.getIsFrozen = function (food) {
            var frozen = false || food["frozen?"];
            return frozen;
        };

        $scope.getAge = function (food) {
            return getDaysUntil(momentFromIsoString(food.created), moment().startOf("day"));
        };

        $scope.getDaysToExpiry = function (food) {
            return getDaysUntil(moment().startOf("day"), momentFromIsoString(food.expires));
        };

        $scope.getExpirationDate = function (food) {
            if ($scope.getDaysToExpiry(food) === 0) {
                return "today";
            } else if ($scope.getDaysToExpiry(food) == 1) {
                return "tomorrow";
            } else {
                return "on " + food.expires;
            }
        };
    }
);

function momentFromIsoString(s) {
    return moment(s);
}

function getDaysUntil(begin, end) {
    return end.diff(begin, "days");
}
