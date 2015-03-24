var compostServices = angular.module("compostServices", ["ngResource"]);

// TODO Implement remaining API surface and migrate from Firebase.
// TODO Replace Firebase auth with Google OAuth.
compostServices.factory('UserFoods', function($resource) {
    return $resource('api/v1/people/me/foods/:id', {id: '@id'});
});

compostServices.factory("authService", function($location, $rootScope) {    
    var service = {
        user: JSON.parse(sessionStorage.getItem('user')),
        logIn: function () {
            service.user = JSON.parse(sessionStorage.getItem('user'));
            if (service.user) {
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
            service.user = null;
            console.log("Logged out");
            $location.path("/login");
        },
        getUser: function() {
            return service.user;
        },
        checkLogIn: function() {
            if (!service.getUser()) {
                console.log("User is not logged in, redirecting to login page.");
                $location.path("/login");
            }
        },
        onEmailResponse: function (response) {
            for (var i=0; i < response.emails.length; i++) {
                if (response.emails[i].type === 'account') {
                    primaryEmail = response.emails[i].value;
                }
            }
            service.user = response;
            console.log("Logged in as ", service.user.displayName);
            sessionStorage.setItem('user', JSON.stringify(response));
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
            } else {
                // Update the app to reflect a signed out user
                // Possible error values:
                //   "user_signed_out" - User is signned-out
                //   "access_denied" - User denied access to your app
                //   "immediate_failed" - Could not automatically log in the user
                $location.path("/login");
                console.log('Sign-in state: ' + result['error']);
            }
        }
    };

    return service;
});
