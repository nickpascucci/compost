var compostControllers = angular.module("compostControllers", ["firebase"]);

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

compostControllers.factory("authService", function($location, $firebaseSimpleLogin) {
    ref = new Firebase("https://compost.firebaseio.com");
    var service = {
        dataRef: ref,
        loginObj: $firebaseSimpleLogin(ref),
        logIn: function () {
            service.loginObj.$login("google").then(function(user) {
                service.user = user;
                console.log("Logged in as ", user.displayName);
                $location.path("/foods");
            }, function(error) {
                console.error('Login failed: ', error);
            });
        },
        tryAutoLogin: function() {
            service.loginObj.$getCurrentUser().then(function (user) {
                service.user = user;
                $location.path("/foods");
            });
        },
        getUser: function() {
            return service.user;
        }
    };

    return service;
});

compostControllers.controller("AuthCtrl", function($scope, authService) {
    $scope.logIn = function () {
        authService.logIn();
    }
});

/*
  Controller for the food list view.
*/
compostControllers.controller("FoodListCtrl", function ($scope, modelService) {
    $scope.foods = modelService.model;

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
    $scope.itemRemoved = function (food) {
        index = indexOf(food, $scope.foods);
        if (index == -1) {
            console.err("No such element: " + food.id);
        } else {
            $scope.foods.splice(index, 1);
            $scope.selectedItem = 0;
            modelService.saveState();
        }
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

function indexOf(item, items) {
    var index = -1;
    for (i in items) {
        if (items[i].id == item.id) {
            index = i;
            break;
        }
    }
    return index;
}

/*
  Controller for the add view.
*/
compostControllers.controller("AddFoodCtrl", function ($scope, $location, modelService) {
    $scope.now = moment().startOf("day");
    $scope.daysToExpiry = 0;
    $scope.food = {
        "id": moment().unix(),
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
