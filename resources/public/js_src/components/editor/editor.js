function EditorService($rootScope, $q, $state, $mdDialog, authService) {
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
                controller: "EditorController",
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
}
