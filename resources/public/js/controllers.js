var compostControllers = angular.module("compostControllers", [
    "ngMaterial",
    "editorModule",
    "compostServices"
]);

var FREEZING_EXTENSION = 60; // Freezing adds 60 days to food life

compostControllers.controller("AuthCtrl", function($scope, authService) {
    $scope.immediateFailed = true;
    $scope.signIn = function(authResult) {
        $scope.$apply(function() {
            $scope.processAuth(authResult);
        });
    }

    $scope.processAuth = function(authResult) {
        $scope.immediateFailed = true;
        if ($scope.isSignedIn) {
            return 0;
        }
        if (authResult['access_token']) {
            $scope.immediateFailed = false;
            // Successfully authorized, create session
            authService.onSuccessfulLogin(authResult);
        } else if (authResult['error']) {
            if (authResult['error'] == 'immediate_failed') {
                $scope.immediateFailed = true;
            } else {
                console.log('Error:' + authResult['error']);
            }
        }
    }

    $scope.renderSignIn = function() {
        gapi.signin.render('gsignin', {
            'callback': $scope.signIn,
            'clientid': '564625248083-vrmpbbdr39uelvr3iirme4vuc5kckeu7.apps.googleusercontent.com',
            'cookiepolicy': 'single_host_origin',
            'scope': 'profile',
            'theme': 'dark',
            'width': 'wide',
        });
    }

    $scope.logOut = function () {
        $scope.immediateFailed = true;
        authService.logOut();
    }

    $scope.renderSignIn();
});

/*
  Controller for the food list view.
*/
compostControllers.controller(
    "FoodListCtrl", function ($scope, authService, editorService, UserFoods) {
        authService.checkLogIn();
        this.scope_ = $scope;

        $scope.foods = UserFoods.query();

        $scope.getActiveFoods = function (foods) {
            return foods.filter(function(e, i, a) {
                return e["status"] === "active";
            });
        };

        // ID of selected item.
        $scope.selectedItem = 0;

        $scope.addFood = function() {
            editorService.create()
                .then(function(food) {
                    console.log("done editing", food);
                    UserFoods.save(food, function () {
                        this.foods.push(food);
                    }.bind(this));
                }.bind(this));
        }

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
            food["status"] = "eaten";
            food.$save();
        };

        // TODO: Count a "consumed" removal separately from a "trashed" removal
        $scope.itemRemoved = function (food) {
            food["status"] = "trashed";
            food.$save();
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

        $scope.edit = function (food) {
            editorService.edit(food)
                .then(function(food) {
                    console.log("Done editing", food);
                    food.$save();
                }.bind(this));
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
        "status": "active",
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
