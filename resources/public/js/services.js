var compostServices = angular.module("compostServices", ["ngResource", "firebase"]);

// TODO Implement remaining API surface and migrate from Firebase.
// TODO Replace Firebase auth with Google OAuth.
compostServices.factory('UserFoods', function($resource) {
    return $resource('api/v1/people/me/foods/:id', {id: '@id'});
});

compostServices.factory("authService", function($location, $firebaseSimpleLogin) {
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
