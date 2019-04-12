
(function() {
    "use strict";
    try {
    if (/^https\:\/\/(my|sso)\.tealiumiq\.com\/tms/.test(document.URL)) {
    var users_mapping = {
                "education": {
                    profilePermissions: ["MANAGE_TEMPLATES", "MANAGE_SECURE_LABELS", "SAVE_PROFILE", "COPY", "PUBLISH_DEV", "PUBLISH_QA", "PUBLISH_PROD"],
                    accountPermissions: ["EXTENSIONS_JAVASCRIPT"]
                },
                "marketing-advanced": {
                    profilePermissions: ["PUBLISH_DEV", "PUBLISH_QA", "MANAGE_TEMPLATES", "COPY"],
                    accountPermissions: ["EXTENSIONS_JAVASCRIPT"]
                },
            };
            tealiumTools.send({
                processing: false
            });

            var addUser = function(email, data) {
                return new Promise(function(resolve, reject) {
                    var url = utui.service.restapis.USERS_ALL_ACCOUNT.replace("$$account$$", data.account);
                    var requestObject = {
                        email: email,
                        account: data.account,
                        permissions: users_mapping[data.user].accountPermissions,
                        profiles: {}
                    };

                    if (data.profiles.length === 1 && data.profiles[0] === "*") {
                        requestObject.profiles["*"] = {};
                        requestObject.profiles["*"].permissions = users_mapping[data.user].profilePermissions;
                        requestObject.profiles["*"].profile = "*";
                    } else {
                        for (var profile in data.profiles) {
                            var pro = data.profiles[profile];
                            requestObject.profiles[pro] = {};
                            requestObject.profiles[pro].permissions = users_mapping[data.user].profilePermissions;
                            requestObject.profiles[pro].profile = pro;
                        }
                    }
                    //TODO: find out RESTAPI
                    utui.service.post(url, JSON.stringify(requestObject), utui.service.options.JSON, function() {
                        resolve();
                    }, function() {
                        reject();
                    });
                });
            };
            var processUsers = function(data) {
                tealiumTools.send({
                    processing: true
                });
                var promise = Promise.resolve();
                var users = data.emails;
                var loop = users.slice();
                tealiumTools.send({
                    processing: true
                });
                console.time("Promsie");


                for (var i = 0; i < loop.length; i++) {
                    promise = promise.then(function() {
                        var email = users.shift();
                        console.log(email);
                        return addUser(email, data);
                    })
                        .
                    catch (function(reject) {
                        tealiumTools.sendError("There was an error processing your request.\n Please contact simon.browning@tealium.com for assitance.");
                    });
                }
                promise.then(function() {
                    console.timeEnd("Promsie");
                    tealiumTools.send({
                        processing: false
                    });
                    tealiumTools.sendMessage("User Added", "User has been successfully added");
                    console.info("All Done, toast is ready!");
                });

            };
            var init = function(data) {
                //console.dir(data);
                data.account = utui.login.account;
                processUsers(data);
            };

            window._tt_users = init.bind();
        } else {
            tealiumTools.send({
                processing: false
            });
            tealiumTools.sendError("Please open this Tool in an active Tealium iQ window");
        }
    } catch (err) {
        tealiumTools.sendError("There was an error processing your request.\n Please contact simon.browning@tealium.com for assitance.");
    }
}()); 
