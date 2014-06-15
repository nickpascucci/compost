var compostControllers = angular.module("compostControllers", ["firebase"]);

var storageKey = "ModelData";

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
                if (!user) {
                    $location.path("/login");
                }
            });
        },
        getUser: function() {
            return service.user;
        },
        checkLogIn: function() {
            if (!service.user) {
                $location.path("/login");
            }
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
compostControllers.controller(
    "FoodListCtrl", function ($scope, $firebase, authService) {
        authService.checkLogIn();
        peopleRef = new Firebase("https://compost.firebaseio.com/people");
        userRef = peopleRef.child(authService.getUser().id);
        $firebase(userRef).$bind($scope, "foods");

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
            delete $scope.foods[food.id];
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
compostControllers.controller("AddFoodCtrl", function ($scope, $location, $firebase, authService) {
    authService.checkLogIn();
    $scope.now = moment().startOf("day");
    $scope.daysToExpiry = 0;
    $scope.showDays = true;
    $scope.food = {
        "id": moment().unix(),
        "name": "New Food",
        "created": momentToIsoString(moment().startOf("day")),
        "expiresOn": momentToIsoString($scope.now.clone().add("days", $scope.daysToExpiry)),
    };

    // When the "Save" button is clicked, add the food to our list.
    $scope.save = function () {
        peopleRef = new Firebase("https://compost.firebaseio.com/people");
        userRef = peopleRef.child(authService.getUser().id);
        itemRef = userRef.child($scope.food.id);
        $firebase(itemRef).$set($scope.food);

        $location.path("/foods");
    };

    $scope.cancel = function () {
        $location.path("/foods");
    };

    $scope.onDaysToExpiryChanged = function () {
        $scope.food["expiresOn"] = momentToIsoString(
            $scope.now.clone().add('days', $scope.daysToExpiry));
    }

    $scope.onDateChanged = function () {
        $scope.daysToExpiry = getDaysUntil($scope.now, momentFromIsoString($scope.food.expiresOn));
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
