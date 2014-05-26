var compostApp = angular.module("compostApp", [
    "ngRoute",
    "compostControllers"
]);

var stateLoaded = false;

compostApp.config([
    "$routeProvider",
    function($routeProvider) {
        $routeProvider
            .when("/foods", {
                templateUrl: "partials/food-list.html",
                controller: "FoodListCtrl"
            }).when("/add", {
                templateUrl: "partials/add-form.html",
                controller: "AddFoodCtrl"
            }).otherwise({
                redirectTo: "/foods"
            });
    }])
    .run(function($rootScope, modelService) {
        // When the route changes, load data from persistent storage.
        $rootScope.$on("$routeChangeStart", function (event, next, current) {
            if (!stateLoaded) {
                console.log("Session state not loaded, checking local storage.");
                modelService.loadState();
                stateLoaded = true;
            } else {
                console.log("Session state already loaded");
            }
        });

        // When the window is unloaded, persist state.
        // The state should be persisted on each change, but it doesn't hurt to do it here too.
        window.onbeforeunload = function (event) {
            modelService.saveState();
        };
    });
