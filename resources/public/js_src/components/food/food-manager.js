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
