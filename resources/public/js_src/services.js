var compostServices = angular.module('compostServices', ['ngResource']);

compostServices.factory('UserFoods', function($resource) {
    return $resource('api/v1/people/me/foods/:id', {id: '@id'});
});

function AuthService($location, $rootScope) {
    this.location_ = $location;
    this.rootScope_ = $rootScope;
    this.user = JSON.parse(sessionStorage.getItem('user'));
    this.auth_info = JSON.parse(sessionStorage.getItem('auth_info'));
}

AuthService.prototype.logIn = function () {
    this.loadStoredCreds();
    if (this.user && this.auth_info) {
        console.log('User is already logged in.');
        this.location_.path('/foods');
        return;
    }
    if (gapi.auth !== undefined) {
        var additionalParams = {
            'callback': this.onSuccessfulLogin,
            'cookiepolicy': 'single_host_origin',
            'scope': 'profile',
            'clientid': '564625248083-vrmpbbdr39uelvr3iirme4vuc5kckeu7.apps.googleusercontent.com',
        };
        console.log('Attempting login');
        gapi.auth.signIn(additionalParams);
    }
};

AuthService.prototype.logOut = function () {
    if (gapi.auth !== undefined) {
        gapi.auth.signOut();
    } else {
        console.error('gapi.auth is not defined');
    }
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('auth_info');
    this.user = null;
    this.auth_info = null;
    console.log('Logged out');
    this.location_.path('/login');
};

AuthService.prototype.getUser = function() {
    return this.user;
};

AuthService.prototype.getUserEmail = function() {
    return this.user.emails.filter(function (x) {
        return x.type === 'account';
    })[0].value;
};

AuthService.prototype.isLoggedIn = function() {
    if (this.getUser() !== undefined) {
        return true;
    }
    return false;
};

AuthService.prototype.checkLogIn = function() {
    this.loadStoredCreds();
    if (!this.getUser() || !this.getToken()) {
        console.log('User is not logged in, redirecting to login page.');
        this.location_.path('/login');
    }
};

AuthService.prototype.loadStoredCreds = function() {
    if (!this.getUser() || !this.getToken()) {
        this.user = JSON.parse(sessionStorage.getItem('user'));
        this.auth_info = JSON.parse(sessionStorage.getItem('auth_info'));
    }
};

AuthService.prototype.onEmailResponse = function (result) {
    this.user = result;
    console.log('Logged in as ', this.user.displayName);
    sessionStorage.setItem('user', JSON.stringify(result));
    // TODO Redirect to the path where we came from
    this.location_.path('/foods');
    this.rootScope_.$apply();
};

AuthService.prototype.onApiClientLoaded = function () {
    console.log('API loaded');
    gapi.client.plus.people.get({userId: 'me'})
        .execute(this.onEmailResponse.bind(this));
};

AuthService.prototype.onSuccessfulLogin = function (result) {
    console.log('Auth Result:', result);
    if (result['status']['signed_in']) {
        gapi.client.load('plus', 'v1', this.onApiClientLoaded.bind(this));
        this.auth_info = {'id_token': result['id_token']};
        sessionStorage.setItem('auth_info', JSON.stringify(result));
    } else {
        // Update the app to reflect a signed out user
        // Possible error values:
        //   'user_signed_out' - User is signned-out
        //   'access_denied' - User denied access to your app
        //   'immediate_failed' - Could not automatically log in the user
        console.log('Sign-in state: ' + result['error']);
        this.logOut();
    }
};

AuthService.prototype.getToken = function() {
    if (this.auth_info) {
        return this.auth_info.id_token;
    }
};

compostServices.factory('authInterceptor', function($q, authService) {
    return {
        request: function(config) {
            var token = authService.getToken();
            if (token !== undefined) {
                config.headers['Authorization'] = 'Bearer ' + token;
                console.log('Making authenticated request:', config);
            } else {
                console.log('Making unauthenticated request:', config);
            }

            return config;
        },
        requestError: function(rejection) {
            return $q.reject(rejection);
        },
        response: function(response) {
            return response;
        },
        responseError: function(response) {
            if (response.status === 401) {
                console.log('Server replied with 401, logging out.');
                authService.logOut();
            }
            return $q.reject(response);
        }
    };
});

compostServices.service('authService', AuthService);

compostServices.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');
}]);
