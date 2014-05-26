var compostControllers = angular.module("compostControllers", []);

var storageKey = "ModelData";
model = [// {"name": "Brussels Sprouts",
        //  "age": 4,
        //  "expiresIn": 0},
        // {"name": "Tomato Sauce",
        //  "age": 2,
        //  "expiresIn": 3},
        // {"name": "Italian Sausage",
        //  "age": 0,
        //  "expiresIn": 10}
        ];

/*
  A service for persisting and reloading state from Local Storage.
*/
compostControllers.factory(
    "localStorageService",
    ["$rootScope",
     function($rootScope) {
         var service = {
             saveState: function () {
                 localStorage[storageKey] = JSON.stringify(model);
             },
             loadState: function () {
                 model = JSON.parse(localStorage[storageKey]);
             }
         }

         // Hook up the service to global event handlers.
         $rootScope.$on("stateChanged", service.saveState);
         $rootScope.$on("loadState", service.loadState);

         return service;
     }]);


/*
  Controller for the food list view.
*/
compostControllers.controller("FoodListCtrl", function ($rootScope, $scope) {
    $scope.foods = model;

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
        $rootScope.$broadcast("stateChanged");
    };

    $scope.getAge = function (food) {
        return getDaysUntil(dateFromIsoString(food.created), new Date());
    }

    $scope.getDaysToExpiry = function (food) {
        return getDaysUntil(new Date(), dateFromIsoString(food.expiresOn));
    }

    $scope.getExpirationDate = function (food) {
        if ($scope.getDaysToExpiry(food) == 0) {
            return "today";
        } else {
            return "on " + food.expiresOn;
        }
    }
});

/*
  Controller for the add view.
*/
compostControllers.controller("AddFoodCtrl", function ($rootScope, $scope, $location) {
    $scope.now = new Date();
    $scope.daysToExpiry = 0;
    $scope.food = {
        "created": dateToIsoString(new Date()),
        "expiresOn": dateToIsoString(new Date())
    };

    // When the "Save" button is clicked, add the food to our list.
    $scope.save = function () {
        model.push($scope.food);
        $rootScope.$broadcast("stateChanged");
        $location.path("/foods");
    };

    $scope.onDateChanged = function () {
        $scope.daysToExpiry = getDaysUntil($scope.now, dateFromIsoString($scope.food.expiresOn));
    }
});

function dateToIsoString(d) {
    return d.toISOString().split("T")[0];
}

function dateFromIsoString(s) {
    // parse a date in yyyy-mm-dd format
    var parts = s.split('-');
    // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
    return new Date(parts[0], parts[1]-1, parts[2]); // Note: months are 0-based
}

var millisPerDay = (24 * 60 * 60 * 1000);
function getDaysUntil(begin, end) {
    return Math.round((end.getTime() - begin.getTime()) / millisPerDay);
}
