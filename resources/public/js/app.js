var compostApp = angular.module("compostApp", [
    "ngRoute",
    "ngMaterial",
    "compostControllers",
    "compostServices"
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
            }).otherwise({
                redirectTo: "/login"
            });
    }])
    .run(function($rootScope, $location, authService) {
        $rootScope.$on("$routeChangeStart", function (event, next, current) {
            authService.checkLogIn();
        });
    });
