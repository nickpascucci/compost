var compostControllers = angular.module("compostControllers", []);

var storageKey = "ModelData";

/*
  A service for persisting and reloading state from Local Storage.
*/
compostControllers.factory(
    "modelService",
    ["$rootScope",
     function($rootScope) {
         var service = {
             model: [],
             saveState: function () {
                 console.log("Saving model: " + JSON.stringify(service.model));
                 localStorage[storageKey] = angular.toJson(service.model);
             },
             loadState: function () {
                 storedData = localStorage[storageKey];
                 if (storedData) {
                     service.model = JSON.parse(storedData);
                     console.log("Loaded data: " + storedData);
                 } else {
                     console.log("No stored data to load");
                 }
             }
         }

         return service;
     }]);


/*
  Controller for the food list view.
*/
compostControllers.controller("FoodListCtrl", function ($scope, modelService) {
    $scope.foods = modelService.model;

    $scope.selectedItem = -1;

    // When an item is clicked, switch sides.
    $scope.itemClicked = function ($index) {
        if ($scope.selectedItem != $index) {
            $scope.selectedItem = $index;
        } else {
            $scope.selectedItem = -1;
        }
    };

    // When the "Remove" button is clicked, remove the element.
    $scope.itemRemoved = function ($index) {
        $scope.foods.splice($index, 1);
        $scope.selectedItem = -1;
        modelService.saveState();
    };

    $scope.getAge = function (food) {
        return getDaysUntil(momentFromIsoString(food.created), moment().startOf("day"));
    }

    $scope.getDaysToExpiry = function (food) {
        return getDaysUntil(moment().startOf("day"), momentFromIsoString(food.expiresOn));
    }

    $scope.getExpirationDate = function (food) {
        if ($scope.getDaysToExpiry(food) == 0) {
            return "today";
        } else if ($scope.getDaysToExpiry(food) == 1) {
            return "tomorrow";
        } else {
            return "on " + food.expiresOn;
        }
    }
});

/*
  Controller for the add view.
*/
compostControllers.controller("AddFoodCtrl", function ($scope, $location, modelService) {
    $scope.now = moment().startOf("day");
    $scope.daysToExpiry = 0;
    $scope.food = {
        "name": "New Food",
        "created": momentToIsoString(moment().startOf("day")),
        "expiresOn": momentToIsoString(moment().startOf("day"))
    };

    // When the "Save" button is clicked, add the food to our list.
    $scope.save = function () {
        modelService.model.push($scope.food);
        modelService.saveState();
        $location.path("/foods");
    };

    $scope.cancel = function () {
        $location.path("/foods");
    };

    $scope.onDateChanged = function () {
        $scope.daysToExpiry = getDaysUntil($scope.now, momentFromIsoString($scope.food.expiresOn));
    }
});

function momentToIsoString(m) {
    return m.format("YYYY-MM-DD");
}

function momentFromIsoString(s) {
    return moment(s);
}

// TODO Calculate based on calendar days, not milliseconds.
var millisPerDay = (24 * 60 * 60 * 1000);
function getDaysUntil(begin, end) {
    return end.diff(begin, "days");
}
