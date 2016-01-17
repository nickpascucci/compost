/*! compost-client - v0.0.1-SNAPSHOT - 2016-01-17 */
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
            'clientid': '564625248083-vrmpbbdr39uelvr3iirme4vuc5kckeu7.apps.googleusercontent.com'
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
    } else {
      return undefined;
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

/**
 * Constants used among components in Compost.
 */

var FREEZING_EXTENSION = 60; // Freezing adds 60 days to food life

var util = {};

util.isMobile = function() {
  return window.matchMedia("only screen and (max-width: 760px)").matches;
};

util.momentFromIsoString = function(s) {
  return moment(s);
};

util.momentToIsoString = function(m) {
  return m.format("YYYY-MM-DD");
};

util.getDaysUntil = function(begin, end) {
  return end.diff(begin, "days");
};

util.copyTo = function(source, dest) {
  for (var property in source) {
    if (source.hasOwnProperty(property) &&
        property.indexOf('$') < 0) {
      dest[property] = source[property];
    }
  }
  return dest;
};

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

function EditorController($scope, $mdDialog, $stateParams, EditorService, FoodManager) {
  this.EditorService_ = EditorService;
  this.FoodManager_ = FoodManager;

  this.id = this.id ? this.id : $stateParams.id;

  this.EditorService_.beginAsyncEdit_();
  this.FoodManager_.get(this.id).then(
    function(food) {
      this.food = food;
      this.now = moment().startOf("day");
      this.original = util.copyTo(food, {});
      this.daysToExpiry = moment(food.expires).diff(this.now, 'days');
      return food;
    }.bind(this));
}

EditorController.prototype.cancel = function() {
  util.copyTo(this.original, this.food);
  this.EditorService_.cancelEdit(this.id);
};

EditorController.prototype.done = function() {
  this.EditorService_.finishEdit(this.id);
};

EditorController.prototype.onDaysToExpiryChanged = function () {
  this.food = this.FoodManager_.setDaysToExpiry(this.food, this.daysToExpiry);
};

EditorController.prototype.onFrozenStatusChanged = function () {
  this.food = this.FoodManager_.setFrozenStatus(this.food, this.food['frozen?']);
};

angular.module('editorModule', ['ngMaterial', 'compost.FoodManager'])
    .controller('EditorController', EditorController)
    .service('EditorService', EditorService);

function EditorService($rootScope, $q, $state, $mdDialog, authService, FoodManager) {
    this.q_ = $q;
    this.state_ = $state;
    this.mdDialog_ = $mdDialog;
    this.authService_ = authService;
    this.FoodManager_ = FoodManager;

    this.useDialog = !util.isMobile();
    this.deferred = undefined;
}

EditorService.prototype.create = function() {
    var now = moment().startOf("day");
    var food = {
        "name": "New Food",
        "created": util.momentToIsoString(now),
        "expires": util.momentToIsoString(now),
        "owner": this.authService_.getUserEmail(),
        "quantity": 1,
        "status": "active",
        "frozen?": false,
        "price": 0
    };
    return this.FoodManager_.add(food);
};

EditorService.prototype.edit = function(food) {
    if (this.useDialog) {
        return this.editWithDialog(food.id);
    } else {
        return this.editWithPage(food.id);
    }
};

EditorService.prototype.editWithDialog = function(id) {
    return this.mdDialog_.show({
        clickOutsideToClose: true,
        templateUrl: "partials/editor-dialog.html",
        controller: "EditorController",
        controllerAs: "editorCtrl",
        parent: angular.element(document.body),
        locals: {
            id: id
        },
        bindToController: true
    }).then(
      function() {
        return this.FoodManager_.save(id);
      }.bind(this));
};

EditorService.prototype.beginAsyncEdit_ = function() {
  if (!this.deferred) {
    this.deferred = this.q_.defer();
  }
  return this.deferred.promise;
};

EditorService.prototype.editWithPage = function(id) {
    console.log('Transferring to editor page.');
    this.state_.go('app.foods.edit', {id: id});
    return this.beginAsyncEdit_();
};

EditorService.prototype.cancelEdit = function(id) {
    console.log("Canceled editing");
    if (this.useDialog) {
        this.mdDialog_.cancel();
    } else {
        this.deferred.reject({id: id, reason: "Canceled"});
        this.state_.go('app.foods');
    }
};

EditorService.prototype.finishEdit = function(id) {
  var food = this.FoodManager_.save(id);
  if (this.useDialog) {
    this.mdDialog_.hide(food);
  } else {
    this.deferred.resolve(food);
    this.deferred = null;
    console.log("[es] Done editing:", food);
    this.state_.go('app.foods');
  }
};

var foodListModule = angular.module("foodListModule", [
  "ngMaterial",
  "editorModule",
  "authModule",
  "compostServices",
  'compost.FoodManager'
]);

var FREEZING_EXTENSION = 60; // Freezing adds 60 days to food life

/**
 * Controller for the food list view.
 */
foodListModule.controller(
  "FoodListCtrl", function ($scope, authService, EditorService, FoodManager) {
    authService.checkLogIn();
    this.scope_ = $scope;

    this.scope_.foods = [];
    FoodManager.getAll().then(function (foods) {
      this.scope_.foods = foods;
    }.bind(this));

    // ID of selected item.
    this.scope_.selectedItem = 0;

    this.getActiveFoods = function (foods) {
      var active = foods.filter(function(e, i, a) {
        return e.status === "active";
      });
      return active;
    };

    this.addFood = function() {
      EditorService.create()
        .then(function(food) {
          return EditorService.edit(food);
        }).then(function(food) {
          console.log("Created", food);
          FoodManager.getAll().then(function(foods) {
            console.log("Found", foods.length, "foods");
            this.scope_.foods = foods;
          }).bind(this);
        }.bind(this),
        function(reason) {
          FoodManager.delete(reason.id);
        });
    };

    // When an item is clicked, select it.
    this.itemClicked = function (food) {
      if (this.scope_.selectedItem != food.id) {
        this.scope_.selectedItem = food.id;
      } else {
        this.scope_.selectedItem = 0;
      }
    };

    // When the "Remove" button is clicked, remove the element.
    this.itemConsumed = function (food) {
      console.log("Consumed one unit of", food);
      food.quantity--;
      if (food.quantity === 0) {
        food.status = "eaten";
      }
      food.$save();
    };

    // TODO: Count a "consumed" removal separately from a "trashed" removal
    this.itemRemoved = function (food) {
      food.status = "trashed";
      food.$save();
    };

    this.edit = function (food) {
      EditorService.edit(food)
      .then(
        function(edited) {
          console.log("[fl] Done editing", edited);
        }.bind(this));
    };

    this.showNotes = function (food) {
      // TODO Handle showing notes
    };

    this.getIsFrozen = function (food) {
      var frozen = false || food["frozen?"];
      return frozen;
    };

    this.getAge = function (food) {
      return util.getDaysUntil(
        util.momentFromIsoString(food.created),
        moment().startOf("day"));
    };

    this.getDaysToExpiry = function (food) {
      return util.getDaysUntil(
        moment().startOf("day"),
        util.momentFromIsoString(food.expires));
    };

    this.getExpirationDate = function (food) {
      if (this.getDaysToExpiry(food) === 0) {
        return "today";
      } else if (this.getDaysToExpiry(food) == 1) {
        return "tomorrow";
      } else {
        return "on " + food.expires;
      }
    };

    this.getPrice = function (food) {
      var price = food.price || 0;
      return "" + price.toFixed(2);
    };
  }
);

function FoodManager($q, UserFoods) {
  this.q_ = $q;
  this.UserFoods_ = UserFoods;
  this.foods = {};
  this.reloadIfEmpty_();
}

/**
 * Get a food by ID.
 * Returns a promise.
 */
FoodManager.prototype.get = function(id) {
  if (this.foods[id]) {
    var d = this.q_.defer();
    d.resolve(this.foods[id]);
    return d.promise;
  }
  return this.UserFoods_.get(
    {id: id},
    function(food) {
      this.foods[food.id] = food;
      return food;
    }.bind(this)).$promise;
};

/**
 * Delete a food.
 */
FoodManager.prototype.delete = function(id) {
  return this.UserFoods_.delete(
    {id: id},
    function(food) {
      delete this.foods[id];
    }.bind(this)).$promise;
};

/**
 * Get all of the foods.
 */
FoodManager.prototype.getAll = function() {
  if (!this.isEmpty_()) {
    var d = this.q_.defer();
    var foodList = [];
    for (var i in this.foods) {
      foodList.push(this.foods[i]);
    }
    d.resolve(foodList);
    return d.promise;
  } else {
    return this.reload();
  }
};

FoodManager.prototype.reloadIfEmpty_ = function() {
  if (this.isEmpty_()) {
    this.reload();
  }
};

FoodManager.prototype.isEmpty_ = function() {
  return Object.getOwnPropertyNames(this.foods).length === 0;
};

/**
 * Load all of the foods from the backend.
 */
FoodManager.prototype.reload = function() {
  console.log("Loading all foods");
  return this.UserFoods_.query(
    function(result) {
      for (var i in result) {
        var food = result[i];
        this.foods[food.id] = food;
      }
    }.bind(this)).$promise;
};

/**
 * Save a food by ID.
 */
FoodManager.prototype.save = function(id) {
  if (this.foods[id]) {
    if (this.foods[id].$save) {
      return this.foods[id].$save();
    } else {
      return this.UserFoods_.save({}, this.foods[id]).$promise;
    }
  } else {
    throw "No food matching ID " + id;
  }
};

/**
 * Add a new food to the list of managed foods.
 */
FoodManager.prototype.add = function(food) {
  return this.UserFoods_.save({}, food).$promise
         .then(function(saved) {
           this.foods[saved.id] = saved;
           return saved;
         }.bind(this));
};

/**
 * Set the days until a food expires.
 */
FoodManager.prototype.setDaysToExpiry = function (food, days) {
  food.expires = util.momentToIsoString(
    moment().startOf('day').add('days', days));
  return food;
};

/**
 * Set the frozen status of a food.
 */
FoodManager.prototype.setFrozenStatus = function (food, isFrozen) {
  food['frozen?'] = isFrozen;
  var now = moment().startOf('day');
  if (food['frozen?']) {
    food['thaw-ttl-days'] = moment(food.expires).diff(now, 'days');
    food.expires = util.momentToIsoString(
      now.clone().add('days', FREEZING_EXTENSION));
    console.log('Food frozen', food);
  } else {
    food.expires = util.momentToIsoString(
      now.clone().add('days', food['thaw-ttl-days']));
    console.log('Food thawed', food);
  }
  return food;
};

angular.module('compost.FoodManager', ['compostServices'])
.service('FoodManager', FoodManager);

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
                        controller: "FoodListCtrl",
                        controllerAs: "foodCtrl"
                    }
                }
            })
            .state("app.foods.edit", {
                url: "/{id}/edit",
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
