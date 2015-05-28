var compostControllers = angular.module("compostControllers", ["compostServices"]);

var storageKey = "ModelData";
var FREEZING_EXTENSION = 60; // Freezing adds 60 days to food life

compostControllers.controller("AuthCtrl", function($scope, authService) {
    $scope.logIn = function () {
        authService.logIn();
    },
    $scope.logOut = function () {
        authService.logOut();
    }
});

/*
  Controller for the food list view.
*/
compostControllers.controller(
    "FoodListCtrl", function ($scope, authService, UserFoods) {
        authService.checkLogIn();
        $scope.foods = UserFoods.query();

        // ID of selected item.
        $scope.selectedItem = 0;

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
            food.$delete();
            $scope.foods = $scope.foods.filter(function (f) { return f.id != food.id });
        };

        // TODO: Count a "consumed" removal separately from a "trashed" removal
        $scope.itemRemoved = function (food) {
            food.$delete();
            $scope.foods = $scope.foods.filter(function (f) { return f.id != food.id });
        };

        $scope.itemFrozen = function (food) {
            food["frozen?"] = true;
            var now = moment().startOf("day");
            food["thaw-ttl-days"] = moment(food["expires"]).diff(now, "days");
            food["expires"] = momentToIsoString(now.clone().add("days", FREEZING_EXTENSION));
            food.$save();
        };

        $scope.itemThawed = function (food) {
            food["frozen?"] = false;
            var now = moment().startOf("day");
            food["expires"] = momentToIsoString(now.clone().add("days", food["thaw-ttl-days"]));
            food.$save();
        };

        $scope.showNotes = function (food) {
            // TODO Handle showing notes
        };

        $scope.getIsFrozen = function (food) {
            var frozen = false || food["frozen?"];
            return frozen;
        }

        $scope.getAge = function (food) {
            return getDaysUntil(momentFromIsoString(food.created), moment().startOf("day"));
        }

        $scope.getDaysToExpiry = function (food) {
            return getDaysUntil(moment().startOf("day"), momentFromIsoString(food.expires));
        }

        $scope.getExpirationDate = function (food) {
            if ($scope.getDaysToExpiry(food) == 0) {
                return "today";
            } else if ($scope.getDaysToExpiry(food) == 1) {
                return "tomorrow";
            } else {
                return "on " + food.expires;
            }
        }
    });

/*
  Controller for the add view.
*/
compostControllers.controller("AddFoodCtrl", function ($scope, $location, authService, UserFoods) {
    authService.checkLogIn();
    $scope.now = moment().startOf("day");
    $scope.daysToExpiry = 0;
    $scope.showDays = true;
    $scope.food = {
        "name": "New Food",
        "created": momentToIsoString(moment().startOf("day")),
        "expires": momentToIsoString($scope.now.clone().add("days", $scope.daysToExpiry)),
        "owner": authService.getUserEmail(),
        "frozen?": false,
    };

    // When the "Save" button is clicked, add the food to our list.
    $scope.save = function () {
        UserFoods.save($scope.food, function () {
            console.log("Saved food ", $scope.food);
        });

        $location.path("/foods");
    };

    $scope.cancel = function () {
        $location.path("/foods");
    };

    $scope.onDaysToExpiryChanged = function () {
        $scope.food["expires"] = momentToIsoString(
            $scope.now.clone().add('days', $scope.daysToExpiry));
    }

    $scope.onDateChanged = function () {
        $scope.daysToExpiry = getDaysUntil($scope.now, momentFromIsoString($scope.food.expires));
    }

    $scope.toggleDateFormat = function () {
        $scope.showDays = !$scope.showDays;
    }
});

function momentToIsoString(m) {
    return m.format("YYYY-MM-DD");
}

function momentFromIsoString(s) {
    return moment(s);
}

var millisPerDay = (24 * 60 * 60 * 1000);
function getDaysUntil(begin, end) {
    return end.diff(begin, "days");
}
