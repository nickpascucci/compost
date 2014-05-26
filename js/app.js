var compostApp = angular.module('compostApp', [
    'ngRoute',
    'compostControllers'
]);

compostApp.config([
    '$routeProvider',
    function($routeProvider) {
        $routeProvider
            .when('/foods', {
                templateUrl: 'partials/food-list.html',
                controller: 'FoodListCtrl'
            }).when('/add', {
                templateUrl: 'partials/add-form.html',
                controller: 'AddFoodCtrl'
            }).otherwise({
                redirectTo: '/foods'
            });
    }])
    .run(function($rootScope) {
        // When the route changes, load data from persistent storage.
        $rootScope.$on("$routeChangeStart", function (event, next, current) {
            if (!sessionStorage["stateLoaded"]) {
                // Broadcast load event and mark this session as loaded.
                $rootScope.$broadcast('loadState');
                sessionStorage["stateLoaded"] = true;
            }
        });

        // When the window is unloaded, persist state.
        // The state should be persisted on each change, but it doesn't hurt to do it here too.
        window.onbeforeunload = function (event) {
            $rootScope.$broadcast('stateChanged');
        };
    });
