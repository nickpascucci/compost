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
            .state("app", {
                url: "/",
                views: {
                    'content': {
                        templateUrl: "partials/app.html",
                        controller: "AppCtrl"
                    }
                }
            })
            .state("app.foods", {
                url: "foods",
                views: {
                    'foods': {
                        templateUrl: "partials/foods.html",
                        controller: "FoodListCtrl"
                    }
                }
            })
            .state("login", {
                url: "/login",
                templateUrl: "partials/login.html",
                controller: "AuthCtrl"
            });
    }]);

compostApp.controller("AppCtrl", function($scope, authService) {
    $scope.logOut = function () {
        authService.logOut();
    };
});
