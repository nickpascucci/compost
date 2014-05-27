var compostApp = angular.module("compostApp", [
    "ngRoute",
    "compostControllers"
]);

compostApp.config([
    "$routeProvider",
    function($routeProvider) {
        $routeProvider
            .when("/foods", {
                templateUrl: "partials/foods.html",
                controller: "FoodListCtrl"
            }).when("/login", {
                templateUrl: "partials/login.html",
                controller: "AuthCtrl"
            }).when("/add", {
                templateUrl: "partials/add.html",
                controller: "AddFoodCtrl"
            }).otherwise({
                redirectTo: "/login"
            });
    }])
    .run(function($rootScope, $location, authService) {
        // When the route changes, load data from persistent storage.
        $rootScope.$on("$routeChangeStart", function (event, next, current) {
            if(!authService.getUser()) {
                $location.path("/login");
                authService.tryAutoLogin();
            } else {
                console.log("Already logged in");
            }
        });
    });
