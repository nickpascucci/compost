var compostServices = angular.module("compostServices", ["ngResource"]);

compostServices.factory('UserFoods', function($resource) {
    return $resource('api/v1/people/me/foods/:id', {id: '@id'});
});

compostServices.factory("authService", function($location, $rootScope) {    
    var service = {
        user: JSON.parse(sessionStorage.getItem('user')),
        auth_info: JSON.parse(sessionStorage.getItem('auth_info')),
        logIn: function () {
            service.user = JSON.parse(sessionStorage.getItem('user'));
            service.auth_info = JSON.parse(sessionStorage.getItem('auth_info'));
            if (service.user && service.auth_info) {
                console.log("User is already logged in.");
                $location.path("/foods");
                return;
            }
            if (gapi.auth != undefined) {
                var additionalParams = {
                    "callback": service.onSuccessfulLogin,
                    "cookiepolicy": "single_host_origin",
                    "scope": "profile",
                    "clientid": "564625248083-vrmpbbdr39uelvr3iirme4vuc5kckeu7.apps.googleusercontent.com",
                };
                console.log("Attempting login");
                gapi.auth.signIn(additionalParams);
            }
        },
        logOut: function () {
            gapi.auth.signOut();
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('auth_info');
            service.user = null;
            service.auth_info = null;
            console.log("Logged out");
            $location.path("/login");
        },
        getUser: function() {
            return service.user;
        },
        getUserEmail: function() {
            return service.user.emails.filter(function (x) {
                return x.type === "account";
            })[0].value;
        },
        isLoggedIn: function() {
            if (service.getUser() != undefined) {
                return true;
            }
            return false;
        },
        checkLogIn: function() {
            if (!service.getUser()) {
                console.log("User is not logged in, redirecting to login page.");
                $location.path("/login");
            }
        },
        onEmailResponse: function (result) {
            for (var i=0; i < result.emails.length; i++) {
                if (result.emails[i].type === 'account') {
                    primaryEmail = result.emails[i].value;
                }
            }
            service.user = result;
            console.log("Logged in as ", service.user.displayName);
            sessionStorage.setItem('user', JSON.stringify(result));
            // TODO Redirect to the path where we came from
            $location.path("/foods");
            $rootScope.$apply();
        },
        onApiClientLoaded: function () {
            gapi.client.plus.people.get({userId: 'me'}).execute(service.onEmailResponse);
        },
        onSuccessfulLogin: function (result) {
            console.log('Auth Result:', result);
            if (result['status']['signed_in']) {
                gapi.client.load('plus', 'v1', service.onApiClientLoaded);
                service.auth_info = result;
                sessionStorage.setItem('auth_info', JSON.stringify(result));
            } else {
                // Update the app to reflect a signed out user
                // Possible error values:
                //   "user_signed_out" - User is signned-out
                //   "access_denied" - User denied access to your app
                //   "immediate_failed" - Could not automatically log in the user
                console.log('Sign-in state: ' + result['error']);
                service.logOut();
            }
        },
        getToken: function() {
            if (service.auth_info) {
                return service.auth_info.access_token;
            }
        }
    };

    return service;
});

/**
   This interceptor adds OAuth credentials to any outbound request if it has them.
*/
compostServices.run(['authService', '$injector', function(authService, $injector) {
    $injector.get("$http").defaults.transformRequest.push(function(data, headersGetter, status) {
        var token = authService.getToken();
        if (token != undefined) {
            headersGetter()['Authorization'] = "OAuth " + token;
            console.log("Making authenticated request:", data, headersGetter(), status);
        } else {
            console.log("Making unauthenticated request:", data, headersGetter(), status);
        }
        return data;
    });

    $injector.get("$http").defaults.transformResponse.push(function(data, headersGetter, status) {
        if (headersGetter()['status'] === 401) {
            console.log("Server replied with 401, logging out.");
            authService.logOut();
        }
        return data;
    });
}]);
