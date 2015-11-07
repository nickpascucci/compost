/*! compost-client - v0.0.1-SNAPSHOT - 2015-11-07 */
var compostServices = angular.module('compostServices', ['ngResource']);

compostServices.factory('UserFoods', function($resource) {
    return $resource('api/v1/people/me/foods/:id', {id: '@id'});
});

function AuthService($injector, $rootScope) {
    this.injector_ = $injector;
    this.rootScope_ = $rootScope;
    this.user = JSON.parse(sessionStorage.getItem('user'));
    this.auth_info = JSON.parse(sessionStorage.getItem('auth_info'));
}

AuthService.prototype.logIn = function () {
    this.loadStoredCreds();
    if (this.user && this.auth_info) {
        console.log('User is already logged in.');
        this.injector_.get('$state').go('app.foods');
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
    this.injector_.get('$state').go('login');
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
        this.injector_.get('$state').go('login');
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
    this.injector_.get('$state').go('app.foods');
    this.rootScope_.$apply();
};

AuthService.prototype.onApiClientLoaded = function () {
    console.log('API loaded');
    gapi.client.plus.people.get({userId: 'me'})
        .execute(this.onEmailResponse.bind(this));
};

AuthService.prototype.onSuccessfulLogin = function (result) {
    console.log('Auth Result:', result);
    if (result.status.signed_in) {
        gapi.client.load('plus', 'v1', this.onApiClientLoaded.bind(this));
        this.auth_info = {'id_token': result.id_token};
        sessionStorage.setItem('auth_info', JSON.stringify(result));
    } else {
        // Update the app to reflect a signed out user
        // Possible error values:
        //   'user_signed_out' - User is signned-out
        //   'access_denied' - User denied access to your app
        //   'immediate_failed' - Could not automatically log in the user
        console.log('Sign-in state: ' + result.error);
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
                config.headers.Authorization = 'Bearer ' + token;
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

function isMobile() {
    return window.matchMedia("only screen and (max-width: 760px)").matches;
}

function momentFromIsoString(s) {
    return moment(s);
}

function getDaysUntil(begin, end) {
    return end.diff(begin, "days");
}

var authModule = angular.module("authModule", [
    "compostServices"
]);

authModule.controller("AuthCtrl", function($scope, authService) {
    $scope.signIn = function(authResult) {
        $scope.processAuth(authResult);
    };

    $scope.processAuth = function(authResult) {
        if (authResult.status.signed_in &&
            authResult.status.method !== "AUTO") {
            // Successfully authorized, create session
            authService.onSuccessfulLogin(authResult);
        } else if (authResult.error) {
            if (authResult.error != 'immediate_failed') {
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
        authService.logOut();
    };

    $scope.renderSignIn();
});

var editorModule = angular.module("editorModule", [
    "ngMaterial"
]);

var FREEZING_EXTENSION = 60; // Freezing adds 60 days to food life

function momentToIsoString(m) {
    return m.format("YYYY-MM-DD");
}

editorModule.controller("EditorCtrl", function(
    $scope, $mdDialog, $stateParams, editorService) {

    this.copyTo = function(source, dest) {
        for (var property in source) {
            if (source.hasOwnProperty(property) &&
                property.indexOf('$') < 0) {
                dest[property] = source[property];
            }
        }
        return dest;
    };

    this.food = this.food ? this.food : JSON.parse($stateParams.food);
    this.now = moment().startOf("day");
    this.original = this.copyTo(this.food, {});
    this.daysToExpiry = moment(this.food.expires).diff(this.now, 'days');

    this.cancel = function() {
        this.copyTo(this.original, this.food);
        editorService.cancelEdit();
    };

    this.done = function() {
        editorService.finishEdit(this.food);
    };

    this.onDaysToExpiryChanged = function () {
        this.food.expires = momentToIsoString(
            this.now.clone().add('days', this.daysToExpiry));
    };

    this.onFrozenStatusChanged = function () {
        if (this.food['frozen?']) {
            this.food['thaw-ttl-days'] = moment(this.food.expires).diff(this.now, "days");
            this.food.expires = momentToIsoString(
                this.now.clone().add("days", FREEZING_EXTENSION));
            console.log("Food frozen", this.food);
        } else {
            this.food.expires = momentToIsoString(
                this.now.clone().add("days", this.food["thaw-ttl-days"]));
            console.log("Food thawed", this.food);
        }
    };
});

editorModule.factory("editorService", function(
    $rootScope, $q, $state, $mdDialog, authService) {
    var service = {
        useDialog: !isMobile(),
        deferred: undefined,
        create: function() {
            var now = moment().startOf("day");
            var food = {
                "name": "New Food",
                "created": momentToIsoString(now),
                "expires": momentToIsoString(now),
                "owner": authService.getUserEmail(),
                "quantity": 1,
                "status": "active",
                "frozen?": false,
            };
            return service.edit(food);
        },
        edit: function(food) {
            if (service.useDialog) {
                return service.editWithDialog(food);
            } else {
                return service.editWithPage(food);
            }
        },
        editWithDialog: function(food) {
            return $mdDialog.show({
                clickOutsideToClose: true,
                templateUrl: "partials/editor-dialog.html",
                controller: "EditorCtrl",
                controllerAs: "editorCtrl",
                parent: angular.element(document.body),
                locals: {
                    food: food
                },
                bindToController: true
            });
        },
        editWithPage: function(food) {
            service.deferred = $q.defer();
            console.log('Transferring to editor page.');
            $state.go('app.foods.edit', {foodId: food.id,
                                         food: JSON.stringify(food)});
            return service.deferred.promise;
        },
        cancelEdit: function() {
            console.log("Canceled editing");
            if (service.useDialog) {
                $mdDialog.cancel();
            } else {
                service.deferred.reject("Canceled");
                $state.go('app.foods');
            }
        },
        finishEdit: function(food) {
            if (service.useDialog) {
                $mdDialog.hide(food);
            } else {
                service.deferred.resolve(food);
                console.log("Done editing:", food);
                $state.go('app.foods');
            }
        }
    };

    return service;
});

var foodListModule = angular.module("foodListModule", [
    "ngMaterial",
    "editorModule",
    "authModule",
    "compostServices"
]);

var FREEZING_EXTENSION = 60; // Freezing adds 60 days to food life

/**
 * Controller for the food list view.
 */
foodListModule.controller(
    "FoodListCtrl", function ($scope, authService, editorService, UserFoods) {
        authService.checkLogIn();
        this.scope_ = $scope;

        $scope.foods = UserFoods.query();

        $scope.getActiveFoods = function (foods) {
            return foods.filter(function(e, i, a) {
                return e.status === "active";
            });
        };

        // ID of selected item.
        $scope.selectedItem = 0;

        $scope.addFood = function() {
            editorService.create()
                .then(function(food) {
                    console.log("Created", food);
                    UserFoods.save(food, function (saved) {
                        this.foods.push(saved);
                    }.bind(this));
                }.bind(this));
        };

        // When an item is clicked, select it.
        $scope.itemClicked = function (food) {
            if ($scope.selectedItem != food.id) {
                $scope.selectedItem = food.id;
            } else {
                $scope.selectedItem = 0;
            }
        };

        // When the "Remove" button is clicked, remove the element.
        $scope.itemConsumed = function (food) {
            console.log("Consumed one unit of", food);
            food.quantity--;
            if (food.quantity === 0) {
                food.status = "eaten";
            }
            food.$save();
        };

        // TODO: Count a "consumed" removal separately from a "trashed" removal
        $scope.itemRemoved = function (food) {
            food.status = "trashed";
            food.$save();
        };

        $scope.edit = function (food) {
            editorService.edit(food)
                .then(function(edited) {
                    console.log("Done editing", edited);
                    edited.$save();
                }.bind(this));
        };

        $scope.showNotes = function (food) {
            // TODO Handle showing notes
        };

        $scope.getIsFrozen = function (food) {
            var frozen = false || food["frozen?"];
            return frozen;
        };

        $scope.getAge = function (food) {
            return getDaysUntil(momentFromIsoString(food.created), moment().startOf("day"));
        };

        $scope.getDaysToExpiry = function (food) {
            return getDaysUntil(moment().startOf("day"), momentFromIsoString(food.expires));
        };

        $scope.getExpirationDate = function (food) {
            if ($scope.getDaysToExpiry(food) === 0) {
                return "today";
            } else if ($scope.getDaysToExpiry(food) == 1) {
                return "tomorrow";
            } else {
                return "on " + food.expires;
            }
        };
    }
);

function FoodModel(UserFoods) {
    this.UserFoods_ = UserFoods_;
    this.foods = {};
}

FoodModel.prototype.load = function(id) {
    if (id) {
        UserFoods.get({id: id}, function(food) {
            this.foods[food.id] = food;
        });
    } else {
        UserFoods.query(function(result) {
            for (var i in result) {
                var food = result[i];
                this.foods[food.id] = food;
            }
        }.bind(this));
    }
};

FoodModel.prototype.get = function(id) {
    return this.foods[id];
};

FoodModel.prototype.save = function() {
    // TODO
};

angular.module('compost.FoodModel', ['compostServices'])
    .service('FoodModel', FoodModel);

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
                        controller: "EditorCtrl",
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
