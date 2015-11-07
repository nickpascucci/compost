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
                    'content': {
                        templateUrl: "partials/foods.html",
                        controller: "FoodListCtrl"
                    }
                }
            })
            .state("app.foods.edit", {
                url: "/{foodId}/edit?food",
                views: {
                    'content@app': {
                        templateUrl: "partials/editor-page.html",
                        controller: "EditorController",
                        controllerAs: "editorCtrl"
                    }
                }
            })
            .state("login", {
                url: "/login",
                views: {
                    'content': {
                        templateUrl: "partials/login.html",
                        controller: "AuthCtrl"
                    }
                }
            });
    }]);

compostApp.controller("AppCtrl", function($scope, authService) {
    $scope.logOut = function () {
        authService.logOut();
    };
});
