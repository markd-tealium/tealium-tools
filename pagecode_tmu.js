
(function() {
    "use strict";
    try {
        if (/^https\:\/\/tmu\-my\.tealiumiq\.com\/tms/.test(document.URL)) {
            var account, profiles, numProfiles, profileData = [],
                catchError = [],
                content = ['"PROFILE/LIBRARY","FIRST NAME","LAST NAME","EMAIL","LAST LOGIN",MANAGE ACCOUNT","CREATE PROFILES","MANAGE AUDIT","MANAGE JAVASCRIPT","USERS","TEMPLATES","SECURE LABELS","SAVE PROFILE","DEV / CUSTOM","QA","PROD"'],
                account = utui.login.account;
            tealiumTools.send({
                account: account,
                processing: false
            });

            var download = function(output) {
                var link, $selector, csvUrl, csvString, csvData;

                tealiumTools.send({
                    account: account,
                    processing: false
                });

                csvString = output;
                csvData = new Blob([csvString], {
                    type: 'text/csv'
                });
                csvUrl = URL.createObjectURL(csvData);

                $selector = $("body");
                link = document.createElement('a');
                link.setAttribute("id", "profileExport_csv");
                link.setAttribute("href", csvUrl);
                link.setAttribute("download", (account + " user audit - " + new Date().toJSON().slice(0, 10)) + ".csv");
                $selector.append(link);
                $("#profileExport_csv")[0].click();
                $("#profileExport_csv").remove();

            };

            var htmlDecode = function(input) {
                var decode = document.createElement("textarea");
                decode.innerHTML = input;
                return decode.value.replace(/^-/, "").replace(/\r?\n/g, " ").replace(/,/g, " + ");

            };

            var getPermissions = function(permissions) {
                return [
                permissions.includes("MANAGE_ACCOUNT") ? '"TRUE"' : '""',
                permissions.includes("CREATE_PROFILE") ? '"TRUE"' : '""',
                permissions.includes("MANAGE_AUDIT") ? '"TRUE"' : '""',
                permissions.includes("EXTENSIONS_JAVASCRIPT") ? '"TRUE"' : '""',
                permissions.includes("MANAGE_USERS") ? '"TRUE"' : '""',
                permissions.includes("MANAGE_TEMPLATES") ? '"TRUE"' : '""',
                permissions.includes("MANAGE_SECURE_LABELS") ? '"TRUE"' : '""',
                permissions.includes("SAVE_PROFILE") ? '"TRUE"' : '""',
                permissions.includes("PUBLISH_DEV") ? '"TRUE"' : '""',
                permissions.includes("PUBLISH_QA") ? '"TRUE"' : '""',
                permissions.includes("PUBLISH_PROD") ? '"TRUE"' : '""', ].join(",");
            };
            var processUsers = function(users, profile) {
                var result = [],
                    data, date;
                for (var user in users) {
                    data = users[user][0];
                    date = new Date(data.last_login_date).toLocaleString();
                    result.push(['"' + profile + '"', ('"' + (data.first_name || "N/A") + '"'), ('"' + (data.last_name || "N/A") + '"'), '"' + data.email + '"', ('"' + (date !== "1/1/1970, 1:00:00 AM" ? date : "NEVER LOGGED IN") + '"'),
                    getPermissions(users[user][1])].join(","));
                }
                return result.join("\r\n");
            };
            var getUsers = function(users, profile) {
                var result = {}, permissions;
                users[utui.login.email] = utui.users.getUser(utui.login.email);
                for (var user in users) {
                    if (user.indexOf("@tealium.com") < 0) {
                        var userData = users[user];
                        permissions = utui.users.getUserPermissions(userData, profile);
                        result[user] = [users[user], permissions];
                    }
                }
                if (!$.isEmptyObject(result)) {
                    content.push(processUsers(result, profile));
                }
            };

            var getProfile = function(profile) {
                return new Promise(function(resolve, reject) {
                    utui.service.get(utui.service.restapis.USERS_PROFILE, {
                        account: account,
                        profile: profile,
                        cb: Math.random()
                    }, {
                        async: true
                    },

                    function(data) {
                        //console.log(profile, data);
                        getUsers(data, profile);
                        resolve();
                    },

                    function(err, obj) {
                        catchError.push([profile, obj.statusText]);
                        reject(err, obj);
                    });
                }).
                catch (function(reason) {

                });

            };

            var getProfiles = function(profiles) {
                return Promise.all(profiles.map(getProfile));
            };

            var processProfiles = function(data) {
                tealiumTools.send({
                    processing: true
                });
                var promise = Promise.resolve();
                var loops, currentSet, profiles = data.profiles,
                    error = catchError;

                console.time("Promsie");

                loops = Math.ceil(profiles.length / 5);
                for (var i = 0; i < loops; i++) {
                    promise = promise.then(function() {
                        currentSet = profiles.splice(0, 5);
                        var batch = loops - (profiles.length / currentSet.length);
                        $("#loading_message").text("Processing profile batch " + Math.floor(batch) + " / " + loops);
                        return getProfiles(currentSet);
                    })
                    // .catch(function(reject) {
                    //     utui.util.loadingModalStop();
                    //     console.error("something blow up!",reject);
                    // })
                }
                promise.then(function() {
                    var errorMessage = "";
                    console.timeEnd("Promsie");
                    utui.util.loadingModalStop();
                    if (error.length > 0) {
                        error.forEach(function(e) {
                            errorMessage += "<li>" + e[0] + " - " + e[1] + "</li>"
                        });
                        utui.util.showMsgDialog("<p>There was an error retriving data for the following profiles:" + errorMessage, "User Audit", null)
                    }

                    download(content.join("\r\n"));
                    console.info("All Done, toast is ready!");
                    //Retun back to orignial state.
                    utui.service.get(utui.service.restapis.GET_PROFILE, {
                        account: utui.login.account,
                        profile: utui.login.profile
                    }, {
                        async: false
                    }, null);
                });

            }
            var init = function() {
                utui.util.loadingModalStart("Getting Profile List");
                utui.service.get(utui.service.restapis.GET_PROFILES, {
                    account: account,
                    profile: "main"
                }, {
                    async: true
                }, processProfiles);
            }

            window._tt_tagAudit = init.bind();
        } else {
            tealiumTools.sendError("Please open this Tool in an active Tealium iQ window");
        }
    } catch (err) {
        utui.util.loadingModalStop();
        tealiumTools.sendError("There was an error processing your request.\n Please contact simon@tealium.com for assitance.");
    }
}()); 