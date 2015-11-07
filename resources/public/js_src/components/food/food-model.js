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
