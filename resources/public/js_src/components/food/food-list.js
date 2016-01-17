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
