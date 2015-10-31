var compostApp = angular.module("compostApp", [
    "ngRoute",
    "ngMaterial",
    "foodListModule",
    "compostServices",
    "ui.router"
]);

compostApp.config([
    "$urlRouterProvider",
    "$stateProvider",
    function($urlRouterProvider, $stateProvider) {
        $urlRouterProvider.otherwise("/login");
        $stateProvider
            .state("foods", {
                url: "/foods",
                templateUrl: "partials/foods.html",
                controller: "FoodListCtrl"
            }).state("login", {
                url: "/login",
                templateUrl: "partials/login.html",
                controller: "AuthCtrl"
            });
    }]);
