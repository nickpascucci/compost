var authModule = angular.module("authModule", [
    "compostServices"
]);

compostControllers.controller("AuthCtrl", function($scope, authService) {
    $scope.immediateFailed = true;
    $scope.signIn = function(authResult) {
        $scope.processAuth(authResult);
    };

    $scope.processAuth = function(authResult) {
        $scope.immediateFailed = true;
        if (authResult.status.signed_in &&
            authResult.status.method !== "AUTO") {
            $scope.immediateFailed = false;
            // Successfully authorized, create session
            authService.onSuccessfulLogin(authResult);
        } else if (authResult.error) {
            if (authResult.error == 'immediate_failed') {
                $scope.immediateFailed = true;
            } else {
                console.log('Authentication Error:', authResult.error);
            }
        }
    };

    $scope.renderSignIn = function() {
        gapi.signin.render('gsignin', {
            'callback': $scope.signIn,
            'clientid': '564625248083-vrmpbbdr39uelvr3iirme4vuc5kckeu7.apps.googleusercontent.com',
            'cookiepolicy': 'single_host_origin',
            'scope': 'profile',
            'theme': 'dark',
            'width': 'wide',
        });
    };

    $scope.logOut = function () {
        $scope.immediateFailed = true;
        authService.logOut();
    };

    $scope.renderSignIn();
});
