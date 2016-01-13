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

    $scope.foods = [];
    FoodManager.getAll().then(function (foods) {
      $scope.foods = foods;
    });

    $scope.getActiveFoods = function (foods) {
      var active = foods.filter(function(e, i, a) {
        return e.status === "active";
      });
      return active;
    };

    // ID of selected item.
    $scope.selectedItem = 0;

    $scope.addFood = function() {
      EditorService.create()
        .then(function(food) {
          return EditorService.edit(food);
        }).then(function(food) {
          console.log("Created", food);
          FoodManager.getAll().then(function(foods) {
            console.log("Found", foods.length, "foods");
            $scope.foods = foods;
          });
        }.bind(this),
        function(reason) {
          FoodManager.delete(reason.id);
        });
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
      EditorService.edit(food)
      .then(
        function(edited) {
          console.log("[fl] Done editing", edited);
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
      return util.getDaysUntil(
        util.momentFromIsoString(food.created),
        moment().startOf("day"));
    };

    $scope.getDaysToExpiry = function (food) {
      return util.getDaysUntil(
        moment().startOf("day"),
        util.momentFromIsoString(food.expires));
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
